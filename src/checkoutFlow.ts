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
  for (let attempt = 1; attempt <= 3 && !result.ok; attempt++) {
    const wait = result.body?.parameters?.retry_after
      ? Number(result.body.parameters.retry_after) * 1000
      : Math.min(400 * attempt, 1200);
    console.error(`[checkout] ${endpoint} attempt ${attempt} failed (status ${result.status}):`, JSON.stringify(result.body)?.slice(0, 300));
    await new Promise(r => setTimeout(r, wait));
    result = await send();
  }

  if (!result.ok) {
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

// Mirrors the custom-order registration flow exactly: name (1/3) -> phone (2/3)
// -> address (3/3) -> payment choice. Cancel returns to the main menu.
const CANCEL_ROW = [{ text: '❌ انصراف', callback_data: 'back_to_main' }];

function knownProfile(ctx: TelegramContext) {
  const known = findBotCustomer(ctx.customers, ctx.chatId);
  const knownName = known && isRealName(known.name) ? known.name! : '';
  const knownPhone = known?.phone || '';
  const knownAddresses: string[] = known?.addresses?.length
    ? known.addresses
    : (known?.address ? [known.address] : []);
  return { known, knownName, knownPhone, knownAddresses };
}

/** Entry point after "ثبت سفارش و پرداخت" — mirrors custom_order_register start. */
export async function startCheckout(ctx: TelegramContext) {
  const cart = ctx.userCarts.get(ctx.chatId) || [];
  if (cart.length === 0) {
    await tgSend(ctx, '🛒 سبد خرید خالی است!', [[{ text: '🍰 منو', callback_data: 'menu_categories' }]]);
    return;
  }

  const { knownName, knownPhone, knownAddresses } = knownProfile(ctx);
  const draft: any = {
    customerName: knownName || '',
    customerPhone: knownPhone || '',
    addresses: knownAddresses,
    customerAddress: knownAddresses[knownAddresses.length - 1] || '',
  };

  // Already know name + phone -> skip straight to address (step 3), like custom flow.
  if (knownName && knownPhone) {
    ctx.userStates.set(ctx.chatId, { mode: 'checkout_address', draftOrder: draft });
    const addressButtons: any[][] = [
      ...knownAddresses.slice(-5).reverse().map((address, index) => ([{
        text: `📍 ${address.slice(0, 42)}`,
        callback_data: `checkout_saved_address_${knownAddresses.length - 1 - index}`
      }])),
      [{ text: '➕ ثبت آدرس جدید', callback_data: 'checkout_new_address' }],
      [CANCEL_ROW]
    ];
    await tgSend(
      ctx,
      `👤 <b>${knownName}</b> عزیز، اطلاعات تماس شما از قبل ثبت شده است.\n\n🏠 یک آدرس از قبل ثبت‌شده را انتخاب کنید یا آدرس جدید وارد کنید:`,
      addressButtons
    );
    return;
  }

  ctx.userStates.set(ctx.chatId, { mode: 'checkout_name', draftOrder: draft });
  await tgSend(ctx, `✅ <b>ثبت سفارش</b>\n\nلطفاً <b>نام و نام خانوادگی</b> خود را وارد کنید:`);
}

export async function handleCheckoutState(ctx: TelegramContext, text: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state || !state.draftOrder) return false;
  const draft = state.draftOrder;

  if (state.mode === 'checkout_name') {
    const customerName = text.trim();
    if (customerName.length < 2) {
      await tgSend(ctx, '❌ لطفاً نام و نام خانوادگی معتبر را وارد کنید:');
      return true;
    }
    draft.customerName = customerName;
    state.mode = 'checkout_phone';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '✅ نام ثبت شد.\n\n📞 <b>مرحله ۲ از ۳:</b> لطفاً <b>شماره تلفن</b> خود را وارد کنید:', [CANCEL_ROW]);
    return true;
  }

  if (state.mode === 'checkout_phone') {
    const customerPhone = text.trim();
    if (customerPhone.length < 7) {
      await tgSend(ctx, '❌ لطفاً شماره تلفن معتبر را وارد کنید:');
      return true;
    }
    draft.customerPhone = customerPhone;
    state.mode = 'checkout_address';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '✅ شماره تلفن ثبت شد.\n\n🏠 <b>مرحله ۳ از ۳:</b> لطفاً <b>آدرس دقیق تحویل</b> را وارد کنید:', [CANCEL_ROW]);
    return true;
  }

  if (state.mode === 'checkout_address' || state.mode === 'checkout_new_address') {
    const deliveryAddress = text.trim();
    if (deliveryAddress.length < 5) {
      await tgSend(ctx, '❌ لطفاً آدرس دقیق‌تری وارد کنید:');
      return true;
    }
    draft.customerAddress = deliveryAddress;
    const book: string[] = Array.isArray(draft.addresses) ? [...draft.addresses] : [];
    if (!book.includes(deliveryAddress)) book.push(deliveryAddress);
    draft.addresses = book;
    ctx.userStates.set(ctx.chatId, state);
    await finishRegistration(ctx);
    return true;
  }

  return false;
}

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
  'payment_cash_on_delivery', 'payment_online', 'checkout_new_address',
]);

export async function handleCheckoutCallback(ctx: TelegramContext, data: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  const isCheckoutCallback = CHECKOUT_CALLBACKS.has(data) || data.startsWith('checkout_saved_address_');
  if ((!state || !state.draftOrder) && isCheckoutCallback) {
    return offerRestart(ctx);
  }
  if (!state || !state.draftOrder) return false;
  const draft = state.draftOrder;

  if (data === 'checkout_new_address') {
    state.mode = 'checkout_new_address';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, '🏠 لطفاً <b>آدرس دقیق تحویل</b> را وارد کنید:', [CANCEL_ROW]);
    return true;
  }

  if (data.startsWith('checkout_saved_address_')) {
    const index = Number(data.replace('checkout_saved_address_', ''));
    const addresses: string[] = Array.isArray(draft.addresses) ? draft.addresses : [];
    const chosen = addresses[index];
    if (!chosen) {
      await tgSend(ctx, '❌ آدرس پیدا نشد. لطفاً آدرس جدید را وارد کنید:', [CANCEL_ROW]);
      return true;
    }
    draft.customerAddress = chosen;
    ctx.userStates.set(ctx.chatId, state);
    await finishRegistration(ctx);
    return true;
  }

  if (data === 'payment_cash_on_delivery') {
    draft.paymentMethod = 'cash_on_delivery';
    ctx.userStates.set(ctx.chatId, state);
    await createOrder(ctx);
    return true;
  }

  if (data === 'payment_online') {
    draft.paymentMethod = 'online_payment';
    ctx.userStates.set(ctx.chatId, state);
    await createOrder(ctx);
    return true;
  }

  return false;
}

/** After name/phone/address are collected: show the order summary + payment buttons (mirrors custom registrationComplete). */
async function finishRegistration(ctx: TelegramContext) {
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

  const shippingFee = subtotal >= ctx.botSettings.freeShippingThreshold ? 0 : ctx.botSettings.shippingFee;
  const totalAmount = subtotal + shippingFee;

  let summary = `✅ <b>اطلاعات شما ثبت شد.</b>\n\n`;
  summary += `👤 <b>نام:</b> ${draft.customerName}\n`;
  summary += `📞 <b>تلفن:</b> ${draft.customerPhone}\n`;
  summary += `🏠 <b>آدرس:</b> ${draft.customerAddress}\n\n`;
  summary += `🧾 <b>خلاصه سفارش:</b>\n`;
  items.forEach((item, idx) => {
    summary += `${idx + 1}. ${item!.productName} — ${item!.quantity} ${item!.unit} = <b>${item!.total.toLocaleString()}</b>\n`;
  });
  summary += `\n💵 مجموع اقلام: <b>${subtotal.toLocaleString()}</b>\n`;
  summary += `🚚 هزینه ارسال: <b>${shippingFee === 0 ? 'رایگان' : shippingFee.toLocaleString()}</b>\n`;
  summary += `💎 <b>مبلغ نهایی: ${totalAmount.toLocaleString()} تومان</b>\n\n`;
  summary += `💳 لطفاً <b>نحوه پرداخت</b> را انتخاب کنید:`;

  draft.items = items;
  draft.subtotal = subtotal;
  draft.shippingFee = shippingFee;
  draft.discountAmount = 0;
  draft.totalAmount = totalAmount;
  state.mode = 'checkout_payment_method';
  ctx.userStates.set(ctx.chatId, state);

  await tgSend(ctx, summary, [
    [{ text: '💵 پرداخت در محل', callback_data: 'payment_cash_on_delivery' }],
    [{ text: '💳 پرداخت هم اکنون', callback_data: 'payment_online' }],
    [CANCEL_ROW]
  ]);
}

async function createOrder(ctx: TelegramContext) {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state || !state.draftOrder) { await offerRestart(ctx); return; }
  const draft = state.draftOrder;
  if (!draft.customerName || !draft.customerPhone || !draft.customerAddress) {
    await offerRestart(ctx);
    return;
  }

  const orderNumber = generateUniqueOrderNumber(ctx.orders);
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName: draft.customerName,
    customerPhone: draft.customerPhone,
    customerAddress: draft.customerAddress,
    customerTelegramId: ctx.chatId,
    customerUsername: ctx.msg?.from?.username || undefined,
    customerTelegramName: getTelegramDisplayName(ctx.msg) || undefined,
    deliveryRecipientName: draft.customerName,
    items: draft.items,
    subtotal: draft.subtotal,
    shippingFee: draft.shippingFee,
    discountAmount: draft.discountAmount || 0,
    totalAmount: draft.totalAmount,
    status: draft.paymentMethod === 'cash_on_delivery' ? 'pending_payment' : 'paid_checking',
    deliveryMethod: 'delivery',
    paymentMethod: draft.paymentMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  ctx.orders.unshift(newOrder);
  ctx.userCarts.delete(ctx.chatId);
  ctx.userStates.delete(ctx.chatId);

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

  if (newOrder.paymentMethod === 'online_payment') {
    const confirmText = botText(ctx, 'orderSuccessOnlineMessage', {
      orderNumber,
      totalAmount: newOrder.totalAmount.toLocaleString(),
      cardNumber: ctx.botSettings.cardNumber || '---',
      cardHolder: ctx.botSettings.cardHolder || '---',
    });
    ctx.userStates.set(ctx.chatId, { mode: 'waiting_for_receipt', orderId: newOrder.id });
    await tgSend(ctx, confirmText, [
      [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
    ]);
    return;
  }

  const confirmText = botText(ctx, 'orderSuccessCashMessage', {
    orderNumber,
    totalAmount: newOrder.totalAmount.toLocaleString(),
  });

  await tgSend(ctx, confirmText, [
    [{ text: '📦 پیگیری سفارشات', callback_data: 'track_order' }],
    [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
  ]);
}
