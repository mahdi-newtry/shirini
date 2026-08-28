import { BotSettings, Product, Order, DiscountCode, CustomerUser } from './types';
import { generateUniqueOrderNumber } from './utils/orderNumber';
import { t as botText } from './data/botMessages';
import { findBotCustomer, upsertBotCustomer, isRealName } from './utils/customers';

interface SimpleMap<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): unknown;
  delete(key: string): boolean;
  has?(key: string): boolean;
}

interface TelegramContext {
  token: string;
  chatId: string;
  products: Product[];
  orders: Order[];
  discounts: DiscountCode[];
  customers: CustomerUser[];
  botSettings: BotSettings;
  userCarts: SimpleMap<any[]>;
  userStates: SimpleMap<any>;
  msg?: any;
}

const getTelegramDisplayName = (message?: any): string => {
  const from = message?.from;
  const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim();
  return fullName || from?.username || '';
};

async function tgSend(ctx: TelegramContext, text: string, buttons?: any[][], photo?: string) {
  const endpoint = photo ? 'sendPhoto' : 'sendMessage';
  const payload: any = photo
    ? { chat_id: ctx.chatId, parse_mode: 'HTML', photo, caption: text }
    : { chat_id: ctx.chatId, parse_mode: 'HTML', text };
  if (buttons) payload.reply_markup = { inline_keyboard: buttons };

  const send = async (): Promise<{ ok: boolean; status: number; body: any }> => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${ctx.token}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* non-JSON */ }
      return { ok: Boolean(body?.ok), status: res.status, body };
    } catch (err) {
      return { ok: false, status: 0, body: { error: String(err) } };
    }
  };

  let result = await send();
  // Retry transient failures (network blip, 429 flood-wait, 5xx) so a step is never lost.
  for (let attempt = 1; attempt <= 3 && !result.ok; attempt++) {
    const wait = result.body?.parameters?.retry_after
      ? Number(result.body.parameters.retry_after) * 1000
      : Math.min(400 * attempt, 1200);
    console.error(`[checkout] ${endpoint} attempt ${attempt} failed (status ${result.status}):`, JSON.stringify(result.body)?.slice(0, 300));
    await new Promise(r => setTimeout(r, wait));
    result = await send();
  }

  if (!result.ok) {
    // Last resort: plain text without HTML/buttons so the customer always gets something.
    console.error(`[checkout] ${endpoint} giving up after retries:`, JSON.stringify(result.body)?.slice(0, 500));
    try {
      const fallback = await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: ctx.chatId, text: text.replace(/<[^>]+>/g, '') })
      });
      const fb = await fallback.json().catch(() => null);
      if (!fb?.ok) console.error('[checkout] fallback plain send also failed:', JSON.stringify(fb));
    } catch (err) {
      console.error('[checkout] fallback plain send threw:', err);
    }
  }
  return result;
}

const CHECKOUT_CANCEL_ROW = [{ text: '❌ انصراف از خرید', callback_data: 'cancel_order' }];

const DELIVERY_BUTTONS: any[][] = [
  [{ text: '🏪 دریافت حضوری (رایگان)', callback_data: 'delivery_pickup' }],
  [{ text: '🛵 دریافت با پیک', callback_data: 'delivery_delivery' }],
  [CHECKOUT_CANCEL_ROW]
];

/** Step 1 (always first): choose how the order is received, via inline buttons. */
export async function startCheckout(ctx: TelegramContext) {
  const cart = ctx.userCarts.get(ctx.chatId) || [];
  if (cart.length === 0) {
    await tgSend(ctx, '🛒 سبد خرید خالی است!', [[{ text: '🍰 منو', callback_data: 'menu_categories' }]]);
    return;
  }
  const known = findBotCustomer(ctx.customers, ctx.chatId);
  const knownName = known?.name && isRealName(known.name) ? known.name : '';
  const draft: any = {
    customerName: knownName || '',
    customerPhone: known?.phone || '',
    addresses: known?.addresses?.length ? known.addresses : (known?.address ? [known.address] : []),
    customerAddress: known?.address || '',
  };
  ctx.userStates.set(ctx.chatId, { mode: 'checkout_delivery_method', draftOrder: draft });

  const greeting = knownName
    ? `👤 <b>${knownName}</b> عزیز سلام!\n\n`
    : '';
  await tgSend(
    ctx,
    `${greeting}🚚 <b>مرحله ۱ از ۳:</b> لطفاً <b>نحوهٔ دریافت سفارش</b> را انتخاب کنید:`,
    DELIVERY_BUTTONS
  );
}

export async function handleCheckoutState(ctx: TelegramContext, text: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state || !state.draftOrder) return false;
  const draft = state.draftOrder;

  if (state.mode === 'checkout_name') {
    draft.customerName = text.trim();
    // Known phone? skip straight ahead.
    if (draft.customerPhone) {
      state.mode = draft.deliveryMethod === 'delivery' ? 'checkout_address_choice' : 'checkout_payment_method';
      ctx.userStates.set(ctx.chatId, state);
      await tgSend(ctx, `👤 نام <b>${text.trim()}</b> ثبت شد.`);
      if (draft.deliveryMethod === 'delivery') {
        await sendDeliveryChoice(ctx);
      } else {
        await sendPaymentChoice(ctx);
      }
      return true;
    }
    state.mode = 'checkout_phone';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `👤 نام <b>${text.trim()}</b> ثبت شد.\n\n📞 لطفاً <b>شماره تلفن</b> خود را ارسال کنید:\n<i>(مثال: 09121234567)</i>`, [
      [CHECKOUT_CANCEL_ROW]
    ]);
    return true;
  }

  if (state.mode === 'checkout_phone') {
    draft.customerPhone = text.trim();
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `📞 شماره تلفن ثبت شد.`);
    // Delivery needs address + recipient next; pickup goes straight to payment.
    if (draft.deliveryMethod === 'delivery') {
      state.mode = 'checkout_address_choice';
      ctx.userStates.set(ctx.chatId, state);
      await sendDeliveryChoice(ctx);
    } else {
      state.mode = 'checkout_payment_method';
      ctx.userStates.set(ctx.chatId, state);
      await sendPaymentChoice(ctx);
    }
    return true;
  }

  if (state.mode === 'checkout_new_address') {
    draft.customerAddress = text.trim();
    const book: string[] = Array.isArray(draft.addresses) ? [...draft.addresses] : [];
    if (!book.includes(text.trim())) book.push(text.trim());
    draft.addresses = book;
    state.mode = 'checkout_recipient_name';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🏠 آدرس ثبت شد.\n\n📛 لطفاً <b>نام گیرندهٔ مرسوله</b> را ارسال کنید (نام و نام خانوادگی تحویل‌گیرنده):`, [
      CHECKOUT_CANCEL_ROW
    ]);
    return true;
  }

  if (state.mode === 'checkout_recipient_name') {
    draft.deliveryRecipientName = text.trim();
    state.mode = 'checkout_payment_method';
    ctx.userStates.set(ctx.chatId, state);
    await sendPaymentChoice(ctx);
    return true;
  }

  if (state.mode === 'checkout_discount_code') {
    const code = text.trim().toUpperCase();
    const discount = ctx.discounts.find(d => d.code === code && d.isActive);
    if (!discount) {
      await tgSend(ctx, `❌ کد تخفیف <code>${code}</code> معتبر نیست.\n\nلطفاً دوباره تلاش کنید یا روی "بدون تخفیف" کلیک کنید:`, [
        [{ text: '❌ بدون تخفیف', callback_data: 'no_discount' }],
        [CHECKOUT_CANCEL_ROW]
      ]);
      return true;
    }
    const applicable = discount.applicableProductIds || [];
    if (applicable.length > 0) {
      const cart = ctx.userCarts.get(ctx.chatId) || [];
      const hasEligible = cart.some(it => applicable.includes(it.productId));
      if (!hasEligible) {
        await tgSend(ctx, `❌ کد تخفیف <code>${code}</code> فقط برای <b>برخی محصولات خاص</b> قابل استفاده است و سبد شما شامل آن‌ها نیست.\n\nلطفاً کد دیگری وارد کنید:`, [
          [{ text: '❌ بدون تخفیف', callback_data: 'no_discount' }],
          [CHECKOUT_CANCEL_ROW]
        ]);
        return true;
      }
    }
    draft.couponCode = code;
    draft.discount = discount;
    state.mode = 'checkout_confirm';
    ctx.userStates.set(ctx.chatId, state);
    await sendInvoice(ctx);
    return true;
  }

  return false;
}

async function sendDeliveryChoice(ctx: TelegramContext) {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state) return;
  const known = findBotCustomer(ctx.customers, ctx.chatId);
  const addresses: string[] = (state.draftOrder.addresses && state.draftOrder.addresses.length)
    ? state.draftOrder.addresses
    : (known?.addresses?.length ? known.addresses : (known?.address ? [known.address] : []));
  state.draftOrder.addresses = addresses;
  state.mode = 'checkout_address_choice';
  ctx.userStates.set(ctx.chatId, state);

  const buttons: any[][] = [];
  addresses.slice(-5).reverse().forEach((address, index) => {
    const realIndex = addresses.length - 1 - index;
    buttons.push([{ text: `📍 ${address.slice(0, 42)}`, callback_data: `checkout_saved_address_${realIndex}` }]);
  });
  buttons.push([{ text: '➕ ثبت آدرس جدید', callback_data: 'checkout_new_address' }]);
  buttons.push(CHECKOUT_CANCEL_ROW);
  await tgSend(ctx, '🏠 <b>انتخاب آدرس تحویل:</b>\n\nیک آدرس از قبل ثبت‌شده را انتخاب کنید یا آدرس جدید وارد کنید:', buttons);
}

async function sendPaymentChoice(ctx: TelegramContext) {
  const state = ctx.userStates.get(ctx.chatId);
  if (state) {
    state.mode = 'checkout_payment_method';
    ctx.userStates.set(ctx.chatId, state);
  }
  await tgSend(ctx, '💳 <b>نحوه پرداخت:</b> لطفاً یکی از گزینه‌ها را انتخاب کنید:', [
    [{ text: '💵 پرداخت در محل', callback_data: 'payment_cash_on_delivery' }],
    [{ text: '💳 پرداخت هم اکنون (کارت‌به‌کارت)', callback_data: 'payment_online' }],
    [CHECKOUT_CANCEL_ROW]
  ]);
}

// After contact details are known, where do we go next depending on delivery?
async function afterContactDetails(ctx: TelegramContext, state: any): Promise<void> {
  if (state.draftOrder.deliveryMethod === 'delivery') {
    await sendDeliveryChoice(ctx);
  } else {
    await sendPaymentChoice(ctx);
  }
}

// Stale-button recovery: no active draft (old message / restarted server).
async function offerRestart(ctx: TelegramContext): Promise<boolean> {
  const cart = ctx.userCarts.get(ctx.chatId) || [];
  if (cart.length === 0) {
    await tgSend(ctx, '🛒 سبد خرید شما خالی است یا جریان قبلی به پایان رسیده است.\n\nلطفاً دوباره از منوی محصولات سفارش خود را شروع کنید.', [
      [{ text: '🍰 منوی محصولات', callback_data: 'menu_categories' }]
    ]);
  } else {
    await tgSend(ctx, '⏳ جریان پرداخت قبلی منقضی شده است. در حال آماده‌سازی دوبارهٔ تسویه‌حساب…');
    await startCheckout(ctx);
  }
  return true;
}

const CHECKOUT_CALLBACKS = new Set([
  'delivery_pickup', 'delivery_delivery', 'payment_cash_on_delivery', 'payment_online',
  'has_discount', 'no_discount', 'confirm_order', 'cancel_order', 'checkout_new_address',
]);

export async function handleCheckoutCallback(ctx: TelegramContext, data: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  const isCheckoutCallback = CHECKOUT_CALLBACKS.has(data) || data.startsWith('checkout_saved_address_');
  if ((!state || !state.draftOrder) && isCheckoutCallback) {
    return offerRestart(ctx);
  }
  if (!state || !state.draftOrder) return false;
  const draft = state.draftOrder;

  if (data === 'delivery_pickup') {
    draft.deliveryMethod = 'pickup';
    draft.shippingFee = 0;
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '🏪 دریافت حضوری انتخاب شد (هزینه ارسال: <b>رایگان</b>)');
    // Pickup needs only name + phone. Ask whichever is missing; otherwise pay.
    if (!draft.customerName || !isRealName(draft.customerName)) {
      state.mode = 'checkout_name';
      ctx.userStates.set(ctx.chatId, state);
      await tgSend(ctx, '👤 لطفاً <b>نام و نام خانوادگی</b> خود را ارسال کنید:', [CHECKOUT_CANCEL_ROW]);
    } else if (!draft.customerPhone) {
      state.mode = 'checkout_phone';
      ctx.userStates.set(ctx.chatId, state);
      await tgSend(ctx, '📞 لطفاً <b>شماره تلفن</b> خود را ارسال کنید:', [CHECKOUT_CANCEL_ROW]);
    } else {
      await sendPaymentChoice(ctx);
    }
    return true;
  }

  if (data === 'delivery_delivery') {
    draft.deliveryMethod = 'delivery';
    const cart = ctx.userCarts.get(ctx.chatId) || [];
    let subtotal = 0;
    cart.forEach(item => {
      const p = ctx.products.find(prod => prod.id === item.productId);
      if (p) {
        const effectivePrice = p.discountPercent ? p.price * (100 - p.discountPercent) / 100 : p.price;
        subtotal += effectivePrice * item.quantity;
      }
    });
    const isFreeShip = subtotal >= ctx.botSettings.freeShippingThreshold;
    draft.shippingFee = isFreeShip ? 0 : ctx.botSettings.shippingFee;
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🛵 ارسال با پیک انتخاب شد\nهزینه ارسال: <b>${draft.shippingFee === 0 ? 'رایگان' : draft.shippingFee.toLocaleString() + ' تومان'}</b>`);
    // Delivery needs name + phone + address + recipient.
    if (!draft.customerName || !isRealName(draft.customerName)) {
      state.mode = 'checkout_name';
      ctx.userStates.set(ctx.chatId, state);
      await tgSend(ctx, '👤 لطفاً <b>نام و نام خانوادگی</b> خود را ارسال کنید:', [CHECKOUT_CANCEL_ROW]);
    } else if (!draft.customerPhone) {
      state.mode = 'checkout_phone';
      ctx.userStates.set(ctx.chatId, state);
      await tgSend(ctx, '📞 لطفاً <b>شماره تلفن</b> خود را ارسال کنید:', [CHECKOUT_CANCEL_ROW]);
    } else {
      await sendDeliveryChoice(ctx);
    }
    return true;
  }

  if (data === 'checkout_new_address') {
    state.mode = 'checkout_new_address';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '🏠 لطفاً <b>آدرس دقیق تحویل</b> را ارسال کنید:', [CHECKOUT_CANCEL_ROW]);
    return true;
  }

  if (data.startsWith('checkout_saved_address_')) {
    const index = Number(data.replace('checkout_saved_address_', ''));
    const addresses: string[] = Array.isArray(draft.addresses) ? draft.addresses : [];
    const chosen = addresses[index];
    if (!chosen) return true;
    draft.customerAddress = chosen;
    state.mode = 'checkout_recipient_name';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `📍 آدرس انتخاب شد:\n<b>${chosen}</b>\n\n📛 لطفاً <b>نام گیرندهٔ مرسوله</b> را ارسال کنید:`, [CHECKOUT_CANCEL_ROW]);
    return true;
  }

  if (data === 'payment_cash_on_delivery') {
    draft.paymentMethod = 'cash_on_delivery';
    draft.discountAmount = 0;
    state.mode = 'checkout_confirm';
    ctx.userStates.set(ctx.chatId, state);
    await sendInvoice(ctx);
    return true;
  }

  if (data === 'payment_online') {
    draft.paymentMethod = 'online_payment';
    state.mode = 'checkout_discount_ask';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '💳 پرداخت آنلاین انتخاب شد.\n\n🎟️ آیا کد تخفیف دارید؟', [
      [{ text: '✅ بله', callback_data: 'has_discount' },
      { text: '❌ خیر', callback_data: 'no_discount' }],
      [CHECKOUT_CANCEL_ROW]
    ]);
    return true;
  }

  if (data === 'has_discount') {
    state.mode = 'checkout_discount_code';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '🎟️ لطفاً <b>کد تخفیف</b> خود را وارد کنید:');
    return true;
  }

  if (data === 'no_discount') {
    draft.discountAmount = 0;
    state.mode = 'checkout_confirm';
    ctx.userStates.set(ctx.chatId, state);
    await sendInvoice(ctx);
    return true;
  }

  if (data === 'confirm_order') {
    await createOrder(ctx);
    return true;
  }

  if (data === 'cancel_order') {
    ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '❌ سفارش لغو شد.', [[{ text: '🍰 منو', callback_data: 'menu_categories' }]]);
    return true;
  }

  return false;
}

async function sendInvoice(ctx: TelegramContext) {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state || !state.draftOrder) { await offerRestart(ctx); return; }
  const draft = state.draftOrder;

  const cart = ctx.userCarts.get(ctx.chatId) || [];
  let subtotal = 0;
  const items = cart.map(item => {
    const p = ctx.products.find(prod => prod.id === item.productId);
    if (!p) return null;
    const effectivePrice = p.discountPercent ? p.price * (100 - p.discountPercent) / 100 : p.price;
    const itemTotal = effectivePrice * item.quantity;
    subtotal += itemTotal;
    return {
      productCode: p.productCode,
      productName: p.name,
      quantity: item.quantity,
      unit: p.unit,
      price: effectivePrice,
      total: itemTotal
    };
  }).filter(Boolean);

  const shippingFee = draft.shippingFee || 0;
  let discountAmount = 0;
  if (draft.discount) {
    const disc = draft.discount;
    const applicable = disc.applicableProductIds || [];
    let baseAmount = subtotal;
    if (applicable.length > 0) {
      baseAmount = 0;
      (cart as Array<{ productId: string; quantity: number }>).forEach(item => {
        if (!applicable.includes(item.productId)) return;
        const p = ctx.products.find(pr => pr.id === item.productId);
        if (!p) return;
        const eff = p.discountPercent ? p.price * (100 - p.discountPercent) / 100 : p.price;
        baseAmount += eff * item.quantity;
      });
      baseAmount = Math.min(baseAmount, subtotal);
    }
    if (disc.type === 'percentage') {
      discountAmount = Math.round((baseAmount * disc.value) / 100);
      if (disc.maxDiscountAmount && discountAmount > disc.maxDiscountAmount) discountAmount = disc.maxDiscountAmount;
    } else {
      discountAmount = Math.min(disc.value, baseAmount);
    }
  }
  const totalAmount = subtotal + shippingFee - discountAmount;

  let invoice = `🧾 <b>پیش‌فاکتور سفارش</b>\n\n`;
  invoice += `👤 <b>خریدار:</b> ${draft.customerName}\n`;
  invoice += `📞 <b>تلفن:</b> ${draft.customerPhone}\n`;
  if (draft.deliveryMethod === 'delivery') {
    invoice += `🏠 <b>آدرس:</b> ${draft.customerAddress}\n`;
    invoice += `📛 <b>گیرنده:</b> ${draft.deliveryRecipientName || draft.customerName}\n`;
  }
  invoice += `\n📦 <b>اقلام سفارش:</b>\n`;
  items.forEach((item, idx) => {
    invoice += `${idx + 1}. <b>${item!.productName}</b>\n`;
    invoice += `   کد: <code>${item!.productCode || '---'}</code>\n`;
    invoice += `   ${item!.quantity} ${item!.unit} × ${item!.price.toLocaleString()} = <b>${item!.total.toLocaleString()}</b>\n\n`;
  });
  invoice += `─────────────────\n`;
  invoice += `💵 مجموع اقلام: <b>${subtotal.toLocaleString()}</b>\n`;
  invoice += `🚚 هزینه ارسال: <b>${shippingFee === 0 ? 'رایگان' : shippingFee.toLocaleString()}</b>\n`;
  if (discountAmount > 0) invoice += `🎟️ تخفیف: <b>-${discountAmount.toLocaleString()}</b>\n`;
  invoice += `─────────────────\n`;
  invoice += `💎 <b>مبلغ نهایی: ${totalAmount.toLocaleString()} تومان</b>\n\n`;
  invoice += `📦 نحوه دریافت: <b>${draft.deliveryMethod === 'pickup' ? 'حضوری' : 'پیک'}</b>\n`;
  invoice += `💳 نحوه پرداخت: <b>${draft.paymentMethod === 'cash_on_delivery' ? 'در محل' : 'آنلاین'}</b>\n\n`;
  invoice += `❓ آیا از خرید اطمینان دارید؟`;

  draft.items = items;
  draft.subtotal = subtotal;
  draft.shippingFee = shippingFee;
  draft.discountAmount = discountAmount;
  draft.totalAmount = totalAmount;
  ctx.userStates.set(ctx.chatId, state);

  await tgSend(ctx, invoice, [
    [{ text: '✅ بله، تأیید و ثبت سفارش', callback_data: 'confirm_order' }],
    [{ text: '❌ لغو سفارش', callback_data: 'cancel_order' }]
  ]);
}

async function createOrder(ctx: TelegramContext) {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state || !state.draftOrder) { await offerRestart(ctx); return; }
  const draft = state.draftOrder;

  const orderNumber = generateUniqueOrderNumber(ctx.orders);
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName: draft.customerName,
    customerPhone: draft.customerPhone,
    customerAddress: draft.deliveryMethod === 'delivery' ? draft.customerAddress : '',
    customerTelegramId: ctx.chatId,
    customerUsername: ctx.msg?.from?.username || undefined,
    customerTelegramName: getTelegramDisplayName(ctx.msg) || undefined,
    deliveryRecipientName: draft.deliveryMethod === 'delivery'
      ? (draft.deliveryRecipientName || draft.customerName)
      : draft.customerName,
    items: draft.items,
    subtotal: draft.subtotal,
    shippingFee: draft.shippingFee,
    discountAmount: draft.discountAmount,
    couponCode: draft.couponCode,
    totalAmount: draft.totalAmount,
    status: draft.paymentMethod === 'cash_on_delivery' ? 'pending_payment' : 'paid_checking',
    deliveryMethod: draft.deliveryMethod,
    paymentMethod: draft.paymentMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  ctx.orders.unshift(newOrder);
  ctx.userCarts.delete(ctx.chatId);
  ctx.userStates.delete(ctx.chatId);

  // One profile per Telegram account; keep stats and the address book there.
  const now = new Date().toISOString();
  const customer = upsertBotCustomer(ctx.customers, {
    telegramId: ctx.chatId,
    name: newOrder.customerName,
    phone: newOrder.customerPhone,
    username: newOrder.customerUsername || '',
    address: newOrder.customerAddress || '',
    source: 'bot',
  });
  customer.totalOrdersCount = (customer.totalOrdersCount || 0) + 1;
  customer.totalSpentTomans = (customer.totalSpentTomans || 0) + newOrder.totalAmount;
  customer.lastActiveAt = now;

  if (newOrder.paymentMethod === 'online_payment' || newOrder.paymentMethod === 'card_to_card' || newOrder.paymentMethod === 'online_gateway') {
    const confirmText = botText(ctx, 'orderSuccessOnlineMessage', {
      orderNumber,
      totalAmount: newOrder.totalAmount.toLocaleString(),
      cardNumber: ctx.botSettings.cardNumber || '---',
      cardHolder: ctx.botSettings.cardHolder || '---',
    });
    ctx.userStates.set(ctx.chatId, { mode: 'waiting_for_receipt', orderId: newOrder.id });
    await tgSend(ctx, confirmText, [
      [{ text: '📦 سفارشات من', callback_data: 'track_order' }],
      [{ text: '🍰 سفارش جدید', callback_data: 'menu_categories' }]
    ]);
    return;
  }

  const confirmText = botText(ctx, 'orderSuccessCashMessage', {
    orderNumber,
    totalAmount: newOrder.totalAmount.toLocaleString(),
  });

  await tgSend(ctx, confirmText, [
    [{ text: '📦 سفارشات من', callback_data: 'track_order' }],
    [{ text: '🍰 سفارش جدید', callback_data: 'menu_categories' }],
    [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
  ]);
}
