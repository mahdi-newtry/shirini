import { BotSettings, Product, Order, DiscountCode, CustomerUser } from './types';
import { generateUniqueOrderNumber } from './utils/orderNumber';
import { t as botText } from './data/botMessages';

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
  const base: any = { chat_id: ctx.chatId, parse_mode: 'HTML' };
  if (photo) {
    await fetch(`https://api.telegram.org/bot${ctx.token}/sendPhoto`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...base, photo, caption: text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
    });
  } else {
    await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...base, text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
    });
  }
}

export async function startCheckout(ctx: TelegramContext) {
  const cart = ctx.userCarts.get(ctx.chatId) || [];
  if (cart.length === 0) {
    await tgSend(ctx, '🛒 سبد خرید خالی است!', [[{ text: '🍰 منو', callback_data: 'menu_categories' }]]);
    return;
  }
  ctx.userStates.set(ctx.chatId, { mode: 'checkout_name', draftOrder: {} });
  await tgSend(ctx, '👤 <b>مرحله ۱ از ۶:</b> لطفاً <b>نام و نام خانوادگی</b> خود را ارسال کنید:', [
    [{ text: '❌ انصراف از خرید', callback_data: 'cancel_order' }]
  ]);
}

const CHECKOUT_CANCEL_ROW = [{ text: '❌ انصراف از خرید', callback_data: 'cancel_order' }];

export async function handleCheckoutState(ctx: TelegramContext, text: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state) return false;

  if (state.mode === 'checkout_name') {
    state.draftOrder.customerName = text;
    state.mode = 'checkout_phone';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `👤 نام <b>${text}</b> ثبت شد.\n\n📞 <b>مرحله ۲ از ۶:</b> لطفاً <b>شماره تلفن</b> خود را ارسال کنید:\n<i>(مثال: 09121234567)</i>`, [
      [CHECKOUT_CANCEL_ROW[0]]
    ]);
    return true;
  }

  if (state.mode === 'checkout_phone') {
    state.draftOrder.customerPhone = text;
    state.mode = 'checkout_address';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `📞 شماره تلفن ثبت شد.\n\n🏠 <b>مرحله ۳ از ۶:</b> لطفاً <b>آدرس دقیق تحویل</b> را ارسال کنید:`, [
      [CHECKOUT_CANCEL_ROW[0]]
    ]);
    return true;
  }

  if (state.mode === 'checkout_address') {
    state.draftOrder.customerAddress = text;
    state.mode = 'checkout_delivery_method';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🏠 آدرس ثبت شد.\n\n🚚 <b>مرحله ۴ از ۶:</b> نحوه دریافت سفارش را انتخاب کنید:`, [
      [{ text: '🏪 دریافت حضوری (رایگان)', callback_data: 'delivery_pickup' }],
      [{ text: '🛵 دریافت با پیک', callback_data: 'delivery_delivery' }],
      [CHECKOUT_CANCEL_ROW[0]]
    ]);
    return true;
  }

  if (state.mode === 'checkout_discount_code') {
    const code = text.trim().toUpperCase();
    const discount = ctx.discounts.find(d => d.code === code && d.isActive);
    if (!discount) {
      await tgSend(ctx, `❌ کد تخفیف <code>${code}</code> معتبر نیست.\n\nلطفاً دوباره تلاش کنید یا روی "بدون تخفیف" کلیک کنید:`, [
        [{ text: '❌ بدون تخفیف', callback_data: 'no_discount' }],
        [CHECKOUT_CANCEL_ROW[0]]
      ]);
      return true;
    }
    // If the code only applies to specific products, make sure the cart contains them
    const applicable = discount.applicableProductIds || [];
    if (applicable.length > 0) {
      const cart = ctx.userCarts.get(ctx.chatId) || [];
      const hasEligible = cart.some(it => applicable.includes(it.productId));
      if (!hasEligible) {
        await tgSend(ctx, `❌ کد تخفیف <code>${code}</code> فقط برای <b>برخی محصولات خاص</b> قابل استفاده است و سبد شما شامل آن‌ها نیست.\n\nلطفاً کد دیگری وارد کنید:`, [
          [{ text: '❌ بدون تخفیف', callback_data: 'no_discount' }],
          [CHECKOUT_CANCEL_ROW[0]]
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

export async function handleCheckoutCallback(ctx: TelegramContext, data: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state) return false;

  if (data === 'delivery_pickup') {
    state.draftOrder.deliveryMethod = 'pickup';
    state.draftOrder.shippingFee = 0;
    state.mode = 'checkout_payment_method';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🏪 دریافت حضوری انتخاب شد (هزینه ارسال: <b>رایگان</b>)\n\n💳 <b>مرحله ۵ از ۶:</b> نحوه پرداخت را انتخاب کنید:`, [
      [{ text: '💵 پرداخت در محل', callback_data: 'payment_cash_on_delivery' }],
      [{ text: '💳 پرداخت هم اکنون', callback_data: 'payment_online' }],
      [CHECKOUT_CANCEL_ROW[0]]
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
    state.mode = 'checkout_payment_method';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🛵 ارسال با پیک انتخاب شد\nهزینه ارسال: <b>${state.draftOrder.shippingFee === 0 ? 'رایگان' : state.draftOrder.shippingFee.toLocaleString() + ' تومان'}</b>\n\n💳 <b>مرحله ۵ از ۶:</b> نحوه پرداخت را انتخاب کنید:`, [
      [{ text: '💵 پرداخت در محل', callback_data: 'payment_cash_on_delivery' }],
      [{ text: '💳 پرداخت هم اکنون', callback_data: 'payment_online' }],
      [CHECKOUT_CANCEL_ROW[0]]
    ]);
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
    await tgSend(ctx, `💳 پرداخت آنلاین انتخاب شد.\n\n🎟️ آیا کد تخفیف دارید؟`, [
      [{ text: '✅ بله', callback_data: 'has_discount' }],
      [{ text: '❌ خیر', callback_data: 'no_discount' }],
      [CHECKOUT_CANCEL_ROW[0]]
    ]);
    return true;
  }

  if (data === 'has_discount') {
    state.mode = 'checkout_discount_code';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `🎟️ لطفاً <b>کد تخفیف</b> خود را وارد کنید:`);
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
  if (!state) return;

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

  const shippingFee = state.draftOrder.shippingFee || 0;
  let discountAmount = 0;
  if (state.draftOrder.discount) {
    const disc = state.draftOrder.discount;
    // Codes limited to specific products: discount applies only to those items
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

  let invoice = `🧾 <b>فاکتور سفارش</b>\n\n`;
  invoice += `👤 <b>نام:</b> ${state.draftOrder.customerName}\n`;
  invoice += `📞 <b>تلفن:</b> ${state.draftOrder.customerPhone}\n`;
  invoice += `🏠 <b>آدرس:</b> ${state.draftOrder.customerAddress}\n\n`;
  invoice += `📦 <b>اقلام سفارش:</b>\n`;
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
    if (state.draftOrder.discount?.applicableProductIds?.length) {
      invoice += `🎯 <i>(کد تخفیف فقط روی محصولات انتخابی اعمال شد)</i>\n`;
    }
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
  if (!state) return;

  const orderNumber = generateUniqueOrderNumber(ctx.orders);
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName: state.draftOrder.customerName,
    customerPhone: state.draftOrder.customerPhone,
    customerAddress: state.draftOrder.customerAddress,
    customerTelegramId: ctx.chatId,
    customerUsername: ctx.msg?.from?.username || undefined,
    customerTelegramName: getTelegramDisplayName(ctx.msg) || undefined,
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

  const existingCustomer = ctx.customers.find(c => c.telegramId === ctx.chatId);
  const customerUpdatedAt = new Date().toISOString();
  if (!existingCustomer) {
    ctx.customers.unshift({
      id: `usr-${Date.now()}`,
      telegramId: ctx.chatId,
      name: newOrder.customerName,
      phone: newOrder.customerPhone,
      username: newOrder.customerUsername || '',
      address: newOrder.customerAddress,
      walletBalance: 0,
      rewardPoints: 50,
      totalOrdersCount: 1,
      totalSpentTomans: newOrder.totalAmount,
      tier: 'bronze',
      createdAt: customerUpdatedAt,
      lastActiveAt: customerUpdatedAt
    });
  } else {
    // /start can create a lightweight customer record before checkout. Keep
    // that record complete so later support tickets can show the phone/address
    // that the customer already supplied during an order.
    existingCustomer.name = newOrder.customerName || existingCustomer.name;
    existingCustomer.phone = newOrder.customerPhone || existingCustomer.phone;
    existingCustomer.address = newOrder.customerAddress || existingCustomer.address;
    if (newOrder.customerUsername) {
      existingCustomer.username = newOrder.customerUsername;
    }
    existingCustomer.totalOrdersCount = (existingCustomer.totalOrdersCount || 0) + 1;
    existingCustomer.totalSpentTomans = (existingCustomer.totalSpentTomans || 0) + newOrder.totalAmount;
    existingCustomer.lastActiveAt = customerUpdatedAt;
  }

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
    [{ text: '🍰 سفارش جدید', callback_data: 'menu_categories' }]
  ]);
}
