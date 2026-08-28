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
  // Retry on transient failures (network blip, 429 flood-wait, 5xx) so a
  // checkout prompt is never silently lost.
  for (let attempt = 1; attempt <= 3 && !result.ok; attempt++) {
    const wait = result.body?.parameters?.retry_after
      ? Number(result.body.parameters.retry_after) * 1000
      : Math.min(500 * attempt, 1500);
    console.error(`[checkout] ${endpoint} attempt ${attempt} failed (status ${result.status}):`, JSON.stringify(result.body)?.slice(0, 300));
    await new Promise(r => setTimeout(r, wait));
    result = await send();
  }

  if (!result.ok) {
    // Last resort: try a plain message without HTML/buttons so the customer
    // always gets *something* and is never left staring at a dead button.
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
const MAIN_MENU_ROW = [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }];

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
  const startMode = (knownName && known?.phone) ? 'checkout_delivery_method' : 'checkout_name';
  ctx.userStates.set(ctx.chatId, { mode: startMode, draftOrder: draft });

  if (draft.customerName && draft.customerPhone) {
    await tgSend(ctx, `👤 <b>${draft.customerName}</b> عزیز سلام!\n\nبرای شروع ثبت سفارش، نحوه دریافت را انتخاب کنید:`, [
      [{ text: '🏪 دریافت حضوری (رایگان)', callback_data: 'delivery_pickup' }],
      [{ text: '🛵 دریافت با پیک', callback_data: 'delivery_delivery' }],
      [CHECKOUT_CANCEL_ROW]
    ]);
    return;
  }

  await tgSend(ctx, '👤 <b>مرحله اطلاعات تماس:</b>\n\nلطفاً <b>نام و نام خانوادگی</b> خود را ارسال کنید:', [
    [CHECKOUT_CANCEL_ROW]
  ]);
}

export async function handleCheckoutState(ctx: TelegramContext, text: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state) return false;
  if (!state.draftOrder) return false;

  if (state.mode === 'checkout_name') {
    state.draftOrder.customerName = text.trim();
    state.mode = 'checkout_phone';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `👤 نام <b>${text.trim()}</b> ثبت شد.\n\n📞 لطفاً <b>شماره تلفن</b> خود را ارسال کنید:\n<i>(مثال: 09121234567)</i>`, [
      [CHECKOUT_CANCEL_ROW]
    ]);
    return true;
  }

  if (state.mode === 'checkout_phone') {
    state.draftOrder.customerPhone = text.trim();
    state.mode = 'checkout_delivery_method';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `📞 شماره تلفن ثبت شد.\n\n🚚 نحوه دریافت سفارش را انتخاب کنید:`, [
      [{ text: '🏪 دریافت حضوری (رایگان)', callback_data: 'delivery_pickup' }],
      [{ text: '🛵 دریافت با پیک', callback_data: 'delivery_delivery' }],
      [CHECKOUT_CANCEL_ROW]
    ]);
    return true;
  }

  if (state.mode === 'checkout_new_address') {
    state.draftOrder.customerAddress = text.trim();
    const book: string[] = Array.isArray(state.draftOrder.addresses) ? [...state.draftOrder.addresses] : [];
    if (!book.includes(text.trim())) book.push(text.trim());
    state.draftOrder.addresses = book;
    state.mode = 'checkout_recipient_name';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🏠 آدرس ثبت شد.\n\n📛 لطفاً <b>نام گیرندهٔ مرسوله</b> را ارسال کنید (نام و نام خانوادگی تحویل‌گیرنده):`, [
      CHECKOUT_CANCEL_ROW
    ]);
    return true;
  }

  if (state.mode === 'checkout_recipient_name') {
    state.draftOrder.deliveryRecipientName = text.trim();
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
    state.draftOrder.couponCode = code;
    state.draftOrder.discount = discount;
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
  await tgSend(ctx, '💳 <b>نحوه پرداخت:</b> لطفاً یکی از گزینه‌ها را انتخاب کنید:', [
    [{ text: '💵 پرداخت در محل', callback_data: 'payment_cash_on_delivery' }],
    [{ text: '💳 پرداخت هم اکنون (کارت‌به‌کارت)', callback_data: 'payment_online' }],
    [CHECKOUT_CANCEL_ROW]
  ]);
}

// When a customer taps an old checkout button (after a server restart, after
// an order was already completed, or when state was otherwise lost) there is
// no in-memory draft. Guard against writing to a missing draft (which would
// throw and be swallowed by the polling loop, leaving the button dead) and
// instead guide the customer to restart checkout from their cart.
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

export async function handleCheckoutCallback(ctx: TelegramContext, data: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state || !state.draftOrder) {
    // Only guide for callbacks that actually belong to an in-progress checkout.
    if (data === 'delivery_pickup' || data === 'delivery_delivery' || data === 'payment_cash_on_delivery' ||
        data === 'payment_online' || data === 'has_discount' || data === 'no_discount' ||
        data === 'confirm_order' || data === 'checkout_new_address' ||
        data.startsWith('checkout_saved_address_')) {
      return offerRestart(ctx);
    }
    return false;
  }

  if (data === 'delivery_pickup') {
    state.draftOrder.deliveryMethod = 'pickup';
    state.draftOrder.shippingFee = 0;
    state.mode = 'checkout_recipient_name';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '🏪 دریافت حضوری انتخاب شد (هزینه ارسال: <b>رایگان</b>)\n\n📛 لطفاً <b>نام تحویل‌گیرنده</b> (شخصی که سفارش را تحویل می‌گیرد) را ارسال کنید:', [
      CHECKOUT_CANCEL_ROW
    ]);
    return true;
  }

  if (data === 'delivery_delivery') {
    state.draftOrder.deliveryMethod = 'delivery';
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
    state.draftOrder.shippingFee = isFreeShip ? 0 : ctx.botSettings.shippingFee;
    state.mode = 'checkout_address_choice';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🛵 ارسال با پیک انتخاب شد\nهزینه ارسال: <b>${state.draftOrder.shippingFee === 0 ? 'رایگان' : state.draftOrder.shippingFee.toLocaleString() + ' تومان'}</b>`);
    await sendDeliveryChoice(ctx);
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
    const addresses: string[] = Array.isArray(state.draftOrder.addresses) ? state.draftOrder.addresses : [];
    const chosen = addresses[index];
    if (!chosen) return true;
    state.draftOrder.customerAddress = chosen;
    state.mode = 'checkout_recipient_name';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `📍 آدرس انتخاب شد:\n<b>${chosen}</b>\n\n📛 لطفاً <b>نام گیرندهٔ مرسوله</b> را ارسال کنید:`, [CHECKOUT_CANCEL_ROW]);
    return true;
  }

  if (data === 'payment_cash_on_delivery') {
    state.draftOrder.paymentMethod = 'cash_on_delivery';
    state.draftOrder.discountAmount = 0;
    state.mode = 'checkout_confirm';
    ctx.userStates.set(ctx.chatId, state);
    await sendInvoice(ctx);
    return true;
  }

  if (data === 'payment_online') {
    state.draftOrder.paymentMethod = 'online_payment';
    state.mode = 'checkout_discount_ask';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '💳 پرداخت آنلاین انتخاب شد.\n\n🎟️ آیا کد تخفیف دارید؟', [
      [{ text: '✅ بله', callback_data: 'has_discount' }],
      [{ text: '❌ خیر', callback_data: 'no_discount' }],
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
    state.draftOrder.discountAmount = 0;
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
  if (!state || !state.draftOrder) return;

  const cart = ctx.userCarts.get(ctx.chatId) || [];
  if (cart.length === 0) {
    await offerRestart(ctx);
    return;
  }
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

  const shippingFee = state.draftOrder.shippingFee || 0;
  let discountAmount = 0;
  if (state.draftOrder.discount) {
    const disc = state.draftOrder.discount;
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
      if (disc.maxDiscountAmount && discountAmount > disc.maxDiscountAmount) {
        discountAmount = disc.maxDiscountAmount;
      }
    } else {
      discountAmount = Math.min(disc.value, baseAmount);
    }
  }
  const totalAmount = subtotal + shippingFee - discountAmount;

  let invoice = `🧾 <b>پیش‌فاکتور سفارش</b>\n\n`;
  invoice += `👤 <b>خریدار:</b> ${state.draftOrder.customerName}\n`;
  invoice += `📞 <b>تلفن:</b> ${state.draftOrder.customerPhone}\n`;
  if (state.draftOrder.deliveryMethod === 'delivery') {
    invoice += `🏠 <b>آدرس:</b> ${state.draftOrder.customerAddress}\n`;
    invoice += `📛 <b>گیرنده:</b> ${state.draftOrder.deliveryRecipientName || state.draftOrder.customerName}\n`;
  } else if (state.draftOrder.deliveryRecipientName) {
    invoice += `📛 <b>تحویل‌گیرنده:</b> ${state.draftOrder.deliveryRecipientName}\n`;
  }
  invoice += `\n📦 <b>اقلام سفارش:</b>\n`;
  items.forEach((item, idx) => {
    invoice += `${idx + 1}. <b>${item.productName}</b>\n`;
    invoice += `   کد: <code>${item.productCode || '---'}</code>\n`;
    invoice += `   ${item.quantity} ${item.unit} × ${item.price.toLocaleString()} = <b>${item.total.toLocaleString()}</b>\n\n`;
  });
  invoice += `─────────────────\n`;
  invoice += `💵 مجموع اقلام: <b>${subtotal.toLocaleString()}</b>\n`;
  invoice += `🚚 هزینه ارسال: <b>${shippingFee === 0 ? 'رایگان' : shippingFee.toLocaleString()}</b>\n`;
  if (discountAmount > 0) {
    invoice += `🎟️ تخفیف: <b>-${discountAmount.toLocaleString()}</b>\n`;
  }
  invoice += `─────────────────\n`;
  invoice += `💎 <b>مبلغ نهایی: ${totalAmount.toLocaleString()} تومان</b>\n\n`;
  invoice += `📦 نحوه دریافت: <b>${state.draftOrder.deliveryMethod === 'pickup' ? 'حضوری' : 'پیک'}</b>\n`;
  invoice += `💳 نحوه پرداخت: <b>${state.draftOrder.paymentMethod === 'cash_on_delivery' ? 'در محل' : 'آنلاین'}</b>\n\n`;
  invoice += `❓ آیا از خرید اطمینان دارید؟`;

  state.draftOrder.items = items;
  state.draftOrder.subtotal = subtotal;
  state.draftOrder.shippingFee = shippingFee;
  state.draftOrder.discountAmount = discountAmount;
  state.draftOrder.totalAmount = totalAmount;
  ctx.userStates.set(ctx.chatId, state);

  await tgSend(ctx, invoice, [
    [{ text: '✅ بله، تأیید و ثبت سفارش', callback_data: 'confirm_order' }],
    [{ text: '❌ لغو سفارش', callback_data: 'cancel_order' }]
  ]);
}

async function createOrder(ctx: TelegramContext) {
  const state = ctx.userStates.get(ctx.chatId);
  // Missing draft (stale button / lost state) must guide the customer to
  // restart rather than throwing on state.draftOrder (which would otherwise be
  // swallowed by the polling loop and leave the button silently dead).
  if (!state || !state.draftOrder) {
    await offerRestart(ctx);
    return;
  }
  const orderNumber = generateUniqueOrderNumber(ctx.orders);
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName: state.draftOrder.customerName,
    customerPhone: state.draftOrder.customerPhone,
    customerAddress: state.draftOrder.deliveryMethod === 'delivery' ? state.draftOrder.customerAddress : '',
    customerTelegramId: ctx.chatId,
    customerUsername: ctx.msg?.from?.username || undefined,
    customerTelegramName: getTelegramDisplayName(ctx.msg) || undefined,
    deliveryRecipientName: state.draftOrder.deliveryRecipientName || state.draftOrder.customerName,
    items: state.draftOrder.items,
    subtotal: state.draftOrder.subtotal,
    shippingFee: state.draftOrder.shippingFee,
    discountAmount: state.draftOrder.discountAmount,
    couponCode: state.draftOrder.couponCode,
    totalAmount: state.draftOrder.totalAmount,
    status: state.draftOrder.paymentMethod === 'cash_on_delivery' ? 'pending_payment' : 'paid_checking',
    deliveryMethod: state.draftOrder.deliveryMethod,
    paymentMethod: state.draftOrder.paymentMethod,
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
    MAIN_MENU_ROW
  ]);
}
