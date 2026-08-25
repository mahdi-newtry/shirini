// Telegram Bot Handler - processes all callback queries and text messages
// Called from server.ts polling loop

interface SimpleMap<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): unknown;
  delete(key: string): boolean;
  has?(key: string): boolean;
}

interface TelegramContext {
  token: string;
  chatId: string;
  products: any[];
  orders: any[];
  discounts: any[];
  customers: any[];
  supportTickets: any[];
  customOrders: any[];
  botSettings: any;
  userCarts: SimpleMap<any[]>;
  userStates: SimpleMap<any>;
}

async function tgSend(ctx: TelegramContext, text: string, buttons?: any[][], photo?: string) {
  const base: any = { chat_id: ctx.chatId, parse_mode: 'HTML' };
  if (photo) {
    // Check if photo is a base64 data URL
    if (photo.startsWith('data:image/')) {
      try {
        // Extract base64 data and mime type
        const matches = photo.match(/^data:(image\/\w+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Use Telegram's input file format
          const formData = new FormData();
          formData.append('chat_id', ctx.chatId);
          formData.append('parse_mode', 'HTML');
          formData.append('caption', text);
          formData.append('photo', new Blob([buffer], { type: mimeType }), 'image.jpg');
          
          if (buttons) {
            formData.append('reply_markup', JSON.stringify({ inline_keyboard: buttons }));
          }
          
          const response = await fetch(`https://api.telegram.org/bot${ctx.token}/sendPhoto`, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            // If sendPhoto failed, send text only
            await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...base, text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
            });
          }
          return;
        }
      } catch (err) {
        console.error('Error sending base64 photo:', err);
        // Fallback to text only
        await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
        });
        return;
      }
    }
    
    // Regular URL
    try {
      const response = await fetch(`https://api.telegram.org/bot${ctx.token}/sendPhoto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, photo, caption: text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
      });
      
      if (!response.ok) {
        // If sendPhoto failed, send text only
        await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
        });
      }
    } catch (err) {
      console.error('Error sending photo:', err);
      // Fallback to text only
      await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
      });
    }
  } else {
    await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...base, text, reply_markup: buttons ? { inline_keyboard: buttons } : undefined })
    });
  }
}

// ============ CUSTOMER CALLBACKS ============

export async function handleCustomerCallback(ctx: TelegramContext, data: string): Promise<boolean> {
  // Menu categories
  if (data === 'menu_categories') {
    const cats = ['کیک و پای', 'شیرینی تر و خامه‌ای', 'شیرینی خشک و سنتی', 'دسر و باقلوا', 'کوکی و بیسکوئیت', 'نان و کروسان'];
    const btns: any[][] = [];
    for (let i = 0; i < cats.length; i += 2) {
      const row: any[] = [{ text: cats[i], callback_data: `cat_${cats[i]}` }];
      if (cats[i + 1]) row.push({ text: cats[i + 1], callback_data: `cat_${cats[i + 1]}` });
      btns.push(row);
    }
    btns.push([{ text: '🌟 همه محصولات', callback_data: 'cat_all' }, { text: '🔙 منوی اصلی', callback_data: 'back_to_main' }]);
    await tgSend(ctx, '🧁 <b>دسته‌بندی محصولات:</b>', btns);
    return true;
  }

  // Category products
  if (data.startsWith('cat_')) {
    const sel = data.replace('cat_', '');
    const filtered = sel === 'all' ? ctx.products.filter(p => p.isAvailable) : ctx.products.filter(p => p.category === sel && p.isAvailable);
    if (filtered.length === 0) {
      await tgSend(ctx, `محصولی در این دسته‌بندی یافت نشد.`, [[{ text: '🔙 دسته‌ها', callback_data: 'menu_categories' }]]);
      return true;
    }
    await tgSend(ctx, `🍰 <b>${sel === 'all' ? 'همه محصولات' : sel}</b> (${filtered.length} مورد):`);
    for (const prod of filtered.slice(0, 10)) {
      const discountedPrice = prod.discountPercent ? (prod.price * (100 - prod.discountPercent) / 100) : prod.price;
      const priceText = prod.discountPercent 
        ? `<s>${prod.price.toLocaleString()}</s> ➤ <b>${discountedPrice.toLocaleString()}</b> تومان`
        : `<b>${prod.price.toLocaleString()}</b> تومان`;
      
      let cap = `✨━━━━━━━━━━━━━━━━━━━✨\n`;
      cap += `🎂 <b>${prod.name || 'محصول'}</b>\n`;
      cap += `━━━━━━━━━━━━━━━━━━━\n\n`;
      cap += `📂 <b>دسته‌بندی:</b> ${prod.category || '---'}\n`;
      cap += `🏷️ <b>کد محصول:</b> <code>${prod.productCode || '---'}</code>\n\n`;
      cap += `💰 <b>قیمت:</b> ${priceText}\n`;
      cap += `📦 <b>واحد فروش:</b> هر ${prod.unit || 'عدد'}\n\n`;
      if (prod.description) {
        cap += `📝 <b>توضیحات:</b>\n<i>${prod.description}</i>\n\n`;
      }
      cap += `✅ <b>وضعیت:</b> ${prod.isAvailable ? '🟢 موجود و آماده سفارش' : '🔴 ناموجود'}\n`;
      cap += `✨━━━━━━━━━━━━━━━━━━━✨`;
      
      const allImages = prod.images && prod.images.length > 0 ? prod.images : (prod.image ? [prod.image] : []);
      
      if (allImages.length > 0) {
        // Send first image with full caption
        await tgSend(ctx, cap, [
          [{ text: '➕ افزودن به سبد خرید', callback_data: `add_to_cart_${prod.id}` }],
          [{ text: '🛒 سبد خرید', callback_data: 'view_cart' }, { text: '🔙 دسته‌ها', callback_data: 'menu_categories' }],
          [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
        ], allImages[0]);
        
        // Send remaining images without caption
        for (let i = 1; i < allImages.length; i++) {
          await tgSend(ctx, '', undefined, allImages[i]);
        }
      } else {
        // Send text only with buttons
        await tgSend(ctx, cap, [
          [{ text: '➕ افزودن به سبد خرید', callback_data: `add_to_cart_${prod.id}` }],
          [{ text: '🛒 سبد خرید', callback_data: 'view_cart' }, { text: '🔙 دسته‌ها', callback_data: 'menu_categories' }],
          [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
        ]);
      }
    }
    return true;
  }

  // Support message
  if (data === 'support_send') {
    ctx.userStates.set(ctx.chatId, { mode: 'support_message' });
    await tgSend(ctx, '💬 <b>ارسال پیام پشتیبانی:</b>\n\nلطفاً پیام خود را تایپ و ارسال کنید:', [
      [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
    ]);
    return true;
  }

  // Contact info
  if (data === 'contact_info') {
    const s = ctx.botSettings;
    await tgSend(ctx, `📍 <b>اطلاعات تماس:</b>\n\n🏢 ${s.storeName || '---'}\n📞 ${s.storePhone || '---'}\n🏠 ${s.storeAddress || '---'}\n💳 <code>${s.cardNumber || '---'}</code>\n👤 ${s.cardHolder || '---'}`, [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]]);
    return true;
  }

  return false;
}

// ============ ADMIN CALLBACKS ============

export async function handleAdminCallback(ctx: TelegramContext, data: string): Promise<boolean> {

  // Admin Panel Main
  if (data === 'admin_panel') {
    const pending = ctx.orders.filter(o => o.status === 'paid_checking' || o.status === 'baking').length;
    await tgSend(ctx, `👨‍🍳 <b>پنل مدیریت</b>`, [
      [{ text: `➕ افزودن محصول`, callback_data: 'admin_add_product' }, { text: `🧁 محصولات (${ctx.products.length})`, callback_data: 'admin_products_manager' }],
      [{ text: `📦 سفارشات (${pending})`, callback_data: 'admin_orders_list' }, { text: `🎂 سفارش دلخواه (${ctx.customOrders.length})`, callback_data: 'admin_custom_orders' }],
      [{ text: `🎟️ تخفیف‌ها (${ctx.discounts.length})`, callback_data: 'admin_discounts_list' }, { text: `👥 کاربران (${ctx.customers.length})`, callback_data: 'admin_customers_manager' }],
      [{ text: `💬 تیکت‌ها (${ctx.supportTickets.filter(t => t.status === 'open').length})`, callback_data: 'admin_support_list' }, { text: `📊 آمار`, callback_data: 'admin_sales_stats' }],
      [{ text: `✍️ متون ربات`, callback_data: 'admin_texts' }, { text: `⚙️ تنظیمات`, callback_data: 'admin_settings' }],
      [{ text: `💾 بکاپ`, callback_data: 'admin_backup' }, { text: `🌐 پنل وب`, callback_data: 'admin_web_info' }],
      [{ text: `👥 دید مشتری`, callback_data: 'back_to_main' }]
    ]);
    return true;
  }

  // Add Product Flow
  if (data === 'admin_add_product') {
    ctx.userStates.set(ctx.chatId, { mode: 'add_product_name', draft: {} });
    await tgSend(ctx, '➕ <b>افزودن محصول (مرحله ۱ از ۵)</b>\n\nنام محصول را ارسال کنید:', [[{ text: '❌ انصراف', callback_data: 'admin_panel' }]]);
    return true;
  }

  // Products Manager
  if (data === 'admin_products_manager') {
    if (ctx.products.length === 0) {
      await tgSend(ctx, '🧁 محصولی ثبت نشده.', [[{ text: '➕ افزودن', callback_data: 'admin_add_product' }], [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
      return true;
    }
    await tgSend(ctx, `🧁 <b>محصولات (${ctx.products.length}):</b>`);
    for (const p of ctx.products.slice(0, 10)) {
      await tgSend(ctx, `🎂 <b>${p.name}</b>\n▫️ ${p.category} | ${p.price.toLocaleString()} / ${p.unit}\n▫️ ${p.isAvailable ? '🟢 موجود' : '🔴 ناموجود'}`, [
        [{ text: p.isAvailable ? '🔴 ناموجود' : '🟢 موجود', callback_data: `admin_toggle_avail_${p.id}` }, { text: '✏️ قیمت', callback_data: `admin_edit_price_${p.id}` }],
        [{ text: '🗑️ حذف', callback_data: `admin_delete_prod_${p.id}` }],
        [{ text: '⬅️ بازگشت به پنل', callback_data: 'admin_panel' }]
      ], p.image);
    }
    return true;
  }

  // Toggle availability
  if (data.startsWith('admin_toggle_avail_')) {
    const prod = ctx.products.find(p => p.id === data.replace('admin_toggle_avail_', ''));
    if (prod) { prod.isAvailable = !prod.isAvailable; await tgSend(ctx, `${prod.name}: ${prod.isAvailable ? '🟢' : '🔴'}`, [[{ text: '🧁 محصولات', callback_data: 'admin_products_manager' }]]); }
    return true;
  }

  // Edit price prompt
  if (data.startsWith('admin_edit_price_')) {
    const prod = ctx.products.find(p => p.id === data.replace('admin_edit_price_', ''));
    if (prod) {
      ctx.userStates.set(ctx.chatId, { mode: 'edit_price', productId: prod.id });
      await tgSend(ctx, `✏️ <b>${prod.name}</b>\nقیمت فعلی: <b>${prod.price.toLocaleString()}</b>\n\nقیمت جدید را ارسال کنید:`);
    }
    return true;
  }

  // Delete product
  if (data.startsWith('admin_delete_prod_')) {
    const idx = ctx.products.findIndex(p => p.id === data.replace('admin_delete_prod_', ''));
    if (idx !== -1) { const n = ctx.products[idx].name; ctx.products.splice(idx, 1); await tgSend(ctx, `🗑️ <b>${n}</b> حذف شد.`, [[{ text: '🧁 محصولات', callback_data: 'admin_products_manager' }]]); }
    return true;
  }

  // Orders List
  if (data === 'admin_orders_list') {
    if (ctx.orders.length === 0) { await tgSend(ctx, '📦 سفارشی ثبت نشده.', [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]); return true; }
    for (const o of ctx.orders.slice(0, 5)) {
      const items = o.items.map(i => `▫️ ${i.productName} (${i.quantity})`).join('\n');
      const hasReceipt = !!o.paymentReceiptImage;
      const awaitingReceipt = o.status === 'pending_payment' || o.status === 'paid_checking';
      const buttons: any[][] = [
        [{ text: '👩‍🍳 پخت', callback_data: `admin_status_${o.id}_baking` }, { text: '🛵 ارسال', callback_data: `admin_status_${o.id}_shipped` }],
        [{ text: '✅ تحویل', callback_data: `admin_status_${o.id}_delivered` }, { text: '❌ لغو', callback_data: `admin_status_${o.id}_cancelled` }]
      ];
      if (hasReceipt) {
        buttons.push([{ text: '🧾 مشاهده فیش واریزی', callback_data: `admin_receipt_${o.id}` }]);
        if (awaitingReceipt) {
          buttons.push([
            { text: '✅ تایید فیش', callback_data: `admin_rapprove_${o.id}` },
            { text: '❌ رد فیش', callback_data: `admin_rreject_${o.id}` }
          ]);
        }
      }
      const caption = `📋 <b>${o.orderNumber}</b> - ${o.customerName}\n📞 <code>${o.customerPhone}</code>\n${items}\n💰 <b>${o.totalAmount.toLocaleString()}</b>${hasReceipt ? '\n🧾 فیش واریزی ثبت شده' : ''}`;
      buttons.push([{ text: '⬅️ بازگشت به پنل', callback_data: 'admin_panel' }]);
      await tgSend(ctx, caption, buttons);
    }
    return true;
  }

  // View a customer's payment receipt photo (file_id works natively in Telegram)
  if (data.startsWith('admin_receipt_')) {
    const order = ctx.orders.find(o => o.id === data.replace('admin_receipt_', ''));
    if (order && order.paymentReceiptImage) {
      await tgSend(
        ctx,
        `🧾 <b>فیش واریزی سفارش ${order.orderNumber}</b>\n👤 ${order.customerName}\n💰 ${order.totalAmount.toLocaleString()} تومان`,
        [
          [{ text: '✅ تایید فیش', callback_data: `admin_rapprove_${order.id}` }, { text: '❌ رد فیش', callback_data: `admin_rreject_${order.id}` }],
          [{ text: '📦 سفارشات', callback_data: 'admin_orders_list' }]
        ],
        order.paymentReceiptImage
      );
    } else if (order) {
      await tgSend(ctx, '🧾 برای این سفارش فیشی ثبت نشده است.', [[{ text: '📦 سفارشات', callback_data: 'admin_orders_list' }]]);
    }
    return true;
  }

  // Approve payment receipt -> order goes to baking + customer notified
  if (data.startsWith('admin_rapprove_')) {
    const order = ctx.orders.find(o => o.id === data.replace('admin_rapprove_', ''));
    if (order) {
      order.status = 'baking';
      order.updatedAt = new Date().toISOString();
      if (order.customerTelegramId && order.customerTelegramId !== 'guest') {
        try {
          await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: order.customerTelegramId,
              text: `✅ <b>فیش واریزی شما تأیید شد!</b>\n\n🔖 سفارش <code>${order.orderNumber}</code>\n👩‍🍳 سفارش شما وارد مرحله پخت و تزیین شد.`,
              parse_mode: 'HTML'
            })
          });
        } catch (e) {
          console.error('Failed to notify customer about receipt approval:', e);
        }
      }
      await tgSend(ctx, `✅ فیش سفارش <b>${order.orderNumber}</b> تأیید شد و به مشتری اطلاع داده شد.\n👩‍🍳 وضعیت: در حال پخت`, [[{ text: '📦 سفارشات', callback_data: 'admin_orders_list' }], [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
    }
    return true;
  }

  // Reject payment receipt -> order back to pending + customer asked to re-send
  if (data.startsWith('admin_rreject_')) {
    const order = ctx.orders.find(o => o.id === data.replace('admin_rreject_', ''));
    if (order) {
      order.status = 'pending_payment';
      order.updatedAt = new Date().toISOString();
      if (order.customerTelegramId && order.customerTelegramId !== 'guest') {
        try {
          await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: order.customerTelegramId,
              text: `❌ <b>متأسفانه فیش واریزی قابل تأیید نبود.</b>\n\n🔖 سفارش <code>${order.orderNumber}</code>\n📌 وضعیت: در انتظار پرداخت\n\nلطفاً فیش صحیح را دوباره در همین چت ارسال کنید یا با پشتیبانی تماس بگیرید.`,
              parse_mode: 'HTML'
            })
          });
        } catch (e) {
          console.error('Failed to notify customer about receipt rejection:', e);
        }
      }
      await tgSend(ctx, `❌ فیش سفارش <b>${order.orderNumber}</b> رد شد و از مشتری خواسته شد فیش را مجدد ارسال کند.`, [[{ text: '📦 سفارشات', callback_data: 'admin_orders_list' }], [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
    }
    return true;
  }

  // Order status change
  if (data.startsWith('admin_status_')) {
    const parts = data.replace('admin_status_', '').split('_');
    const order = ctx.orders.find(o => o.id === parts[0]);
    if (order) {
      order.status = parts[1] as any; order.updatedAt = new Date().toISOString();
      const labels: any = { baking: '👩‍🍳 پخت', shipped: '🛵 ارسال', delivered: '✅ تحویل', cancelled: '❌ لغو' };
      await tgSend(ctx, `✅ ${order.orderNumber}: <b>${labels[parts[1]] || parts[1]}</b>`, [[{ text: '📦 سفارشات', callback_data: 'admin_orders_list' }], [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
    }
    return true;
  }

  // Custom Orders
  if (data === 'admin_custom_orders') {
    if (ctx.customOrders.length === 0) { await tgSend(ctx, '🎂 سفارش دلخواهی ثبت نشده.', [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]); return true; }
    for (const o of ctx.customOrders.slice(0, 5)) {
      await tgSend(ctx, `🎂 <b>${o.orderNumber}</b> - ${o.customerName}\n▫️ ${o.pastryType}\n▫️ وضعیت: ${o.status}`, [
        [{ text: '💰 قیمت‌گذاری', callback_data: `admin_quote_${o.id}` }, { text: '👨‍🍳 پخت', callback_data: `admin_cstatus_${o.id}_baking` }],
        [{ text: '✅ آماده', callback_data: `admin_cstatus_${o.id}_ready` }, { text: '❌ رد', callback_data: `admin_cstatus_${o.id}_rejected` }],
        [{ text: '⬅️ بازگشت به پنل', callback_data: 'admin_panel' }]
      ]);
    }
    return true;
  }

  // Quote custom order
  if (data.startsWith('admin_quote_')) {
    ctx.userStates.set(ctx.chatId, { mode: 'quote_price', orderId: data.replace('admin_quote_', '') });
    await tgSend(ctx, '💰 مبلغ نهایی سفارش دلخواه را ارسال کنید:', [[{ text: '❌ انصراف', callback_data: 'admin_custom_orders' }]]);
    return true;
  }

  // Custom order status
  if (data.startsWith('admin_cstatus_')) {
    const parts = data.replace('admin_cstatus_', '').split('_');
    const order = ctx.customOrders.find(o => o.id === parts[0]);
    if (order) { order.status = parts[1] as any; order.updatedAt = new Date().toISOString(); await tgSend(ctx, `✅ وضعیت: <b>${parts[1]}</b>`, [[{ text: '🎂 سفارشات دلخواه', callback_data: 'admin_custom_orders' }]]); }
    return true;
  }

  // Discounts
  if (data === 'admin_discounts_list') {
    const btns: any[][] = [[{ text: '➕ افزودن تخفیف', callback_data: 'admin_add_discount' }]];
    for (const d of ctx.discounts) {
      btns.push([{ text: `${d.code} - ${d.type === 'percentage' ? d.value + '٪' : d.value.toLocaleString()} ${d.isActive ? '🟢' : '🔴'}`, callback_data: `admin_toggle_disc_${d.id}` }, { text: '🗑️', callback_data: `admin_del_disc_${d.id}` }]);
    }
    btns.push([{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]);
    await tgSend(ctx, `🎟️ <b>کدهای تخفیف (${ctx.discounts.length}):</b>`, btns);
    return true;
  }

  if (data === 'admin_add_discount') {
    ctx.userStates.set(ctx.chatId, { mode: 'add_discount' });
    await tgSend(ctx, '🎟️ <b>افزودن کد تخفیف</b>\n\nفرمت: <code>CODE 20 percent</code>\nیا: <code>CODE 50000 fixed</code>\n\nمثال: <code>SWEET20 20 percent</code>', [
      [{ text: '❌ انصراف', callback_data: 'admin_discounts_list' }]
    ]);
    return true;
  }

  if (data.startsWith('admin_toggle_disc_')) {
    const d = ctx.discounts.find(x => x.id === data.replace('admin_toggle_disc_', ''));
    if (d) { d.isActive = !d.isActive; await tgSend(ctx, `${d.code}: ${d.isActive ? '🟢 فعال' : '🔴 غیرفعال'}`, [[{ text: '🎟️ تخفیف‌ها', callback_data: 'admin_discounts_list' }]]); }
    return true;
  }

  if (data.startsWith('admin_del_disc_')) {
    const idx = ctx.discounts.findIndex(x => x.id === data.replace('admin_del_disc_', ''));
    if (idx !== -1) { ctx.discounts.splice(idx, 1); await tgSend(ctx, '🗑️ حذف شد.', [[{ text: '🎟️ تخفیف‌ها', callback_data: 'admin_discounts_list' }]]); }
    return true;
  }

  // Customers
  if (data === 'admin_customers_manager') {
    if (ctx.customers.length === 0) { await tgSend(ctx, '👥 مشتری‌ای ثبت نشده.', [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]); return true; }
    let text = `👥 <b>مشتریان (${ctx.customers.length}):</b>\n\n`;
    for (const c of ctx.customers.slice(0, 15)) {
      text += `👤 <b>${c.name}</b>\n📞 <code>${c.phone || '---'}</code> | @${c.username || '---'}\n💳 ${(c.walletBalance || 0).toLocaleString()} | ${c.totalOrdersCount} سفارش | ${c.tier}\n\n`;
    }
    await tgSend(ctx, text, [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
    return true;
  }

  // Support Tickets
  if (data === 'admin_support_list') {
    const open = ctx.supportTickets.filter(t => t.status === 'open');
    if (open.length === 0) { await tgSend(ctx, '💬 تیکت بازی وجود ندارد.', [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]); return true; }
    for (const t of open.slice(0, 5)) {
      await tgSend(ctx, `💬 <b>${t.ticketNumber}</b> - ${t.customerName}\n▫️ ${t.subject}\n<i>${t.message?.slice(0, 100) || ''}</i>`, [
        [{ text: '✅ پاسخ داده شد', callback_data: `admin_close_ticket_${t.id}` }]
      ]);
    }
    return true;
  }

  if (data.startsWith('admin_close_ticket_')) {
    const t = ctx.supportTickets.find(x => x.id === data.replace('admin_close_ticket_', ''));
    if (t) { t.status = 'answered'; t.updatedAt = new Date().toISOString(); await tgSend(ctx, '✅ تیکت بسته شد.', [[{ text: '💬 تیکت‌ها', callback_data: 'admin_support_list' }]]); }
    return true;
  }

  // Stats
  if (data === 'admin_sales_stats') {
    const revenue = ctx.orders.reduce((s, o) => s + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
    const today = ctx.orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
    await tgSend(ctx, `📊 <b>آمار فروش:</b>\n\n💰 مجموع فروش: <b>${revenue.toLocaleString()}</b>\n📦 کل سفارشات: <b>${ctx.orders.length}</b>\n📅 امروز: <b>${today.length}</b> سفارش\n🧁 محصولات: <b>${ctx.products.filter(p => p.isAvailable).length}</b> فعال\n👥 مشتریان: <b>${ctx.customers.length}</b>\n🎂 سفارش دلخواه: <b>${ctx.customOrders.length}</b>`, [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
    return true;
  }

  // Settings
  if (data === 'admin_settings') {
    const s = ctx.botSettings;
    await tgSend(ctx, `⚙️ <b>تنظیمات:</b>\n\n🏢 فروشگاه: ${s.storeName || '❌ تنظیم نشده'}\n📞 تلفن: ${s.storePhone || '❌'}\n🏠 آدرس: ${s.storeAddress || '❌'}\n💳 کارت: ${s.cardNumber ? '<code>' + s.cardNumber + '</code>' : '❌'}\n👤 صاحب: ${s.cardHolder || '❌'}\n🛵 پیک: ${s.shippingFee ? s.shippingFee.toLocaleString() : '0'} تومان\n🎁 ارسال رایگان: ${s.freeShippingThreshold ? s.freeShippingThreshold.toLocaleString() : '0'} تومان`, [
      [{ text: '✏️ ویرایش فروشگاه', callback_data: 'admin_edit_store' }],
      [{ text: '✏️ ویرایش کارت', callback_data: 'admin_edit_card' }],
      [{ text: '✏️ ویرایش ارسال', callback_data: 'admin_edit_shipping' }],
      [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]
    ]);
    return true;
  }

  if (data === 'admin_edit_store') {
    ctx.userStates.set(ctx.chatId, { mode: 'edit_store_name' });
    await tgSend(ctx, `✏️ <b>نام فروشگاه:</b>\nفعلی: ${ctx.botSettings.storeName || '---'}\n\nنام جدید را ارسال کنید:`, [[{ text: '❌ انصراف', callback_data: 'admin_settings' }]]);
    return true;
  }

  if (data === 'admin_edit_card') {
    ctx.userStates.set(ctx.chatId, { mode: 'edit_card_number' });
    await tgSend(ctx, `✏️ <b>شماره کارت:</b>\nفعلی: ${ctx.botSettings.cardNumber || '---'}\n\nشماره جدید را ارسال کنید:`, [[{ text: '❌ انصراف', callback_data: 'admin_settings' }]]);
    return true;
  }

  if (data === 'admin_edit_shipping') {
    ctx.userStates.set(ctx.chatId, { mode: 'edit_shipping_fee' });
    await tgSend(ctx, `✏️ <b>هزینه پیک:</b>\nفعلی: ${ctx.botSettings.shippingFee || 0}\n\nمبلغ جدید (عدد):`, [[{ text: '❌ انصراف', callback_data: 'admin_settings' }]]);
    return true;
  }

  // Texts customization
  if (data === 'admin_texts') {
    await tgSend(ctx, `✍️ <b>شخصی‌سازی متون ربات:</b>\n\nپیام خوش‌آمد: ${ctx.botSettings.welcomeMessage ? '✅' : '❌'}\nپیام راهنما: ${ctx.botSettings.helpMessage ? '✅' : '❌'}\nپیام سفارش موفق: ${ctx.botSettings.orderSuccessMessage ? '✅' : '❌'}`, [
      [{ text: '✏️ پیام خوش‌آمد', callback_data: 'admin_edit_welcome' }],
      [{ text: '✏️ پیام راهنما', callback_data: 'admin_edit_help' }],
      [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]
    ]);
    return true;
  }

  if (data === 'admin_edit_welcome') {
    ctx.userStates.set(ctx.chatId, { mode: 'edit_welcome' });
    await tgSend(ctx, '✏️ پیام خوش‌آمد جدید را ارسال کنید:', [[{ text: '❌ انصراف', callback_data: 'admin_texts' }]]);
    return true;
  }

  if (data === 'admin_edit_help') {
    ctx.userStates.set(ctx.chatId, { mode: 'edit_help' });
    await tgSend(ctx, '✏️ پیام راهنما جدید را ارسال کنید:', [[{ text: '❌ انصراف', callback_data: 'admin_texts' }]]);
    return true;
  }

  // Backup
  if (data === 'admin_backup') {
    await tgSend(ctx, '💾 <b>بکاپ و بازیابی:</b>\n\nبرای دانلود بکاپ کامل به پنل تحت وب مراجعه کنید.', [
      [{ text: '🌐 ورود به پنل وب', callback_data: 'admin_web_info' }],
      [{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]
    ]);
    return true;
  }

  // Broadcast message to all customers
  if (data === 'admin_broadcast') {
    ctx.userStates.set(ctx.chatId, { mode: 'admin_broadcast_input' });
    await tgSend(ctx, '📢 <b>ارسال پیام گروهی به مشتریان:</b>\n\nلطفاً پیام مورد نظر را ارسال کنید:', [[{ text: '❌ انصراف', callback_data: 'admin_panel' }]]);
    return true;
  }

  return false;
}

// ============ TEXT MESSAGE HANDLERS (STATE MACHINE) ============

export async function handleTextMessage(ctx: TelegramContext, text: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (!state) return false;

  // Add product flow
  if (state.mode === 'add_product_name') {
    state.draft = { name: text }; state.mode = 'add_product_category';
    ctx.userStates.set(ctx.chatId, state);
    const cats = ['کیک و پای', 'شیرینی تر و خامه‌ای', 'شیرینی خشک و سنتی', 'دسر و باقلوا', 'کوکی و بیسکوئیت', 'نان و کروسان'];
    await tgSend(ctx, `نام: <b>${text}</b>\n\nمرحله ۲: دسته‌بندی را انتخاب کنید:`, cats.map(c => [{ text: c, callback_data: `admin_cat_${c}` }]));
    return true;
  }

  if (state.mode === 'add_product_price') {
    const price = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(price)) { await tgSend(ctx, '❌ فقط عدد وارد کنید:'); return true; }
    state.draft.price = price; state.mode = 'add_product_image';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `قیمت: <b>${price.toLocaleString()}</b>\n\nمرحله ۴: لینک عکس محصول را ارسال کنید\n(یا بنویسید «بدون عکس»):`);
    return true;
  }

  if (state.mode === 'add_product_image') {
    state.draft.image = text.startsWith('http') ? text : 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700&auto=format&fit=crop&q=80';
    state.mode = 'add_product_desc';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, 'مرحله ۵: توضیحات محصول (یا «عالی»):');
    return true;
  }

  if (state.mode === 'add_product_desc') {
    const draft = state.draft;
    const newProd = { id: `prod-${Date.now()}`, productCode: Math.floor(1000000 + Math.random() * 9000000).toString(), name: draft.name, category: draft.category, price: draft.price, unit: 'کیلوگرم', image: draft.image, description: text === 'عالی' ? '' : text, isAvailable: true, preparationTimeHours: 2, stockKgOrCount: 20, createdAt: new Date().toISOString() };
    ctx.products.unshift(newProd);
    ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, `🎉 <b>${newProd.name}</b> اضافه شد!\n💰 ${newProd.price.toLocaleString()} / ${newProd.unit}`, [[{ text: '🧁 محصولات', callback_data: 'admin_products_manager' }], [{ text: '➕ محصول دیگر', callback_data: 'admin_add_product' }]], newProd.image);
    return true;
  }

  // Edit price
  if (state.mode === 'edit_price') {
    const price = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(price)) { await tgSend(ctx, '❌ فقط عدد:'); return true; }
    const prod = ctx.products.find(p => p.id === state.productId);
    if (prod) { prod.price = price; await tgSend(ctx, `✅ ${prod.name}: <b>${price.toLocaleString()}</b>`, [[{ text: '🧁 محصولات', callback_data: 'admin_products_manager' }]]); }
    ctx.userStates.delete(ctx.chatId);
    return true;
  }

  // Add discount
  if (state.mode === 'add_discount') {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 3) { await tgSend(ctx, '❌ فرمت: <code>CODE 20 percent</code> یا <code>CODE 50000 fixed</code>'); return true; }
    const code = parts[0].toUpperCase();
    const value = parseInt(parts[1]);
    const type = parts[2] === 'fixed' ? 'fixed' : 'percentage';
    ctx.discounts.unshift({ id: `disc-${Date.now()}`, code, type, value, isActive: true, usedCount: 0, createdAt: new Date().toISOString(), description: '' });
    ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, `🎉 کد <code>${code}</code> (${type === 'percentage' ? value + '٪' : value.toLocaleString()}) اضافه شد!`, [[{ text: '🎟️ تخفیف‌ها', callback_data: 'admin_discounts_list' }]]);
    return true;
  }

  // Edit settings
  if (state.mode === 'edit_store_name') {
    ctx.botSettings.storeName = text; ctx.userStates.set(ctx.chatId, { mode: 'edit_store_phone' });
    await tgSend(ctx, `✅ نام: <b>${text}</b>\n\nحالا <b>شماره تلفن</b> فروشگاه:`);
    return true;
  }
  if (state.mode === 'edit_store_phone') {
    ctx.botSettings.storePhone = text; ctx.userStates.set(ctx.chatId, { mode: 'edit_store_address' });
    await tgSend(ctx, `✅ تلفن ثبت شد.\n\nحالا <b>آدرس</b> فروشگاه:`);
    return true;
  }
  if (state.mode === 'edit_store_address') {
    ctx.botSettings.storeAddress = text; ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '✅ آدرس ثبت شد!', [[{ text: '⚙️ تنظیمات', callback_data: 'admin_settings' }]]);
    return true;
  }
  if (state.mode === 'edit_card_number') {
    ctx.botSettings.cardNumber = text; ctx.userStates.set(ctx.chatId, { mode: 'edit_card_holder' });
    await tgSend(ctx, `✅ کارت ثبت شد.\n\nحالا <b>نام صاحب حساب</b>:`);
    return true;
  }
  if (state.mode === 'edit_card_holder') {
    ctx.botSettings.cardHolder = text; ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '✅ ثبت شد!', [[{ text: '⚙️ تنظیمات', callback_data: 'admin_settings' }]]);
    return true;
  }
  if (state.mode === 'edit_shipping_fee') {
    const fee = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(fee)) { await tgSend(ctx, '❌ فقط عدد:'); return true; }
    ctx.botSettings.shippingFee = fee; ctx.userStates.set(ctx.chatId, { mode: 'edit_free_threshold' });
    await tgSend(ctx, `✅ پیک: <b>${fee.toLocaleString()}</b>\n\nحالا <b>سقف ارسال رایگان</b> (عدد):`);
    return true;
  }
  if (state.mode === 'edit_free_threshold') {
    const t = parseInt(text.replace(/[^0-9]/g, ''));
    ctx.botSettings.freeShippingThreshold = isNaN(t) ? 0 : t; ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '✅ ثبت شد!', [[{ text: '⚙️ تنظیمات', callback_data: 'admin_settings' }]]);
    return true;
  }

  // Edit texts
  if (state.mode === 'ask_quantity') {
    const qty = parseFloat(text);
    if (isNaN(qty) || qty <= 0) {
      await tgSend(ctx, '❌ لطفاً یک عدد معتبر وارد کنید (مثلاً: 2)');
      return true;
    }
    const prod = ctx.products.find(p => p.id === state.productId);
    if (prod) {
      const cart = ctx.userCarts.get(ctx.chatId) || [];
      const existing = cart.find(i => i.productId === prod.id);
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.push({ productId: prod.id, quantity: qty });
      }
      ctx.userCarts.set(ctx.chatId, cart);
      const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
      ctx.userStates.delete(ctx.chatId);
      await tgSend(ctx, `✅ <b>${qty} ${prod.unit}</b> از «${prod.name}» به سبد خرید افزوده شد.\n\n🛒 <b>تعداد کل اقلام سبد:</b> ${totalQty}`, [
        [{ text: '🛒 مشاهده سبد خرید', callback_data: 'view_cart' }],
        [{ text: '🍰 ادامه خرید', callback_data: 'menu_categories' }]
      ]);
    }
    return true;
  }

  if (state.mode === 'edit_welcome') {
    ctx.botSettings.welcomeMessage = text; ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '✅ پیام خوش‌آمد ذخیره شد!', [[{ text: '✍️ متون', callback_data: 'admin_texts' }]]);
    return true;
  }
  if (state.mode === 'edit_help') {
    ctx.botSettings.helpMessage = text; ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '✅ پیام راهنما ذخیره شد!', [[{ text: '✍️ متون', callback_data: 'admin_texts' }]]);
    return true;
  }

  // Quote custom order
  if (state.mode === 'quote_price') {
    const price = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(price)) { await tgSend(ctx, '❌ فقط عدد:'); return true; }
    const order = ctx.customOrders.find(o => o.id === state.orderId);
    if (order) { order.finalPrice = price; order.prepaymentAmount = Math.round(price * 0.4); order.status = 'price_quoted'; await tgSend(ctx, `✅ قیمت: <b>${price.toLocaleString()}</b>\nبیعانه: <b>${order.prepaymentAmount.toLocaleString()}</b>`, [[{ text: '🎂 سفارشات', callback_data: 'admin_custom_orders' }]]); }
    ctx.userStates.delete(ctx.chatId);
    return true;
  }

  // Broadcast message (admin)
  if (state.mode === 'admin_broadcast_input') {
    ctx.userStates.delete(ctx.chatId);
    let sent = 0;
    const targets = new Set<string>([...ctx.customers.map(c => c.telegramId)].filter(Boolean) as string[]);
    for (const targetId of targets) {
      if (targetId === 'guest') continue;
      try {
        await fetch(`https://api.telegram.org/bot${ctx.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: targetId, text, parse_mode: 'HTML' })
        });
        sent++;
      } catch (e) {
        console.error(`Broadcast to ${targetId} failed:`, e);
      }
    }
    await tgSend(ctx, `✅ پیام گروهی برای <b>${sent}</b> مشتری ارسال شد.`, [[{ text: '👨‍🍳 ادمین', callback_data: 'admin_panel' }]]);
    return true;
  }

  // Support message
  if (state.mode === 'support_message') {
    ctx.supportTickets.unshift({ id: `tkt-${Date.now()}`, ticketNumber: `TK-${Math.floor(1000 + Math.random() * 9000)}`, customerName: 'مشتری ربات', customerTelegramId: ctx.chatId, customerUsername: '', customerPhone: '', category: 'general', subject: 'پیام از ربات', message: text, status: 'open', priority: 'normal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), replies: [{ id: `rep-${Date.now()}`, sender: 'customer', senderName: 'مشتری', text, createdAt: new Date().toISOString() }] });
    ctx.userStates.delete(ctx.chatId);
    await tgSend(ctx, '✅ پیام شما ثبت شد. پشتیبانی به زودی پاسخ می‌دهد.', [[{ text: '🔙 منوی اصلی', callback_data: 'back_to_main' }]]);
    return true;
  }

  return false;
}

// Handle admin category selection for add product
export async function handleAdminCatSelect(ctx: TelegramContext, category: string): Promise<boolean> {
  const state = ctx.userStates.get(ctx.chatId);
  if (state?.mode === 'add_product_category') {
    state.draft.category = category; state.mode = 'add_product_price';
    ctx.userStates.set(ctx.chatId, state);
    await tgSend(ctx, `دسته: <b>${category}</b>\n\nمرحله ۳: <b>قیمت</b> (عدد):`);
    return true;
  }
  return false;
}
