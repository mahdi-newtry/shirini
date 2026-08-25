import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_BOT_SETTINGS, 
  INITIAL_ORDERS, 
  INITIAL_DISCOUNT_CODES, 
  INITIAL_SUPPORT_TICKETS,
  INITIAL_CUSTOMERS,
  INITIAL_WALLET_TRANSACTIONS,
  INITIAL_BACKUP_SCHEDULE,
  INITIAL_BACKUP_SNAPSHOTS,
  INITIAL_CUSTOM_ORDERS
} from './src/data/initialData';
import { 
  Product, 
  Order, 
  OrderStatus,
  BotSettings, 
  DiscountCode, 
  SupportTicket, 
  CustomerUser, 
  WalletTransaction, 
  BackupScheduleConfig, 
  BackupSnapshot, 
  MasterBackupPayload,
  BackupSnapshotStats,
  CustomPastryOrder
} from './src/types';
import { handleCustomerCallback, handleAdminCallback, handleTextMessage, handleAdminCatSelect } from './src/telegramHandlers';
import { loadSettings, saveSettings } from './src/persistSettings';
import { PersistentMap } from './src/persistStates';
import { startCheckout, handleCheckoutState, handleCheckoutCallback } from './src/checkoutFlow';
import { loadData, saveData, PersistedData } from './src/persistData';

// In-memory data store with complete seed
let products: Product[] = [...INITIAL_PRODUCTS];
let orders: Order[] = [...INITIAL_ORDERS];
let discounts: DiscountCode[] = [...INITIAL_DISCOUNT_CODES];
let botSettings: BotSettings = { ...INITIAL_BOT_SETTINGS };
// Load persisted settings if available
const persistedSettings = loadSettings();
if (persistedSettings) {
  botSettings = { ...botSettings, ...persistedSettings };
  console.log("Loaded persisted bot settings");
}
let supportTickets: SupportTicket[] = [...INITIAL_SUPPORT_TICKETS];
let customers: CustomerUser[] = [...INITIAL_CUSTOMERS];
let walletTransactions: WalletTransaction[] = [...INITIAL_WALLET_TRANSACTIONS];
let backupSchedule: BackupScheduleConfig = { ...INITIAL_BACKUP_SCHEDULE };
let backupSnapshots: BackupSnapshot[] = [...INITIAL_BACKUP_SNAPSHOTS];
let customOrders: CustomPastryOrder[] = [...INITIAL_CUSTOM_ORDERS];

// Load persisted data if available
const persistedData = loadData();
if (persistedData) {
  products = persistedData.products || products;
  orders = persistedData.orders || orders;
  customOrders = persistedData.customOrders || customOrders;
  discounts = persistedData.discounts || discounts;
  supportTickets = persistedData.supportTickets || supportTickets;
  customers = persistedData.customers || customers;
  walletTransactions = persistedData.walletTransactions || walletTransactions;
  backupSnapshots = persistedData.backupSnapshots || backupSnapshots;
  backupSchedule = persistedData.backupSchedule || backupSchedule;
  console.log("Loaded persisted data");
}

// Helper to save all data
function saveAllData() {
  saveData({
    products,
    orders,
    customOrders,
    discounts,
    supportTickets,
    customers,
    walletTransactions,
    backupSnapshots,
    backupSchedule
  });
}

// Polling controller for Live Telegram Bot
let isPolling = false;
let pollingOffset = 0;
let pollingInterval: NodeJS.Timeout | null = null;
const registeredTelegramChatIds = new Set<string>();

// Per-user cart sessions (chatId -> cart items)
interface CartItem { productId: string; quantity: number; }
const userCarts = new PersistentMap<CartItem[]>("userCarts.json");
// Per-user state machine (for multi-step flows)
const userStates = new PersistentMap<any>("userStates.json");

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get all products
  app.get('/api/products', (req: Request, res: Response) => {
    res.json(products);
  });

  // Add new product
  // Image upload endpoint
  app.post('/api/upload-image', express.raw({ type: 'image/*', limit: '10mb' }), (req: Request, res: Response) => {
    try {
      const imageData = req.body as Buffer;
      const imageId = Date.now() + '-' + Math.random().toString(36).substring(7);
      const mimeType = req.headers['content-type'] || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = `${imageId}.${ext}`;
      
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const filepath = path.join(dataDir, filename);
      
      // Save to local data folder
      fs.writeFileSync(filepath, imageData);
      
      // Return real URL
      const protocol = req.protocol || 'https';
      const host = req.get('host') || req.headers.host;
      const imageUrl = `${protocol}://${host}/data/${filename}`;
      
      res.json({ success: true, url: imageUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve uploaded images
  app.use('/data', express.static('/app/data'));
  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const productCode = Math.floor(1000000 + Math.random() * 9000000).toString();
      const newProduct: Product = {
        ...req.body,
        productCode: req.body.productCode || productCode,
        id: req.body.id || `prod-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      products.unshift(newProduct);

      // Trigger live notification to products topic
      sendToTelegramTopic(
        'products',
        `🧁 <b>محصول جدید به ویترین اضافه شد!</b>\n\n🎂 <b>نام:</b> ${newProduct.name}\n📂 <b>دسته‌بندی:</b> ${newProduct.category}\n💰 <b>قیمت:</b> ${newProduct.price.toLocaleString('fa-IR')} تومان / ${newProduct.unit}\n✨ <b>وضعیت:</b> ${newProduct.isAvailable ? 'موجود و آماده سفارش' : 'ناموجود'}`,
        newProduct.image
      );

      res.status(201).json(newProduct);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update product (price, photo, availability, etc.)
  app.put('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const oldPrice = products[index].price;
    const oldAvailable = products[index].isAvailable;
    products[index] = { ...products[index], ...req.body };

    if (req.body.price && req.body.price !== oldPrice) {
      sendToTelegramTopic(
        'products',
        `💰 <b>تغییر قیمت محصول:</b>\n\n🧁 <b>${products[index].name}</b>\n🔹 قیمت قبلی: ${oldPrice.toLocaleString('fa-IR')} تومان\n🔸 <b>قیمت جدید:</b> ${products[index].price.toLocaleString('fa-IR')} تومان`
      );
    } else if (req.body.isAvailable !== undefined && req.body.isAvailable !== oldAvailable) {
      sendToTelegramTopic(
        'products',
        `📦 <b>تغییر موجودی انبار:</b>\n\n🧁 <b>${products[index].name}</b>\nوضعیت جدید: <b>${products[index].isAvailable ? '✅ موجود شد' : '❌ ناموجود شد'}</b>`
      );
    }

    res.json(products[index]);
  });

  // Delete product
  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = products.find(p => p.id === id);
    products = products.filter((p) => p.id !== id);
    if (deleted) {
      sendToTelegramTopic(
        'products',
        `🗑 <b>حذف محصول از کاتالوگ:</b>\n\nمحصول «${deleted.name}» از سیستم حذف گردید.`
      );
    }
    res.json({ success: true });
  });

  // Get orders
  app.get('/api/orders', (req: Request, res: Response) => {
    res.json(orders);
  });

  // Create new order
  app.post('/api/orders', (req: Request, res: Response) => {
    const newOrder: Order = {
      ...req.body,
      id: req.body.id || `ord-${Date.now()}`,
      orderNumber: req.body.orderNumber || `SH-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    orders.unshift(newOrder);

    // If order used a coupon code, increment usedCount
    if (newOrder.couponCode) {
      const foundIndex = discounts.findIndex(
        d => d.code.trim().toUpperCase() === newOrder.couponCode?.trim().toUpperCase()
      );
      if (foundIndex !== -1) {
        discounts[foundIndex].usedCount = (discounts[foundIndex].usedCount || 0) + 1;
      }
    }

    // Trigger notification to orders topic
    const orderItemsSummary = newOrder.items.map(i => `▫️ ${i.productName} (${i.quantity} ${i.unit})`).join('\n');
    sendToTelegramTopic(
      'orders',
      `🎉 <b>سفارش جدید ثبت شد!</b>\n\n🔖 <b>کد رهگیری:</b> <code>${newOrder.orderNumber}</code>\n👤 <b>خریدار:</b> ${newOrder.customerName}\n📞 <b>تلفن:</b> <code>${newOrder.customerPhone}</code>\n🏠 <b>آدرس:</b> ${newOrder.customerAddress}\n\n📋 <b>اقلام سفارش:</b>\n${orderItemsSummary}\n\n💰 <b>مبلغ کل:</b> ${newOrder.totalAmount.toLocaleString('fa-IR')} تومان\n🛵 <b>وضعیت:</b> در انتظار تایید فیش و آماده‌سازی`
    );

    if (newOrder.discountAmount && newOrder.discountAmount > 0) {
      sendToTelegramTopic(
        'discounts',
        `🎟️ <b>استفاده از کد تخفیف:</b>\n\n🔖 کد تخفیف <code>${newOrder.couponCode || '---'}</code> توسط ${newOrder.customerName} در سفارش <code>${newOrder.orderNumber}</code> استفاده شد.\n💰 مبلغ کسر شده: ${newOrder.discountAmount.toLocaleString('fa-IR')} تومان`
      );
    }

    sendToTelegramTopic(
      'finance',
      `💳 <b>فیش بانکی واریزی جدید:</b>\n\n🔖 سفارش <code>${newOrder.orderNumber}</code> به مبلغ <b>${newOrder.totalAmount.toLocaleString('fa-IR')} تومان</b> توسط ${newOrder.customerName} واریز گردید.`
    );

    res.status(201).json(newOrder);
  });

  // Update order status
  app.put('/api/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const previousStatus = orders[index].status;
    orders[index] = {
      ...orders[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    if (req.body.status && req.body.status !== previousStatus) {
      const statusLabels: Record<string, string> = {
        pending_payment: 'در انتظار پرداخت',
        paid_checking: 'در حال بررسی فیش و پرداخت',
        baking: 'در حال پخت و آماده‌سازی در قنادی',
        shipped: 'تحویل به پیک و در حال ارسال',
        delivered: 'تحویل داده شده به مشتری',
        cancelled: 'لغو شده'
      };
      sendToTelegramTopic(
        'orders',
        `🔄 <b>تغییر وضعیت سفارش ${orders[index].orderNumber}:</b>\n\nوضعیت به «<b>${statusLabels[req.body.status] || req.body.status}</b>» تغییر یافت.\n👤 مشتری: ${orders[index].customerName}`
      );
    }

    res.json(orders[index]);
  });

  // Approve or reject a customer's payment receipt (admin decision from panel)
  // approved=true  -> payment verified, order goes to baking + customer notified
  // approved=false -> order back to pending_payment, customer asked to re-send receipt
  app.post('/api/orders/:id/receipt-decision', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approved } = req.body;
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orders[index];
    const newStatus: OrderStatus = approved ? 'baking' : 'pending_payment';
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    saveAllData();

    // Notify the customer directly in Telegram
    if (botSettings.telegramBotToken && order.customerTelegramId && order.customerTelegramId !== 'guest') {
      try {
        const text = approved
          ? `✅ <b>فیش واریزی شما تأیید شد!</b>\n\n🔖 سفارش <code>${order.orderNumber}</code>\n👩‍🍳 سفارش شما وارد مرحله پخت و تزیین شد.`
          : `❌ <b>متأسفانه فیش واریزی قابل تأیید نبود.</b>\n\n🔖 سفارش <code>${order.orderNumber}</code>\n📌 وضعیت سفارش: در انتظار پرداخت\n\nلطفاً فیش صحیح را دوباره در همین چت ارسال کنید یا با پشتیبانی تماس بگیرید.`;
        await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.customerTelegramId,
            text,
            parse_mode: 'HTML'
          })
        });
      } catch (err) {
        console.error('Failed to notify customer about receipt decision:', err);
      }
    }

    sendToTelegramTopic(
      'finance',
      approved
        ? `✅ <b>فیش واریزی سفارش ${order.orderNumber} تأیید شد:</b>\n\n👤 مشتری: ${order.customerName}\n💰 مبلغ: <b>${order.totalAmount.toLocaleString('fa-IR')} تومان</b>\n👩‍🍳 وضعیت سفارش: در حال پخت و آماده‌سازی`
        : `❌ <b>فیش واریزی سفارش ${order.orderNumber} رد شد:</b>\n\n👤 مشتری: ${order.customerName}\n💰 مبلغ: ${order.totalAmount.toLocaleString('fa-IR')} تومان\n📌 سفارش به «در انتظار پرداخت» بازگشت و از مشتری خواسته شد فیش را مجدد ارسال کند.`
    );

    res.json(order);
  });

  // Proxy a Telegram file (e.g. payment receipt photo) so the web panel can
  // display images that were sent to the bot (Telegram file_ids are not URLs)
  app.get('/api/telegram/file/:fileId', async (req: Request, res: Response) => {
    const token = process.env.TELEGRAM_BOT_TOKEN || botSettings.telegramBotToken;
    const fileId = req.params.fileId;
    if (!token) {
      res.status(404).json({ error: 'Telegram bot token is not configured' });
      return;
    }
    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
      const info = (await infoRes.json()) as any;
      if (!info.ok || !info.result?.file_path) {
        res.status(404).json({ error: info.description || 'File not found on Telegram' });
        return;
      }
      const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`);
      if (!fileRes.ok) {
        res.status(404).json({ error: 'Failed to download file from Telegram' });
        return;
      }
      res.setHeader('Content-Type', fileRes.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      res.send(buffer);
    } catch (err: any) {
      console.error('Telegram file proxy error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Discount Codes API ---

  // Get all discount codes
  app.get('/api/discounts', (req: Request, res: Response) => {
    res.json(discounts);
  });

  // Create new discount code
  app.post('/api/discounts', (req: Request, res: Response) => {
    try {
      const codeUpper = (req.body.code || '').trim().toUpperCase();
      if (!codeUpper) {
        res.status(400).json({ error: 'کد تخفیف الزامی است' });
        return;
      }

      // Check duplicate
      const exists = discounts.some(d => d.code.trim().toUpperCase() === codeUpper);
      if (exists) {
        res.status(400).json({ error: 'این کد تخفیف قبلاً تعریف شده است' });
        return;
      }

      const newDiscount: DiscountCode = {
        id: req.body.id || `disc-${Date.now()}`,
        code: codeUpper,
        type: req.body.type || 'percentage',
        value: Number(req.body.value) || 0,
        minPurchaseAmount: req.body.minPurchaseAmount ? Number(req.body.minPurchaseAmount) : undefined,
        maxDiscountAmount: req.body.maxDiscountAmount ? Number(req.body.maxDiscountAmount) : undefined,
        usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : undefined,
        usedCount: req.body.usedCount || 0,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
        expiresAt: req.body.expiresAt || undefined,
        applicableProductIds: Array.isArray(req.body.applicableProductIds) ? req.body.applicableProductIds : [],
        description: req.body.description || '',
        createdAt: new Date().toISOString()
      };

      discounts.unshift(newDiscount);
      res.status(201).json(newDiscount);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update discount code
  app.put('/api/discounts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = discounts.findIndex(d => d.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'کد تخفیف یافت نشد' });
      return;
    }

    if (req.body.code) {
      req.body.code = req.body.code.trim().toUpperCase();
    }

    discounts[index] = {
      ...discounts[index],
      ...req.body
    };
    res.json(discounts[index]);
  });

  // Delete discount code
  app.delete('/api/discounts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    discounts = discounts.filter(d => d.id !== id);
    res.json({ success: true });
  });

  // Validate discount code against a subtotal
  app.post('/api/discounts/validate', (req: Request, res: Response) => {
    const { code, subtotal, items } = req.body;
    if (!code) {
      res.status(400).json({ valid: false, message: 'لطفاً کد تخفیف را وارد کنید' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const discount = discounts.find(d => d.code.trim().toUpperCase() === cleanCode);

    if (!discount) {
      res.status(404).json({ valid: false, message: 'کد تخفیف وارد شده معتبر نمی‌باشد.' });
      return;
    }

    if (!discount.isActive) {
      res.status(400).json({ valid: false, message: 'این کد تخفیف در حال حاضر غیرفعال است.' });
      return;
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      res.status(400).json({ valid: false, message: 'سقف استفاده از این کد تخفیف به پایان رسیده است.' });
      return;
    }

    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      res.status(400).json({ valid: false, message: 'مهلت استفاده از این کد تخفیف منقضی شده است.' });
      return;
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (discount.minPurchaseAmount && orderSubtotal < discount.minPurchaseAmount) {
      res.status(400).json({
        valid: false,
        message: `این کد تخفیف برای خریدهای بالای ${discount.minPurchaseAmount.toLocaleString('fa-IR')} تومان قابل استفاده است.`
      });
      return;
    }

    // If the code only applies to specific products, restrict the discount to those items
    const applicable = discount.applicableProductIds || [];
    let baseAmount = orderSubtotal;
    if (applicable.length > 0) {
      const cartItems: Array<{ productId: string; quantity: number }> = Array.isArray(items) ? items : [];
      if (cartItems.length === 0) {
        res.status(400).json({ valid: false, message: 'این کد تخفیف فقط برای محصولات خاصی قابل استفاده است که در سبد شما وجود ندارد.' });
        return;
      }
      baseAmount = cartItems.reduce((sum: number, it: { productId: string; quantity: number }) => {
        if (!applicable.includes(it.productId)) return sum;
        const p = products.find(pr => pr.id === it.productId);
        if (!p) return sum;
        const eff = p.discountPercent ? p.price * (100 - p.discountPercent) / 100 : p.price;
        return sum + eff * (it.quantity || 1);
      }, 0);
      if (baseAmount <= 0) {
        res.status(400).json({ valid: false, message: 'این کد تخفیف فقط برای محصولات خاصی قابل استفاده است که در سبد شما وجود ندارد.' });
        return;
      }
    }

    // Calculate discount amount
    let calculatedDiscount = 0;
    if (discount.type === 'percentage') {
      calculatedDiscount = Math.round((baseAmount * discount.value) / 100);
      if (discount.maxDiscountAmount && calculatedDiscount > discount.maxDiscountAmount) {
        calculatedDiscount = discount.maxDiscountAmount;
      }
    } else {
      // Fixed amount
      calculatedDiscount = Math.min(discount.value, baseAmount);
    }

    res.json({
      valid: true,
      discount,
      discountAmount: calculatedDiscount,
      message: discount.type === 'percentage'
        ? `کد تخفیف ${discount.value}٪ با موفقیت اعمال شد!`
        : `تخفیف ${discount.value.toLocaleString('fa-IR')} تومانی با موفقیت اعمال شد!`
    });
  });

  // Get bot settings
  app.get('/api/settings', (req: Request, res: Response) => {
    res.json(botSettings);
  });

  // Update bot settings
  app.put('/api/settings', async (req: Request, res: Response) => {
    botSettings = { ...botSettings, ...req.body };
    
    // Persist settings to file
    saveSettings(botSettings);

    // If token from env, always keep polling alive
    const envToken = process.env.TELEGRAM_BOT_TOKEN;
    if (envToken) {
      if (!isPolling) startTelegramPolling(envToken);
    } else if (botSettings.telegramBotToken && botSettings.isLiveBotActive) {
      startTelegramPolling(botSettings.telegramBotToken);
    }

    res.json(botSettings);
  });

  // --- Support Tickets API ---

  // Get all support tickets
  app.get('/api/support/tickets', (req: Request, res: Response) => {
    res.json(supportTickets);
  });

  // Create new support ticket
  app.post('/api/support/tickets', (req: Request, res: Response) => {
    try {
      const newTicket: SupportTicket = {
        id: req.body.id || `tkt-${Date.now()}`,
        ticketNumber: req.body.ticketNumber || `TK-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: req.body.customerName || 'مشتری قنادی',
        customerTelegramId: req.body.customerTelegramId || 'guest',
        customerUsername: req.body.customerUsername || '',
        customerPhone: req.body.customerPhone || '',
        category: req.body.category || 'general',
        subject: req.body.subject || 'پیام پشتیبانی',
        message: req.body.message || '',
        status: req.body.status || 'open',
        priority: req.body.priority || 'normal',
        orderNumber: req.body.orderNumber || undefined,
        cakePhoto: req.body.cakePhoto || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: req.body.replies || [
          {
            id: `rep-${Date.now()}`,
            sender: 'customer',
            senderName: req.body.customerName || 'مشتری',
            text: req.body.message || '',
            createdAt: new Date().toISOString()
          }
        ]
      };

      supportTickets.unshift(newTicket);

      // Trigger live notification to Telegram Support Topic
      const categoryLabels: Record<string, string> = {
        custom_cake: '🎂 سفارش کیک اختصاصی',
        order_inquiry: '📦 پیگیری و سوال سفارش',
        payment_issue: '💳 مشکل در پرداخت و فیش',
        feedback: '⭐ انتقاد و پیشنهاد',
        consultation: '💡 مشاوره خرید و رژیمی',
        general: '💬 پیام عمومی'
      };

      sendToTelegramTopic(
        'support',
        `💬 <b>پیام پشتیبانی جدید (${newTicket.ticketNumber})</b>\n\n👤 <b>مشتری:</b> ${newTicket.customerName} ${newTicket.customerUsername ? `(@${newTicket.customerUsername})` : ''}\n📂 <b>موضوع:</b> ${categoryLabels[newTicket.category] || newTicket.category}\n📌 <b>عنوان:</b> ${newTicket.subject}\n\n📝 <b>متن پیام:</b>\n<i>${newTicket.message}</i>\n${newTicket.orderNumber ? `\n🔖 شماره سفارش مرتبط: <code>${newTicket.orderNumber}</code>` : ''}`,
        newTicket.cakePhoto
      );

      res.status(201).json(newTicket);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reply to support ticket
  app.post('/api/support/tickets/:id/reply', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { text, sender, senderName } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'متن پاسخ نمی‌تواند خالی باشد' });
      return;
    }

    const ticketIndex = supportTickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) {
      res.status(404).json({ error: 'تیکت یافت نشد' });
      return;
    }

    const isFromAdmin = sender === 'admin';
    const newReply = {
      id: `rep-${Date.now()}`,
      sender: (sender || 'admin') as 'admin' | 'customer',
      senderName: senderName || (isFromAdmin ? 'مدیریت قنادی' : supportTickets[ticketIndex].customerName),
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    supportTickets[ticketIndex].replies.push(newReply);
    supportTickets[ticketIndex].updatedAt = new Date().toISOString();
    if (isFromAdmin) {
      supportTickets[ticketIndex].status = 'answered';
    } else {
      supportTickets[ticketIndex].status = 'in_progress';
    }

    // If admin replied and user has telegram ID and live bot is active, send telegram message
    if (isFromAdmin && botSettings.telegramBotToken && supportTickets[ticketIndex].customerTelegramId && supportTickets[ticketIndex].customerTelegramId !== 'guest') {
      try {
        await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: supportTickets[ticketIndex].customerTelegramId,
            text: `👩‍🍳 <b>پاسخ پشتیبانی قنادی شیرین‌کام (تیکت ${supportTickets[ticketIndex].ticketNumber}):</b>\n\n${text.trim()}\n\n<i>در صورت نیاز به توضیحات بیشتر می‌توانید در همین چت پاسخ دهید.</i>`,
            parse_mode: 'HTML'
          })
        });
      } catch (err) {
        console.error('Failed to send telegram direct reply:', err);
      }
    }

    // Also notify support topic about the answer
    if (isFromAdmin) {
      sendToTelegramTopic(
        'support',
        `✅ <b>پاسخ به تیکت ${supportTickets[ticketIndex].ticketNumber} ارسال شد:</b>\n\n👤 مشتری: ${supportTickets[ticketIndex].customerName}\n✍️ <b>متن پاسخ ادمین:</b>\n${text.trim()}`
      );
    }

    res.json(supportTickets[ticketIndex]);
  });

  // Update ticket status or priority
  app.put('/api/support/tickets/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, priority } = req.body;

    const ticketIndex = supportTickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) {
      res.status(404).json({ error: 'تیکت یافت نشد' });
      return;
    }

    if (status) supportTickets[ticketIndex].status = status;
    if (priority) supportTickets[ticketIndex].priority = priority;
    supportTickets[ticketIndex].updatedAt = new Date().toISOString();

    res.json(supportTickets[ticketIndex]);
  });

  // Delete ticket
  app.delete('/api/support/tickets/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    supportTickets = supportTickets.filter(t => t.id !== id);
    res.json({ success: true });
  });

  // ==========================================
  // --- Custom Pastry & Cake Orders API ---
  // ==========================================

  // Get all custom pastry orders
  app.get('/api/custom-orders', (req: Request, res: Response) => {
    res.json(customOrders);
  });

  // Create new custom pastry order (from bot or admin)
  app.post('/api/custom-orders', (req: Request, res: Response) => {
    try {
      const nowIso = new Date().toISOString();
      const newOrder: CustomPastryOrder = {
        ...req.body,
        id: req.body.id || `custom-${Date.now()}`,
        orderNumber: req.body.orderNumber || `CP-${Math.floor(1000 + Math.random() * 9000)}`,
        status: req.body.status || 'pending_review',
        chatMessages: req.body.chatMessages || [],
        referenceImages: req.body.referenceImages || [],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      customOrders.unshift(newOrder);

      // Auto-notify orders supergroup topic in Telegram
      sendToTelegramTopic(
        'orders',
        `✨🎂 <b>سفارش جدید شیرینی/کیک دلخواه ثبت شد!</b>\n\n🔖 <b>کد رهگیری:</b> <code>${newOrder.orderNumber}</code>\n👤 <b>مشتری:</b> ${newOrder.customerName} (${newOrder.customerPhone})\n🧁 <b>نوع شیرینی:</b> ${newOrder.pastryType}\n⚖️ <b>وزن/تعداد:</b> ${newOrder.weightKg ? `${newOrder.weightKg} کیلوگرم` : ''} ${newOrder.servingCount ? `(${newOrder.servingCount} نفر)` : ''}\n🍰 <b>طعم اسفنج:</b> ${newOrder.spongeFlavor || 'وانیلی'}\n🥜 <b>فیلینگ:</b> ${newOrder.fillingFlavor || 'خامه موز و گردو'}\n🎨 <b>طرح درخواستی:</b>\n<i>${newOrder.shapeAndDesign}</i>\n${newOrder.writingOnCake ? `✍️ <b>متن روی کیک:</b> «${newOrder.writingOnCake}»\n` : ''}📅 <b>تاریخ تحویل:</b> ${newOrder.deliveryDate} (${newOrder.deliveryTimeSlot || 'ساعت هماهنگ شود'})\n\n🔍 وضعیت: <b>در انتظار بررسی و قیمت‌گذاری قناد</b>`,
        newOrder.referenceImages?.[0]
      );

      res.status(201).json(newOrder);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update custom order
  app.put('/api/custom-orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = customOrders.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'سفارش دلخواه یافت نشد.' });
      return;
    }

    customOrders[index] = {
      ...customOrders[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    res.json(customOrders[index]);
  });

  // Admin quotes price & prepayment for custom order
  app.post('/api/custom-orders/:id/quote', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { finalPrice, prepaymentAmount, adminNotes, messageToCustomer } = req.body;

    const index = customOrders.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'سفارش دلخواه یافت نشد.' });
      return;
    }

    const order = customOrders[index];
    order.finalPrice = Number(finalPrice) || order.estimatedPrice || 0;
    order.prepaymentAmount = Number(prepaymentAmount) || Math.round(order.finalPrice * 0.4);
    order.status = 'price_quoted';
    if (adminNotes) order.adminNotes = adminNotes;
    order.updatedAt = new Date().toISOString();

    if (messageToCustomer) {
      order.chatMessages.push({
        id: `cmsg-${Date.now()}`,
        sender: 'admin',
        senderName: 'سرقناد شیرین‌کام',
        text: messageToCustomer,
        createdAt: new Date().toISOString()
      });
    }

    // Direct Telegram notification to customer if live bot is connected
    if (botSettings.telegramBotToken && order.customerTelegramId && order.customerTelegramId !== 'guest') {
      try {
        await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.customerTelegramId,
            text: `🎂 <b>اعلام قیمت سفارش کیک/شیرینی دلخواه (${order.orderNumber}):</b>\n\nسلام ${order.customerName} عزیز، طرح سفارشی شما توسط سرقناد بررسی و قیمت‌گذاری شد:\n\n💰 <b>مبلغ کل سفارش:</b> <b>${order.finalPrice.toLocaleString('fa-IR')} تومان</b>\n💳 <b>مبلغ بیعانه جهت شروع پخت:</b> <b>${order.prepaymentAmount.toLocaleString('fa-IR')} تومان</b>\n${messageToCustomer ? `\n📝 <b>پیام قناد:</b>\n${messageToCustomer}\n` : ''}\n👇 در صورت تمایل به خرید، روی دکمه زیر کلیک کنید:`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '✅ ثبت سفارش', callback_data: `custom_order_register_${order.id}` }]
            ]}
          })
        });
      } catch (err) {
        console.error('Failed to notify customer about custom order quote:', err);
      }
    }

    // Notify Orders Topic
    sendToTelegramTopic(
      'orders',
      `💰 <b>قیمت‌گذاری سفارش دلخواه (${order.orderNumber}):</b>\n\n👤 مشتری: ${order.customerName}\n💵 مبلغ کل: <b>${order.finalPrice.toLocaleString('fa-IR')} تومان</b>\n💳 بیعانه: <b>${order.prepaymentAmount.toLocaleString('fa-IR')} تومان</b>\nوضعیت: در انتظار تایید مشتری و فیش بیعانه`
    );

    res.json(order);
  });

  // Update status (e.g. baking, ready, delivered, rejected)
  app.post('/api/custom-orders/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectReason, adminNotes } = req.body;

    const index = customOrders.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'سفارش دلخواه یافت نشد.' });
      return;
    }

    const order = customOrders[index];
    order.status = status;
    if (rejectReason) order.rejectReason = rejectReason;
    if (adminNotes) order.adminNotes = adminNotes;
    order.updatedAt = new Date().toISOString();

    const statusLabels: Record<string, string> = {
      pending_review: 'در انتظار بررسی',
      price_quoted: 'قیمت‌گذاری شده',
      approved_by_customer: 'تایید مشتری و پرداخت بیعانه',
      baking: '👨‍🍳 در حال پخت و تزیین در کارگاه',
      ready: '🎂 آماده تحویل / ارسال',
      delivered: '🎉 تحویل داده شد',
      rejected: '❌ رد شده / لغو'
    };

    // Notify Customer via bot
    if (botSettings.telegramBotToken && order.customerTelegramId && order.customerTelegramId !== 'guest') {
      try {
        let msg = `✨ <b>به‌روزرسانی وضعیت سفارش دلخواه (${order.orderNumber}):</b>\n\nوضعیت جدید: <b>${statusLabels[status] || status}</b>`;
        if (status === 'baking') {
          msg += `\n\n👨‍🍳 کیک و شیرینی شما در کارگاه شیرین‌کام در حال پخت و دیزاین با بهترین مواد اولیه است.`;
        } else if (status === 'ready') {
          msg += `\n\n🎂 سفارش شما با نهایت ظرافت آماده شد و در بسته‌بندی مخصوص قرار گرفت!`;
        } else if (status === 'delivered') {
          msg += `\n\n🎉 سفارش با موفقیت به شما تحویل داده شد. نوش جان و لحظاتتان شیرین!`;
        } else if (status === 'rejected' && rejectReason) {
          msg += `\n\nعلت: ${rejectReason}`;
        }

        await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.customerTelegramId,
            text: msg,
            parse_mode: 'HTML'
          })
        });
      } catch (err) {
        console.error('Failed to notify customer status:', err);
      }
    }

    sendToTelegramTopic(
      'orders',
      `🔄 <b>تغییر وضعیت سفارش دلخواه (${order.orderNumber}):</b>\n\n👤 مشتری: ${order.customerName}\n✨ وضعیت جدید: <b>${statusLabels[status] || status}</b>\n${adminNotes ? `📝 یادداشت: ${adminNotes}` : ''}`
    );

    res.json(order);
  });

  // Submit prepayment for custom order
  app.post('/api/custom-orders/:id/prepayment', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentReceiptImage, amount } = req.body;

    const index = customOrders.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'سفارش دلخواه یافت نشد.' });
      return;
    }

    const order = customOrders[index];
    order.isPrepaymentPaid = true;
    order.status = 'approved_by_customer';
    if (paymentReceiptImage) order.paymentReceiptImage = paymentReceiptImage;
    if (amount) order.prepaymentAmount = Number(amount);
    order.updatedAt = new Date().toISOString();

    // Notify Finance Topic
    sendToTelegramTopic(
      'finance',
      `💳 <b>فیش بیعانه سفارش دلخواه (${order.orderNumber}):</b>\n\n👤 مشتری: ${order.customerName}\n💰 مبلغ بیعانه: <b>${(order.prepaymentAmount || 0).toLocaleString('fa-IR')} تومان</b>\nکل فاکتور: ${(order.finalPrice || 0).toLocaleString('fa-IR')} تومان\nوضعیت: فیش ارسال شد - آماده تایید و ارسال به کارگاه پخت`,
      paymentReceiptImage
    );

    res.json(order);
  });

  // Chat message between customer and admin regarding custom order
  app.post('/api/custom-orders/:id/chat', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { text, sender, senderName, photo } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'متن پیام نمی‌تواند خالی باشد.' });
      return;
    }

    const index = customOrders.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'سفارش دلخواه یافت نشد.' });
      return;
    }

    const order = customOrders[index];
    const isFromAdmin = sender === 'admin';
    const newMsg = {
      id: `cmsg-${Date.now()}`,
      sender: (sender || 'admin') as 'admin' | 'customer',
      senderName: senderName || (isFromAdmin ? 'سرقناد شیرین‌کام' : order.customerName),
      text: text.trim(),
      photo,
      createdAt: new Date().toISOString()
    };

    order.chatMessages.push(newMsg);
    order.updatedAt = new Date().toISOString();

    // If sent by admin, notify customer on telegram
    if (isFromAdmin && botSettings.telegramBotToken && order.customerTelegramId && order.customerTelegramId !== 'guest') {
      try {
        await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.customerTelegramId,
            text: `👨‍🍳 <b>پیام جدید قناد در خصوص سفارش ${order.orderNumber}:</b>\n\n${text.trim()}`,
            parse_mode: 'HTML'
          })
        });
      } catch (e) {
        console.error('Failed to notify customer chat:', e);
      }
    }

    res.json(order);
  });

  // Delete custom order
  app.delete('/api/custom-orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    customOrders = customOrders.filter(o => o.id !== id);
    res.json({ success: true });
  });

  // Test live Telegram bot token
  app.post('/api/telegram/test-bot', async (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, message: 'لطفاً توکن ربات تلگرام را وارد کنید' });
      return;
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await response.json()) as any;
      if (data.ok) {
        res.json({
          success: true,
          bot: data.result,
          message: `ارتباط با ربات @${data.result.username} با موفقیت برقرار شد!`
        });
      } else {
        res.status(400).json({
          success: false,
          message: data.description || 'توکن وارد شده معتبر نمی‌باشد'
        });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'خطا در ارتباط با سرور تلگرام: ' + err.message
      });
    }
  });

  // Broadcast message to users
  app.post('/api/telegram/broadcast', async (req: Request, res: Response) => {
    const { message, photo } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    let sentCount = 0;
    if (botSettings.telegramBotToken && registeredTelegramChatIds.size > 0) {
      for (const chatId of registeredTelegramChatIds) {
        try {
          if (photo) {
            await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                photo: photo,
                caption: message,
                parse_mode: 'HTML'
              })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
              })
            });
          }
          sentCount++;
        } catch (e) {
          console.error(`Failed to send broadcast to ${chatId}:`, e);
        }
      }
    }

    res.json({ success: true, recipientsCount: registeredTelegramChatIds.size, sentCount });
  });

  // --- Telegram Forum Supergroup Topics API ---

  // Helper function to send report to Telegram topic
  async function sendToTelegramTopic(
    key: 'orders' | 'finance' | 'products' | 'discounts' | 'support' | 'analytics',
    messageText: string,
    photoUrl?: string
  ) {
    if (!botSettings.forumGroupId) return;
    const topic = botSettings.forumTopics?.find((t) => t.key === key);
    if (!topic || !topic.enabled || !topic.autoReport) return;

    topic.lastReportTime = new Date().toISOString();
    topic.lastReportSummary = messageText.replace(/<[^>]*>?/gm, '').slice(0, 120);

    if (botSettings.telegramBotToken) {
      try {
        const payload: any = {
          chat_id: botSettings.forumGroupId,
          parse_mode: 'HTML',
        };
        if (topic.threadId) {
          payload.message_thread_id = topic.threadId;
        }

        if (photoUrl) {
          payload.photo = photoUrl;
          payload.caption = messageText;
          await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          payload.text = messageText;
          await fetch(`https://api.telegram.org/bot${botSettings.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch (err) {
        console.error(`Error sending to topic ${key}:`, err);
      }
    }
  }

  // Core function to automatically setup forum topics when bot is added or made admin in a supergroup
  async function autoSetupGroupTopics(
    targetGroupId: string,
    groupTitle?: string,
    botToken?: string
  ) {
    const token = botToken || botSettings.telegramBotToken;
    const topicsToSetup = [
      {
        key: 'orders' as const,
        name: '📦 سفارشات جدید و ارسال',
        iconEmoji: '📦',
        color: 0x6FB9F0,
        desc: 'اعلان لحظه‌ای ثبت سفارشات جدید مشتریان و پیگیری ارسال با پیک',
        introMsg: '📦 <b>تاپیک اختصاصی سفارشات و فاکتورها</b>\n\nکلیه سفارشات جدید ثبت‌شده در ربات به همراه جزئیات اقلام، آدرس، تلفن و دکمه‌های تغییر وضعیت لحظه‌ای در این تاپیک ارسال می‌شوند.'
      },
      {
        key: 'finance' as const,
        name: '💳 واریزی‌ها و فیش‌های بانکی',
        iconEmoji: '💳',
        color: 0x6FF096,
        desc: 'گزارش واریزهای کارت‌به‌کارت و تایید فیش بانکی',
        introMsg: `💳 <b>تاپیک اختصاصی امور مالی و فیش‌های بانکی</b>\n\nفیش‌های واریزی کارت‌به‌کارت و تراکنش‌های بانکی مشتریان جهت تایید حسابداری در این تاپیک ارسال می‌گردد.\nشماره کارت مقصد: <code>${botSettings.cardNumber}</code>`
      },
      {
        key: 'products' as const,
        name: '🧁 موجودی و تغییر قیمت محصولات',
        iconEmoji: '🧁',
        color: 0xFFD67E,
        desc: 'اطلاع‌رسانی تغییر قیمت شیرینی‌ها و وضعیت موجودی',
        introMsg: '🧁 <b>تاپیک اختصاصی محصولات و انبارداری</b>\n\nگزارش افزودن کیک و شیرینی جدید، تغییرات قیمت و هشدارهای اتمام موجودی در این تاپیک درج می‌شود.'
      },
      {
        key: 'discounts' as const,
        name: '🎟️ کدهای تخفیف و کمپین‌ها',
        iconEmoji: '🎟️',
        color: 0xFB6F92,
        desc: 'گزارش استفاده از کدهای تخفیف و تعریف کمپین‌های جدید',
        introMsg: '🎟️ <b>تاپیک اختصاصی کدهای تخفیف و جشنواره‌ها</b>\n\nاطلاع‌رسانی کدهای تخفیف فعال‌شده و جشنواره‌های فروش ویژه قنادی در این تاپیک ارسال می‌شود.'
      },
      {
        key: 'support' as const,
        name: '💬 پیام‌ها و پشتیبانی مشتریان',
        iconEmoji: '💬',
        color: 0xB388FF,
        desc: 'دریافت پیام‌ها و درخواست‌های ارسالی مشتریان',
        introMsg: '💬 <b>تاپیک پشتیبانی و نظرات مشتریان</b>\n\nپیام‌ها، تیکت‌ها و درخواست‌های ارسالی مشتریان جهت پاسخگویی سریع تیم پشتیبانی در این تاپیک قرار می‌گیرد.'
      },
      {
        key: 'analytics' as const,
        name: '📊 گزارشات روزانه و آمار فروش',
        iconEmoji: '📊',
        color: 0x80D8FF,
        desc: 'خلاصه آمار فروش شبانه و پرفروش‌ترین اقلام قنادی',
        introMsg: '📊 <b>تاپیک گزارشات جامع و آمار فروش</b>\n\nخلاصه وضعیت فروش روزانه، پرفروش‌ترین محصولات و آمار مالی قنادی در این تاپیک ثبت خواهد شد.'
      },
    ];

    const results: any[] = [];
    let updatedTopics = [...(botSettings.forumTopics || [])];

    for (let i = 0; i < topicsToSetup.length; i++) {
      const item = topicsToSetup[i];
      let threadId = 100 + (i + 1) * 2;
      let createdViaApi = false;

      if (token) {
        try {
          const createRes = await fetch(`https://api.telegram.org/bot${token}/createForumTopic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetGroupId,
              name: item.name,
              icon_color: item.color,
            }),
          });
          const createData = (await createRes.json()) as any;
          if (createData.ok && createData.result?.message_thread_id) {
            threadId = createData.result.message_thread_id;
            createdViaApi = true;
          }
        } catch (e) {
          console.error(`Failed to create real Telegram topic ${item.name}:`, e);
        }
      }

      const existingIndex = updatedTopics.findIndex((t) => t.key === item.key);
      const topicObj = {
        id: `topic-${Date.now()}-${i}`,
        key: item.key,
        name: item.name,
        iconEmoji: item.iconEmoji,
        threadId: threadId,
        enabled: true,
        autoReport: true,
        description: item.desc,
        lastReportTime: new Date().toISOString(),
        lastReportSummary: `تاپیک ${item.name} با شناسه ترد #${threadId} فعال شد.`,
      };

      if (existingIndex !== -1) {
        updatedTopics[existingIndex] = { ...updatedTopics[existingIndex], ...topicObj };
      } else {
        updatedTopics.push(topicObj);
      }

      // Send initial intro message into each newly created topic
      if (token) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetGroupId,
              message_thread_id: threadId,
              text: item.introMsg,
              parse_mode: 'HTML',
            }),
          });
        } catch (err) {
          console.error(`Failed to send intro to topic ${item.key}:`, err);
        }
      }

      results.push({
        key: item.key,
        name: item.name,
        threadId,
        createdViaApi,
      });
    }

    botSettings = {
      ...botSettings,
      forumGroupId: targetGroupId,
      forumGroupTitle: groupTitle || botSettings.forumGroupTitle || 'سوپرگروه تاپیک‌دار قنادی',
      forumTopics: updatedTopics,
    };

    // Send a master announcement to the general topic of the group
    if (token) {
      try {
        const announcementText = `🎉 <b>ربات مدیریت قنادی شیرین‌کام با موفقیت متصل و ادمین شد!</b>\n\n👑 ۶ تاپیک اختصاصی به صورت کاملاً خودکار ایجاد و آماده گزارش‌دهی شدند:\n\n📦 <b>تاپیک سفارشات</b> (ثبت و پیگیری فاکتورها)\n💳 <b>تاپیک مالی</b> (فیش‌های واریزی کارت‌به‌کارت)\n🧁 <b>تاپیک محصولات</b> (موجودی انبار و تغییر قیمت)\n🎟️ <b>تاپیک تخفیف‌ها</b> (کدهای تخفیف و جشنواره)\n💬 <b>تاپیک پشتیبانی</b> (پیام‌ها و نظرات مشتریان)\n📊 <b>تاپیک آمار</b> (گزارشات و فروش روزانه)\n\n⚡️ <i>از هم‌اکنون کلیه رویدادهای فروشگاه به صورت زنده و تفکیک‌شده به این تاپیک‌ها ارسال خواهند شد.</i>`;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetGroupId,
            text: announcementText,
            parse_mode: 'HTML',
          }),
        });
      } catch (err) {
        console.error('Failed to send group master announcement:', err);
      }
    }

    return { updatedTopics, results };
  }

  // Auto-create all topics in the Telegram Forum Supergroup
  app.post('/api/telegram/forum/setup-all-topics', async (req: Request, res: Response) => {
    const { groupId, title, token } = req.body;
    const targetGroupId = groupId || botSettings.forumGroupId;
    const botToken = token || botSettings.telegramBotToken;

    if (!targetGroupId) {
      res.status(400).json({ success: false, message: 'شناسه گروه تاپیک‌دار (Group Chat ID) الزامی است.' });
      return;
    }

    try {
      const { updatedTopics, results } = await autoSetupGroupTopics(targetGroupId, title, botToken);
      res.json({
        success: true,
        message: `تعداد ${updatedTopics.length} تاپیک اختصاصی با موفقیت در گروه ${targetGroupId} ایجاد و همگام‌سازی شدند.`,
        topics: updatedTopics,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'خطا در ایجاد خودکار تاپیک‌ها: ' + err.message });
    }
  });

  // Simulated auto-group addition endpoint for testing from admin panel
  app.post('/api/telegram/forum/simulate-group-add', async (req: Request, res: Response) => {
    const simulatedGroupId = req.body.groupId || '-1002849173620';
    const simulatedGroupTitle = req.body.title || 'گروه پرسنل و مدیریت قنادی شیرین‌کام';

    const { updatedTopics, results } = await autoSetupGroupTopics(
      simulatedGroupId,
      simulatedGroupTitle,
      botSettings.telegramBotToken
    );

    // Also trigger initial live reports to demonstration
    const lastOrder = orders[0];
    if (lastOrder) {
      sendToTelegramTopic(
        'orders',
        `📦 <b>سفارش فعال در حال پخت</b>\n\n🔖 کد: <code>${lastOrder.orderNumber}</code>\n👤 خریدار: ${lastOrder.customerName}\n💰 مبلغ: ${lastOrder.totalAmount.toLocaleString('fa-IR')} تومان\n🛵 وضعیت: ${lastOrder.status === 'baking' ? 'در حال پخت و تزیین' : 'تایید شده'}`
      );
    }

    res.json({
      success: true,
      message: `ربات با موفقیت به گروه «${simulatedGroupTitle}» متصل شد و تمام ۶ تاپیک به صورت خودکار ایجاد شدند!`,
      groupId: simulatedGroupId,
      groupTitle: simulatedGroupTitle,
      topics: updatedTopics,
      results
    });
  });

  // Send single report / test report to a specific topic
  app.post('/api/telegram/forum/send-report', async (req: Request, res: Response) => {
    const { key, customText, customPhoto } = req.body;
    const topic = botSettings.forumTopics?.find((t) => t.key === key);

    if (!topic) {
      res.status(404).json({ success: false, message: 'تاپیک مورد نظر یافت نشد.' });
      return;
    }

    let reportMessage = customText;
    if (!reportMessage) {
      if (key === 'orders') {
        const lastOrder = orders[0];
        reportMessage = `📦 <b>گزارش لحظه‌ای سفارشات قنادی</b>\n\n🔖 <b>شماره آخرین سفارش:</b> <code>${lastOrder?.orderNumber || 'SH-8422'}</code>\n👤 <b>مشتری:</b> ${lastOrder?.customerName || 'سارا حسینی'}\n💰 <b>مبلغ کل:</b> ${(lastOrder?.totalAmount || 940000).toLocaleString('fa-IR')} تومان\n🛵 <b>وضعیت:</b> در حال آماده‌سازی و ارسال با پیک مخصوص`;
      } else if (key === 'finance') {
        const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        reportMessage = `💳 <b>گزارش وضعیت مالی و فیش‌های دریافتی</b>\n\n💎 <b>مجموع کل واریزی‌های ثبت‌شده:</b> ${totalSales.toLocaleString('fa-IR')} تومان\n🧾 <b>تعداد کل فاکتورها:</b> ${orders.length.toLocaleString('fa-IR')} عدد\n💳 <b>شماره کارت مقصد:</b> <code>${botSettings.cardNumber}</code> (${botSettings.cardHolder})`;
      } else if (key === 'products') {
        const availableCount = products.filter((p) => p.isAvailable).length;
        reportMessage = `🧁 <b>گزارش کاتالوگ و انبار شیرینی‌ها</b>\n\n▫️ کل تنوع کیک و شیرینی: <b>${products.length.toLocaleString('fa-IR')} قلم</b>\n▫️ محصولات آماده تحویل: <b>${availableCount.toLocaleString('fa-IR')} کالا</b>\n▫️ هشدار کسری موجودی: کلیه اقلام در وضعیت نرمال قرار دارند.`;
      } else if (key === 'discounts') {
        reportMessage = `🎟️ <b>گزارش کدهای تخفیف و کمپین‌ها</b>\n\n🔖 <b>کدهای فعال در حال حاضر:</b> ${discounts.filter((d) => d.isActive).length.toLocaleString('fa-IR')} کد\n🔥 <b>پرمصرف‌ترین کد:</b> ${discounts[0]?.code || 'SHIRIN20'} (${discounts[0]?.usedCount || 14} بار استفاده)`;
      } else if (key === 'support') {
        reportMessage = `💬 <b>کانال پشتیبانی و پیام‌های مشتریان</b>\n\n📩 پیام‌های جدید دریافتی از مشتریان مستقیماً در این تاپیک ارسال و لاگ می‌شوند تا تیم پاسخگویی سریعاً رسیدگی نماید.`;
      } else {
        // analytics
        const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        reportMessage = `📊 <b>گزارش جامع فروش روزانه قنادی شیرین‌کام</b>\n\n💰 <b>فروش کل:</b> ${totalSales.toLocaleString('fa-IR')} تومان\n📦 <b>تعداد سفارشات موفق:</b> ${orders.length.toLocaleString('fa-IR')} سفارش\n🏆 <b>پرفروش‌ترین کالا:</b> کیک تولد شکلاتی بلژیکی\n📈 <b>میانگین هر سبد خرید:</b> ${Math.round(totalSales / (orders.length || 1)).toLocaleString('fa-IR')} تومان`;
      }
    }

    await sendToTelegramTopic(key, reportMessage, customPhoto);

    res.json({
      success: true,
      message: `گزارش با موفقیت در تاپیک «${topic.name}» (Thread #${topic.threadId}) ثبت و ارسال گردید.`,
      topic,
      reportMessage,
    });
  });

  // ==========================================
  // --- Master Backup & Migration System ---
  // ==========================================

  // Helper to generate full master backup payload
  function generateBackupPayload(generatedBy: string = 'Admin-Manual'): MasterBackupPayload {
    const totalWalletBalances = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);
    const totalEntities = products.length + orders.length + customOrders.length + customers.length + walletTransactions.length + discounts.length + supportTickets.length;
    const nowIso = new Date().toISOString();

    const rawData = {
      products: JSON.parse(JSON.stringify(products)),
      orders: JSON.parse(JSON.stringify(orders)),
      customOrders: JSON.parse(JSON.stringify(customOrders)),
      customers: JSON.parse(JSON.stringify(customers)),
      walletTransactions: JSON.parse(JSON.stringify(walletTransactions)),
      discounts: JSON.parse(JSON.stringify(discounts)),
      supportTickets: JSON.parse(JSON.stringify(supportTickets)),
      botSettings: JSON.parse(JSON.stringify(botSettings)),
      backupSchedule: JSON.parse(JSON.stringify(backupSchedule))
    };

    const payloadString = JSON.stringify(rawData);
    const checksum = crypto.createHash('sha256').update(payloadString).digest('hex');

    return {
      app: 'ShirinKam Pastry Management System',
      version: '2.5.0',
      exportTimestamp: nowIso,
      checksum,
      environment: 'production',
      metadata: {
        generatedBy,
        databaseEngine: 'MasterInMemoryEngine',
        totalEntities,
        totalWalletBalances,
        storeName: botSettings.storeName || 'قنادی شیرین‌کام',
        storePhone: botSettings.storePhone || '۰۲۱-۸۸۹۹۲۲۳۳'
      },
      data: rawData
    };
  }

  // Helper to create and store a server snapshot
  function createSnapshotInternal(
    type: 'manual' | 'scheduled' | 'pre_restore_safety' = 'manual',
    customName?: string
  ): BackupSnapshot {
    const payload = generateBackupPayload(type === 'scheduled' ? 'AutoScheduler-Daemon' : type === 'pre_restore_safety' ? 'SafetyGuard-BeforeRestore' : 'Admin-Manual');
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = customName || `shirinkam-backup-${type}-${dateStr}.json`;
    const serialized = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    const totalWalletBalance = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);

    const snapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      filename,
      timestamp: payload.exportTimestamp,
      type,
      sizeBytes,
      checksum: payload.checksum,
      version: payload.version,
      stats: {
        productsCount: products.length,
        ordersCount: orders.length,
        customOrdersCount: customOrders.length,
        customersCount: customers.length,
        totalWalletBalance,
        discountsCount: discounts.length,
        ticketsCount: supportTickets.length,
        forumTopicsCount: botSettings.forumTopics?.length || 0
      },
      payload
    };

    backupSnapshots.unshift(snapshot);

    // Enforce retention limit
    const limit = backupSchedule.keepLastSnapshots || 10;
    if (backupSnapshots.length > limit) {
      backupSnapshots = backupSnapshots.slice(0, limit);
    }

    // Update last backup time
    backupSchedule.lastBackupTime = snapshot.timestamp;

    return snapshot;
  }

  // 1. Export Master Backup (Download JSON)
  app.get('/api/backup/export', (req: Request, res: Response) => {
    try {
      const payload = generateBackupPayload('Admin-Export-Download');
      const filename = `shirinkam-master-backup-${new Date().toISOString().slice(0, 10)}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: 'خطا در ایجاد خروجی پشتیبان: ' + err.message });
    }
  });

  // 2. Import & Restore Master Backup (Zero-loss Migration)
  app.post('/api/backup/import', (req: Request, res: Response) => {
    try {
      const { payload, mode = 'overwrite' } = req.body;

      if (!payload || !payload.data) {
        res.status(400).json({ success: false, message: 'ساختار فایل بکاپ نامعتبر است (شیء data یافت نشد).' });
        return;
      }

      const importedData = payload.data;

      // Create a safety restore point before overwriting
      createSnapshotInternal('pre_restore_safety', `safety-point-before-restore-${Date.now()}.json`);

      if (mode === 'overwrite') {
        // Full atomic overwrite
        if (Array.isArray(importedData.products)) {
          products = [...importedData.products];
        }
        if (Array.isArray(importedData.orders)) {
          orders = [...importedData.orders];
        }
        if (Array.isArray(importedData.customOrders)) {
          customOrders = [...importedData.customOrders];
        }
        if (Array.isArray(importedData.customers)) {
          customers = [...importedData.customers];
        }
        if (Array.isArray(importedData.walletTransactions)) {
          walletTransactions = [...importedData.walletTransactions];
        }
        if (Array.isArray(importedData.discounts)) {
          discounts = [...importedData.discounts];
        }
        if (Array.isArray(importedData.supportTickets)) {
          supportTickets = [...importedData.supportTickets];
        }
        if (importedData.botSettings && typeof importedData.botSettings === 'object') {
          botSettings = { ...botSettings, ...importedData.botSettings };
        }
        if (importedData.backupSchedule && typeof importedData.backupSchedule === 'object') {
          backupSchedule = { ...backupSchedule, ...importedData.backupSchedule };
        }
      } else {
        // Smart merge
        if (Array.isArray(importedData.products)) {
          const existingIds = new Set(products.map(p => p.id));
          importedData.products.forEach((p: Product) => {
            if (!existingIds.has(p.id)) products.push(p);
          });
        }
        if (Array.isArray(importedData.orders)) {
          const existingIds = new Set(orders.map(o => o.id));
          importedData.orders.forEach((o: Order) => {
            if (!existingIds.has(o.id)) orders.push(o);
          });
        }
        if (Array.isArray(importedData.customOrders)) {
          const existingIds = new Set(customOrders.map(o => o.id));
          importedData.customOrders.forEach((o: CustomPastryOrder) => {
            if (!existingIds.has(o.id)) customOrders.push(o);
          });
        }
        if (Array.isArray(importedData.customers)) {
          const existingIds = new Set(customers.map(c => c.id));
          importedData.customers.forEach((c: CustomerUser) => {
            if (!existingIds.has(c.id)) customers.push(c);
          });
        }
        if (Array.isArray(importedData.walletTransactions)) {
          const existingIds = new Set(walletTransactions.map(w => w.id));
          importedData.walletTransactions.forEach((w: WalletTransaction) => {
            if (!existingIds.has(w.id)) walletTransactions.push(w);
          });
        }
        if (Array.isArray(importedData.discounts)) {
          const existingCodes = new Set(discounts.map(d => d.code.toUpperCase()));
          importedData.discounts.forEach((d: DiscountCode) => {
            if (!existingCodes.has(d.code.toUpperCase())) discounts.push(d);
          });
        }
        if (Array.isArray(importedData.supportTickets)) {
          const existingIds = new Set(supportTickets.map(t => t.id));
          importedData.supportTickets.forEach((t: SupportTicket) => {
            if (!existingIds.has(t.id)) supportTickets.push(t);
          });
        }
      }

      const totalWalletBalance = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);

      // Notify Finance / Analytics Telegram topics
      sendToTelegramTopic(
        'finance',
        `🛡️ <b>عملیات بازیابی و ریستور موفقیت‌آمیز دیتابیس:</b>\n\n✅ دیتابیس با موفقیت بازگردانی شد.\n👥 تعداد مشتریان: <b>${customers.length} نفر</b>\n💰 <b>مجموع موجودی کیف‌پول‌ها:</b> <b>${totalWalletBalance.toLocaleString('fa-IR')} تومان</b> (تضمین عدم کسر موجودی)\n📦 سفارشات عادی: <b>${orders.length} عدد</b>\n🎂 سفارشات دلخواه: <b>${customOrders.length} عدد</b>\n🧁 محصولات: <b>${products.length} قلم</b>`
      );

      res.json({
        success: true,
        message: 'اطلاعات با موفقیت کامل و بدون هیچ نقصی بازیابی شد.',
        stats: {
          productsCount: products.length,
          ordersCount: orders.length,
          customOrdersCount: customOrders.length,
          customersCount: customers.length,
          totalWalletBalance,
          discountsCount: discounts.length,
          ticketsCount: supportTickets.length,
          forumTopicsCount: botSettings.forumTopics?.length || 0
        },
        restoredEntitiesCount: products.length + orders.length + customOrders.length + customers.length + walletTransactions.length + discounts.length + supportTickets.length,
        totalWalletBalance
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'خطا در بازیابی اطلاعات: ' + err.message });
    }
  });

  // 3. Get all snapshots
  app.get('/api/backup/snapshots', (req: Request, res: Response) => {
    res.json(backupSnapshots);
  });

  // 4. Create new snapshot on server
  app.post('/api/backup/snapshots', (req: Request, res: Response) => {
    try {
      const { customName } = req.body;
      const snapshot = createSnapshotInternal('manual', customName);
      res.status(201).json({
        success: true,
        message: 'نقطه بازیابی جدید روی سرور با موفقیت ایجاد گردید.',
        snapshot
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Restore specific snapshot
  app.post('/api/backup/snapshots/:id/restore', (req: Request, res: Response) => {
    const { id } = req.params;
    const snap = backupSnapshots.find(s => s.id === id);
    if (!snap) {
      res.status(404).json({ success: false, message: 'نقطه بازیابی یافت نشد.' });
      return;
    }

    try {
      // Create safety snapshot before restoring
      createSnapshotInternal('pre_restore_safety', `pre-rollback-from-${id}.json`);

      const d = snap.payload.data;
      if (Array.isArray(d.products)) products = [...d.products];
      if (Array.isArray(d.orders)) orders = [...d.orders];
      if (Array.isArray(d.customOrders)) customOrders = [...d.customOrders];
      if (Array.isArray(d.customers)) customers = [...d.customers];
      if (Array.isArray(d.walletTransactions)) walletTransactions = [...d.walletTransactions];
      if (Array.isArray(d.discounts)) discounts = [...d.discounts];
      if (Array.isArray(d.supportTickets)) supportTickets = [...d.supportTickets];
      if (d.botSettings) botSettings = { ...botSettings, ...d.botSettings };

      const totalWalletBalance = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);

      res.json({
        success: true,
        message: `نسخه پشتیبان «${snap.filename}» با موفقیت اعمال گردید.`,
        stats: snap.stats,
        totalWalletBalance
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'خطا در بازیابی: ' + err.message });
    }
  });

  // 6. Delete snapshot
  app.delete('/api/backup/snapshots/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    backupSnapshots = backupSnapshots.filter(s => s.id !== id);
    res.json({ success: true, message: 'نقطه بازیابی حذف گردید.' });
  });

  // 7. Get backup schedule
  app.get('/api/backup/schedule', (req: Request, res: Response) => {
    res.json(backupSchedule);
  });

  // 8. Update backup schedule
  app.put('/api/backup/schedule', (req: Request, res: Response) => {
    backupSchedule = { ...backupSchedule, ...req.body };
    res.json({
      success: true,
      message: 'تنظیمات زمان‌بندی پشتیبان‌گیری با موفقیت ذخیره شد.',
      schedule: backupSchedule
    });
  });

  // ==========================================
  // --- Customers & Wallets API ---
  // ==========================================

  // Get all customers
  app.get('/api/customers', (req: Request, res: Response) => {
    res.json(customers);
  });

  // Create or update customer
  app.post('/api/customers', (req: Request, res: Response) => {
    try {
      const { id, telegramId, name, phone, username, address, walletBalance } = req.body;
      const existingIndex = customers.findIndex(c => c.id === id || (telegramId && c.telegramId === telegramId));

      if (existingIndex !== -1) {
        customers[existingIndex] = {
          ...customers[existingIndex],
          ...req.body,
          lastActiveAt: new Date().toISOString()
        };
        res.json(customers[existingIndex]);
      } else {
        const newCustomer: CustomerUser = {
          id: id || `usr-${Date.now()}`,
          telegramId: telegramId || `user_${Date.now()}`,
          name: name || 'مشتری جدید',
          phone: phone || '',
          username: username || '',
          address: address || '',
          walletBalance: Number(walletBalance) || 0,
          rewardPoints: 50,
          totalOrdersCount: 0,
          totalSpentTomans: 0,
          tier: 'bronze',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        customers.unshift(newCustomer);
        res.status(201).json(newCustomer);
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Adjust customer wallet balance
  app.post('/api/customers/:id/wallet-adjust', (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, type = 'admin_adjustment', description = 'تغییر موجودی توسط مدیریت' } = req.body;

    const customerIndex = customers.findIndex(c => c.id === id);
    if (customerIndex === -1) {
      res.status(404).json({ error: 'کاربر یافت نشد.' });
      return;
    }

    const delta = Number(amount) || 0;
    const currentBalance = customers[customerIndex].walletBalance || 0;
    const newBalance = Math.max(0, currentBalance + delta);
    customers[customerIndex].walletBalance = newBalance;

    const transaction: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      customerId: id,
      customerName: customers[customerIndex].name,
      type: type as any,
      amount: delta,
      description,
      createdAt: new Date().toISOString(),
      balanceAfter: newBalance
    };

    walletTransactions.unshift(transaction);

    // Notify finance topic if significant
    sendToTelegramTopic(
      'finance',
      `👛 <b>تغییر موجودی کیف پول مشتری:</b>\n\n👤 مشتری: <b>${customers[customerIndex].name}</b>\n💵 مبلغ تغییر: <b>${delta > 0 ? `+${delta.toLocaleString('fa-IR')}` : delta.toLocaleString('fa-IR')} تومان</b>\n💰 موجودی نهایی: <b>${newBalance.toLocaleString('fa-IR')} تومان</b>\n📝 علت: ${description}`
    );

    res.json({
      success: true,
      customer: customers[customerIndex],
      transaction
    });
  });

  // Get wallet transactions history
  app.get('/api/wallet/transactions', (req: Request, res: Response) => {
    res.json(walletTransactions);
  });

  // Telegram helper functions for live bot polling
  function stopTelegramPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    isPolling = false;
  }

  function startTelegramPolling(token: string) {
    if (isPolling) return;
    isPolling = true;

    pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${pollingOffset}&timeout=5`
        );
        const data = (await response.json()) as any;
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            pollingOffset = update.update_id + 1;
            await handleTelegramLiveUpdate(token, update);
          }
        }
      } catch (err) {
        console.error('Error during Telegram update polling:', err);
      }
    }, 3000);
  }

  async function handleTelegramLiveUpdate(token: string, update: any) {
    // 1. Handle bot promoted to admin or added to supergroup (my_chat_member)
    if (update.my_chat_member) {
      const mcm = update.my_chat_member;
      const chat = mcm.chat;
      const newStatus = mcm.new_chat_member?.status;

      if (chat && (chat.type === 'supergroup' || chat.type === 'group')) {
        const groupId = chat.id.toString();
        const groupTitle = chat.title || 'سوپرگروه قنادی';

        if (newStatus === 'administrator' || newStatus === 'member') {
          console.log(`Bot added or promoted to admin in group ${groupTitle} (${groupId})`);
          await autoSetupGroupTopics(groupId, groupTitle, token);
        }
      }
      return;
    }

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id.toString();
      registeredTelegramChatIds.add(chatId);
      const text = msg.text || '';
      const chatType = msg.chat.type;

      // Handle bot added to group via new_chat_members
      if (msg.new_chat_members && (chatType === 'supergroup' || chatType === 'group')) {
        const hasBot = msg.new_chat_members.some((u: any) => u.is_bot);
        if (hasBot) {
          console.log(`Bot added to supergroup ${msg.chat.title} (${chatId})`);
          await autoSetupGroupTopics(chatId, msg.chat.title, token);
        }
      }

      // If message in supergroup is /setup_topics or /connect_group
      if (chatType === 'supergroup' && (text === '/setup_topics' || text === '/connect_group')) {
        await autoSetupGroupTopics(chatId, msg.chat.title, token);
        return;
      }

      if (text === '/start') {
        userStates.delete(chatId);
        
        // Add customer to database if not exists
        const existingCustomer = customers.find(c => c.telegramId === chatId);
        if (!existingCustomer) {
          customers.unshift({
            id: `usr-${Date.now()}`,
            telegramId: chatId,
            name: msg.from?.first_name || 'مشتری جدید',
            phone: '',
            username: msg.from?.username || '',
            address: '',
            walletBalance: 0,
            rewardPoints: 10,
            totalOrdersCount: 0,
            totalSpentTomans: 0,
            tier: 'bronze',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
          });
          saveAllData();
        } else {
          // Update last active time
          existingCustomer.lastActiveAt = new Date().toISOString();
          saveAllData();
        }
        
        const storeName = botSettings.storeName || 'فروشگاه آنلاین';
        const welcomeMsg = botSettings.welcomeMessage || `به ربات سفارش آنلاین <b>${storeName}</b> خوش آمدید!\n\nاز طریق دکمه‌های زیر می‌توانید:\n🔹 محصولات ما را مشاهده و سفارش دهید\n🔹 سفارشات قبلی خود را پیگیری کنید\n🔹 اطلاعات تماس و آدرس ما را ببینید\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
        const inlineKeyboard = [
          [{ text: '🍰 منوی محصولات و سفارش آنلاین', callback_data: 'menu_categories' }],
          [{ text: '🎨 محصول سفارشی شما', callback_data: 'custom_product_start' }],
          [{ text: '🛒 مشاهده سبد خرید', callback_data: 'view_cart' }],
          [{ text: '📦 پیگیری سفارشات من', callback_data: 'track_order' }],
          [{ text: '📍 آدرس و اطلاعات تماس', callback_data: 'contact_info' }],
          [{ text: '💬 ارسال پیام به پشتیبانی', callback_data: 'support_send' }]
        ];
        // Check if user is admin
        const adminIds = botSettings.adminTelegramIds || [];
        const isAdmin = adminIds.includes(chatId) || chatId === botSettings.adminTelegramId;
        if (isAdmin) {
          inlineKeyboard.push([{ text: '👨‍🍳 پنل مدیریت', callback_data: 'admin_panel' }]);
        }
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: welcomeMsg, parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineKeyboard } })
        });
      } else if (text === '/admin') {
        const adminText = `👨‍🍳 <b>پنل مدیریت قنادی شیرین‌کام</b>\n\nمدیریت محصولات، قیمت‌ها، سفارشات مشتریان و تنظیمات فروشگاه:`;
        const adminKeyboard = [
          [
            { text: '➕ افزودن شیرینی جدید', callback_data: 'admin_add_product' },
            { text: '💰 مدیریت قیمت‌ها و موجودی', callback_data: 'admin_products_manager' }
          ],
          [
            { text: `📦 سفارشات جدید (${orders.filter(o => o.status === 'paid_checking' || o.status === 'baking').length})`, callback_data: 'admin_orders_list' },
            { text: '📊 آمار و گزارش فروش', callback_data: 'admin_sales_stats' }
          ],
          [
            { text: '⚙️ تنظیمات کارت و ارسال', callback_data: 'admin_settings' },
            { text: '🌐 مشخصات پنل تحت وب', callback_data: 'admin_web_info' }
          ],
          [
            { text: '📢 ارسال پیام به مشتریان', callback_data: 'admin_broadcast' },
            { text: '🔙 منوی مشتری', callback_data: 'back_to_main' }
          ]
        ];

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: adminText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: adminKeyboard }
          })
        });
      } else {
        // Handle text-based state flows
        const tgCtx = { token, chatId, products, orders, discounts, customers, supportTickets, customOrders, botSettings, userCarts, userStates };
        const stateHandled = await handleTextMessage(tgCtx, text);
        if (stateHandled) return;

        // Handle custom quantity input
        const qtyState = userStates.get(chatId);
        if (qtyState && qtyState.mode === 'custom_qty_input') {
          const qty = parseFloat(text);
          if (isNaN(qty) || qty <= 0) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: '❌ لطفاً یک عدد معتبر وارد کنید:', parse_mode: 'HTML' })
            });
            return;
          }
          const prod = products.find(p => p.id === qtyState.productId);
          if (prod) {
            const cart = userCarts.get(chatId) || [];
            const existing = cart.find(i => i.productId === prod.id);
            if (existing) { existing.quantity += qty; } else { cart.push({ productId: prod.id, quantity: qty }); }
            userCarts.set(chatId, cart);
            const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
            userStates.delete(chatId);
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `✅ <b>${qty} ${prod.unit}</b> از «${prod.name}» به سبد خرید افزوده شد.\n\n🛒 <b>تعداد کل اقلام سبد:</b> ${totalQty}`, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🛒 سبد خرید', callback_data: 'view_cart' }], [{ text: '🍰 ادامه خرید', callback_data: 'menu_categories' }]] } })
            });
          }
          return;
        }
        // Handle checkout flow text messages
        const checkoutState = userStates.get(chatId);
        // Handle custom order register flow
        const customOrderRegisterState = userStates.get(chatId);
        if (customOrderRegisterState && customOrderRegisterState.mode === 'custom_order_register_name') {
          customOrderRegisterState.customerName = text;
          customOrderRegisterState.mode = 'custom_order_register_phone';
          userStates.set(chatId, customOrderRegisterState);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ نام ثبت شد.\n\n📞 لطفاً <b>شماره تلفن</b> خود را وارد کنید:`,
              parse_mode: 'HTML'
            })
          });
          return;
        }
        if (customOrderRegisterState && customOrderRegisterState.mode === 'custom_order_register_phone') {
          customOrderRegisterState.customerPhone = text;
          customOrderRegisterState.mode = 'custom_order_register_address';
          userStates.set(chatId, customOrderRegisterState);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ شماره تلفن ثبت شد.\n\n🏠 لطفاً <b>آدرس دقیق تحویل</b> را وارد کنید:`,
              parse_mode: 'HTML'
            })
          });
          return;
        }
        if (customOrderRegisterState && customOrderRegisterState.mode === 'custom_order_register_address') {
          const order = customOrders.find(o => o.id === customOrderRegisterState.orderId);
          if (order) {
            order.customerName = customOrderRegisterState.customerName;
            order.customerPhone = customOrderRegisterState.customerPhone;
            order.deliveryAddress = text;
            order.updatedAt = new Date().toISOString();
            saveAllData();
          }
          userStates.set(chatId, { mode: 'custom_order_payment_method', orderId: customOrderRegisterState.orderId });
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ آدرس ثبت شد.\n\n💰 <b>مبلغ کل:</b> <b>${order?.finalPrice?.toLocaleString() || '---'} تومان</b>\n💳 <b>بیعانه:</b> <b>${order?.prepaymentAmount?.toLocaleString() || '---'} تومان</b>\n\nلطفاً روش پرداخت را انتخاب کنید:`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: '💵 پرداخت در محل', callback_data: `custom_order_cash_${customOrderRegisterState.orderId}` }],
                [{ text: '💳 پرداخت هم اکنون', callback_data: `custom_order_online_${customOrderRegisterState.orderId}` }],
                [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
              ]}
            })
          });
          return;
        }
        // Handle custom product text inputs
        const customProductState = userStates.get(chatId);
        if (customProductState && customProductState.mode === 'custom_product_description') {
          customProductState.description = text;
          customProductState.mode = 'custom_product_features';
          userStates.set(chatId, customProductState);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ توضیحات ثبت شد.\n\n🎯 حالا لطفاً <b>ویژگی‌های خاص</b> محصول را بنویسید:\n\n<i>(مثال: طعم شکلات تلخ، وزن ۲ کیلو، بدون گلوتن، تزیین با گل طبیعی)</i>`,
              parse_mode: 'HTML'
            })
          });
          return;
        }
        if (customProductState && customProductState.mode === 'custom_product_features') {
          customProductState.features = text;
          customProductState.mode = 'custom_product_photo';
          userStates.set(chatId, customProductState);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ ویژگی‌ها ثبت شد.\n\n📸 حالا لطفاً <b>عکس نمونه</b> محصول را ارسال کنید (اختیاری):\n\n<i>(اگر عکسی ندارید، روی دکمه زیر کلیک کنید)</i>`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: '⏭️ رد شدن (بدون عکس)', callback_data: 'custom_product_skip_photo' }]
              ]}
            })
          });
          return;
        }
        if (checkoutState && checkoutState.mode?.startsWith('checkout_')) {
          const tgCtx = { token, chatId, products, orders, discounts, customers, botSettings, userCarts, userStates, msg };
          const handled = await handleCheckoutState(tgCtx, text);
          if (handled) return;
        }
      }
      // Handle custom order receipt photo
      const customReceiptState = userStates.get(chatId);
      if (customReceiptState && customReceiptState.mode === 'custom_order_receipt') {
        const photoFileId = msg.photo[msg.photo.length - 1].file_id;
        const order = customOrders.find(o => o.id === customReceiptState.orderId);
        if (order) {
          order.paymentReceiptImage = photoFileId;
          order.isPrepaymentPaid = true;
          order.status = 'approved_by_customer';
          order.updatedAt = new Date().toISOString();
          saveAllData();
          userStates.delete(chatId);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ <b>فیش واریزی با موفقیت دریافت شد!</b>\n\n` +
                `سفارش شما تایید شد و در حال آماده‌سازی است.\n\n` +
                `از اعتماد شما متشکریم! 🙏`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: '📦 پیگیری سفارشات', callback_data: 'track_order' }],
                [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
              ]}
            })
          });
        }
        return;
      }
      // Handle custom product photo
      const customPhotoState = userStates.get(chatId);
      if (customPhotoState && customPhotoState.mode === 'custom_product_photo') {
        const photoFileId = msg.photo[msg.photo.length - 1].file_id;
        customPhotoState.photo = photoFileId;
        customPhotoState.mode = 'custom_product_confirm';
        userStates.set(chatId, customPhotoState);
        // Show confirmation
        const confirmText = `✅ <b>خلاصه محصول سفارشی شما:</b>\n\n` +
          `📂 دسته‌بندی: ${customPhotoState.category}\n` +
          `📝 توضیحات: ${customPhotoState.description}\n` +
          `🎯 ویژگی‌ها: ${customPhotoState.features}\n` +
          `📸 عکس: ✅ ارسال شده\n\n` +
          `آیا اطلاعات صحیح است؟`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: confirmText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '✅ تایید و ارسال', callback_data: 'custom_product_submit' }],
              [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
            ]}
          })
        });
        return;
      }
      // Handle support photo
      const supportPhotoState = userStates.get(chatId);
      if (supportPhotoState && supportPhotoState.mode === 'support_photo') {
        const photoFileId = msg.photo[msg.photo.length - 1].file_id;
        supportPhotoState.photo = photoFileId;
        supportPhotoState.mode = 'support_finalize';
        userStates.set(chatId, supportPhotoState);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '✅ تصویر دریافت شد.\n\nآیا می‌خواهید تیکت را ثبت نهایی کنید؟',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '✅ ثبت نهایی تیکت', callback_data: 'support_finalize' }],
              [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
            ]}
          })
        });
        return;
      }
      // Handle photo message (receipt)
      if (msg.photo && msg.photo.length > 0) {
        const photoState = userStates.get(chatId);
        if (photoState && photoState.mode === 'waiting_for_receipt') {
          const photoFileId = msg.photo[msg.photo.length - 1].file_id;
          const order = orders.find(o => o.id === photoState.orderId);
          if (order) {
            order.paymentReceiptImage = photoFileId;
            order.updatedAt = new Date().toISOString();
            userStates.delete(chatId);
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '✅ عکس فیش واریزی با موفقیت دریافت شد!\n\nسفارش شما در حال بررسی است. پس از تأیید، وضعیت سفارش به‌روزرسانی خواهد شد.',
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[{ text: '📦 سفارشات من', callback_data: 'track_order' }]] }
              })
            });
          }
          return;
        }
      }
    } else if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id.toString();
      const data = cb.data;

      // Answer callback query first
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id })
      });

      // Build context for handlers
      const tgCtx = { token, chatId, products, orders, discounts, customers, supportTickets, customOrders, botSettings, userCarts, userStates };

      // Try telegramHandlers first
      if (data.startsWith('admin_cat_')) {
        const handled = await handleAdminCatSelect(tgCtx, data.replace('admin_cat_', ''));
        if (handled) return;
      }
      
      // Try admin callbacks
      if (data.startsWith('admin_')) {
        const handled = await handleAdminCallback(tgCtx, data);
        if (handled) return;
      }

      // Try customer callbacks
      const customerHandled = await handleCustomerCallback(tgCtx, data);
      if (customerHandled) return;

      // Fallback to old handlers below
      if (data === 'contact_info') {
        const text = `📍 <b>اطلاعات قنادی:</b>\n\n🏢 <b>نام:</b> ${botSettings.storeName}\n📞 <b>تلفن تماس:</b> ${botSettings.storePhone}\n🏠 <b>آدرس:</b> ${botSettings.storeAddress}\n💳 <b>شماره کارت:</b> <code>${botSettings.cardNumber}</code>\n👤 <b>به نام:</b> ${botSettings.cardHolder}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]]
            }
          })
        });
      // Custom Product Flow
      } else if (data === 'custom_product_start') {
        userStates.set(chatId, { mode: 'custom_product_category' });
        const categories = ['🎂 کیک تولد و مناسبتی', '🧁 کاپ‌کیک و مافین', '🍰 شیرینی تر', '🍪 شیرینی خشک', '🍮 دسر و پودینگ', '🥐 نان و کروسان', '🍫 شکلات و ترافل', '🎁 سایر'];
        const buttons = categories.map(cat => [{ text: cat, callback_data: `custom_cat_${cat}` }]);
        buttons.push([{ text: '❌ انصراف', callback_data: 'back_to_main' }]);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🎨 <b>محصول سفارشی شما</b>\n\nلطفاً دسته‌بندی محصول سفارشی خود را انتخاب کنید:',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
          })
        });
      } else if (data.startsWith('custom_cat_')) {
        const category = data.replace('custom_cat_', '');
        const state = userStates.get(chatId) || {};
        state.category = category;
        state.mode = 'custom_product_description';
        userStates.set(chatId, state);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ دسته‌بندی: <b>${category}</b>\n\n📝 حالا لطفاً <b>توضیحات کامل</b> محصول سفارشی خود را بنویسید:\n\n<i>(مثال: کیک شکلاتی ۳ کیلویی با فیلینگ موز و گردو، تزیین با فوندانت آبی و عروسک)</i>`,
            parse_mode: 'HTML'
          })
        });
      } else if (data === 'custom_product_skip_photo') {
        const state = userStates.get(chatId) || {};
        state.photo = null;
        state.mode = 'custom_product_confirm';
        userStates.set(chatId, state);
        // Show confirmation
        const confirmText = `✅ <b>خلاصه محصول سفارشی شما:</b>\n\n` +
          `📂 دسته‌بندی: ${state.category}\n` +
          `📝 توضیحات: ${state.description}\n` +
          `🎯 ویژگی‌ها: ${state.features}\n` +
          `📸 عکس: ❌ ارسال نشده\n\n` +
          `آیا اطلاعات صحیح است؟`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: confirmText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '✅ تایید و ارسال', callback_data: 'custom_product_submit' }],
              [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
            ]}
          })
        });
      } else if (data === 'custom_product_submit') {
        const state = userStates.get(chatId);
        if (!state) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '❌ خطا: اطلاعات سفارش یافت نشد. لطفاً دوباره تلاش کنید.',
              parse_mode: 'HTML'
            })
          });
          return;
        }
        // Save custom order
        const customOrderId = Date.now().toString();
        const newCustomOrder = {
          id: customOrderId,
          orderNumber: `CO-${customOrderId.slice(-6)}`,
          customerName: cb.from?.first_name || 'مشتری',
          customerPhone: '',
          customerTelegramId: chatId,
          customerUsername: cb.from?.username || '',
          pastryType: state.category,
          shapeAndDesign: state.description,
          spongeFlavor: state.features,
          deliveryDate: new Date().toISOString().split('T')[0],
          deliveryType: 'delivery',
          status: 'pending_review',
          chatMessages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        customOrders.unshift(newCustomOrder);
        saveAllData();
        userStates.delete(chatId);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎉 <b>محصول سفارشی شما با موفقیت ثبت شد!</b>\n\n` +
              `🔖 کد سفارش: <code>${newCustomOrder.orderNumber}</code>\n\n` +
              `سفارش شما در حال بررسی است. پس از تایید توسط فروشگاه، با شما تماس گرفته خواهد شد.\n\n` +
              `از اعتماد شما متشکریم! 🙏`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '📦 پیگیری سفارشات', callback_data: 'track_order' }],
              [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
            ]}
          })
        });
      // Custom Order Payment Flow
      } else if (data.startsWith('custom_order_register_')) {
        const orderId = data.replace('custom_order_register_', '');
        const order = customOrders.find(o => o.id === orderId);
        if (!order) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '❌ سفارش یافت نشد.',
              parse_mode: 'HTML'
            })
          });
          return;
        }
        userStates.set(chatId, { mode: 'custom_order_register_name', orderId: orderId });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ <b>ثبت سفارش</b>\n\nلطفاً <b>نام و نام خانوادگی</b> خود را وارد کنید:`,
            parse_mode: 'HTML'
          })
        });
      } else if (data.startsWith('custom_order_cash_')) {
        const orderId = data.replace('custom_order_cash_', '');
        const order = customOrders.find(o => o.id === orderId);
        if (!order) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '❌ سفارش یافت نشد.',
              parse_mode: 'HTML'
            })
          });
          return;
        }
        order.deliveryType = 'pickup';
        order.status = 'approved_by_customer';
        order.updatedAt = new Date().toISOString();
        saveAllData();
        userStates.delete(chatId);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ <b>پرداخت در محل انتخاب شد!</b>\\n\\n` +
              `سفارش شما تایید شد و در حال آماده‌سازی است.\\n\\n` +
              `💰 مبلغ قابل پرداخت در محل: <b>${order.finalPrice?.toLocaleString() || '---'} تومان</b>\\n\\n` +
              `از اعتماد شما متشکریم! 🙏`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '📦 پیگیری سفارشات', callback_data: 'track_order' }],
              [{ text: '🏠 منوی اصلی', callback_data: 'back_to_main' }]
            ]}
          })
        });
      } else if (data.startsWith('custom_order_online_')) {
        const orderId = data.replace('custom_order_online_', '');
        const order = customOrders.find(o => o.id === orderId);
        if (!order) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '❌ سفارش یافت نشد.',
              parse_mode: 'HTML'
            })
          });
          return;
        }
        userStates.set(chatId, { mode: 'custom_order_receipt', orderId: orderId });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `💳 <b>پرداخت آنلاین</b>\n\n` +
              `💰 مبلغ بیعانه: <b>${order.prepaymentAmount?.toLocaleString() || '---'} تومان</b>\n\n` +
              `💳 <b>شماره کارت:</b>\n<code>${botSettings.cardNumber}</code>\n\n` +
              `👤 <b>به نام:</b> ${botSettings.cardHolder}\n\n` +
              `لطفاً مبلغ بیعانه را واریز و <b>عکس فیش واریزی</b> را ارسال فرمایید.`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
            ]}
          })
        });
      } else if (data === 'back_to_main') {
        const welcomeText = `🎂 <b>${botSettings.storeName}</b>\n\n${botSettings.welcomeMessage}`;
        const adminIds = botSettings.adminTelegramIds || [];
        const isAdmin = adminIds.includes(chatId) || chatId === botSettings.adminTelegramId;
        const inlineKeyboard = [
          [
            { text: '🍰 منو و سفارش آنلاین شیرینی', callback_data: 'menu_categories' },
            { text: '🛒 سبد خرید', callback_data: 'view_cart' }
          ],
          [
            { text: '🎨 محصول سفارشی شما', callback_data: 'custom_product_start' }
          ],
          [
            { text: '📦 پیگیری سفارشات', callback_data: 'track_order' },
            { text: '📍 آدرس و تماس قنادی', callback_data: 'contact_info' }
          ],
          [
            { text: '💬 ارسال پیام به پشتیبانی', callback_data: 'support_send' }
          ]
        ];
        if (isAdmin) {
          inlineKeyboard.push([{ text: '👨‍🍳 پنل مدیریت قنادی (ادمین)', callback_data: 'admin_panel' }]);
        }

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: inlineKeyboard }
          })
        });
      } else if (data === 'admin_web_info') {
        const webUrl = botSettings.webAdminUrl || 'https://shirinkam-admin.iran.run';
        const user = botSettings.webAdminUsername || 'admin_shirin';
        const pass = botSettings.webAdminPassword || 'shirin_pass_2025';
        const text = `🌐 <b>مشخصات پنل مدیریت تحت وب:</b>\n\n🔗 <b>آدرس وب:</b>\n<code>${webUrl}</code>\n\n👤 <b>نام کاربری:</b> <code>${user}</code>\n🔑 <b>رمز عبور:</b> <code>${pass}</code>\n\n<i>برای تغییر نام کاربری یا رمز عبور می‌توانید در شبیه‌ساز یا پنل تحت وب اقدام فرمایید.</i>`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 ورود به پنل وب', url: webUrl }],
                [{ text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }]
              ]
            }
          })
        });
      } else if (data === 'menu_categories') {
        const categories = ['کیک و پای', 'شیرینی تر و خامه‌ای', 'شیرینی خشک و سنتی', 'دسر و باقلوا', 'کوکی و بیسکوئیت', 'نان و کروسان'];
        const categoryButtons: any[][] = [];
        for (let i = 0; i < categories.length; i += 2) {
          const row: any[] = [{ text: categories[i], callback_data: `cat_${categories[i]}` }];
          if (categories[i + 1]) row.push({ text: categories[i + 1], callback_data: `cat_${categories[i + 1]}` });
          categoryButtons.push(row);
        }
        categoryButtons.push([
          { text: '🌟 همه محصولات', callback_data: 'cat_all' },
          { text: '🔙 منوی اصلی', callback_data: 'back_to_main' }
        ]);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🧁 <b>لطفاً دسته‌بندی مورد نظر خود را انتخاب نمایید:</b>',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: categoryButtons }
          })
        });
      } else if (data.startsWith('cat_')) {
        const selectedCategory = data.replace('cat_', '');
        const filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);
        if (filteredProducts.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `در دسته‌بندی <b>${selectedCategory === 'all' ? 'همه محصولات' : selectedCategory}</b> در حال حاضر محصول فعالی وجود ندارد.`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت به دسته‌ها', callback_data: 'menu_categories' }]] }
            })
          });
          return;
        }
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🍰 <b>محصولات ${selectedCategory === 'all' ? 'پرفروش' : selectedCategory} (${filteredProducts.length} مورد):</b>`,
            parse_mode: 'HTML'
          })
        });
        for (const prod of filteredProducts.slice(0, 10)) {
          const priceText = prod.discountPercent 
            ? `<s>${prod.price.toLocaleString()}</s> <b>${(prod.price * (100 - prod.discountPercent) / 100).toLocaleString()}</b> (${prod.discountPercent}٪ تخفیف)`
            : `<b>${prod.price.toLocaleString()}</b>`;
          const caption = `🎂 <b>${prod.name}</b>\n\n💰 <b>قیمت:</b> ${priceText} / هر ${prod.unit}\n📦 <b>وضعیت:</b> ${prod.isAvailable ? '🟢 موجود' : '🔴 ناموجود'}\n\n📝 ${prod.description || ''}`;
          const buttons: any[][] = [
            [{ text: `➕ ۱ ${prod.unit}`, callback_data: `add_qty_${prod.id}_1` }, { text: `➕ ۲ ${prod.unit}`, callback_data: `add_qty_${prod.id}_2` }],
            [{ text: '🛒 سبد خرید', callback_data: 'view_cart' }, { text: '🔙 دسته‌ها', callback_data: 'menu_categories' }]
          ];
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: prod.image,
              caption,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: buttons }
            })
          });
        }
      } else if (data.startsWith('custom_qty_')) {
        const prodId = data.replace('custom_qty_', '');
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;
        userStates.set(chatId, { mode: 'custom_qty_input', productId: prodId });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔢 <b>تعداد دلخواه ${prod.name}</b>\n\nلطفاً تعداد (${prod.unit}) را وارد کنید:\n<i>(مثال: 2 یا 4.5)</i>`,
            parse_mode: 'HTML'
          })
        });
      } else if (data.startsWith('add_to_cart_')) {
        const prodId = data.replace('add_to_cart_', '');
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;
        userStates.set(chatId, { mode: 'ask_quantity', productId: prodId });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔢 <b>${prod.name}</b>\n\nچند ${prod.unit} از این محصول می‌خواهید؟\n<i>(فقط عدد وارد کنید، مثلاً: 2)</i>`,
            parse_mode: 'HTML'
          })
        });
      } else if (data === 'view_cart') {
        const cart = userCarts.get(chatId) || [];
        if (cart.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '🛒 <b>سبد خرید شما خالی است!</b>\n\nبرای سفارش از منوی محصولات استفاده کنید.',
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '🍰 مشاهده منو', callback_data: 'menu_categories' }]] }
            })
          });
          return;
        }
        let cartText = '🛒 <b>سبد خرید شما:</b>\n\n';
        let subtotal = 0;
        for (const item of cart) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const effectivePrice = prod.discountPercent ? prod.price * (100 - prod.discountPercent) / 100 : prod.price;
            const itemTotal = effectivePrice * item.quantity;
            subtotal += itemTotal;
            cartText += `🔹 <b>${prod.name}</b>\n   ${item.quantity} ${prod.unit} × ${effectivePrice.toLocaleString()} = <b>${itemTotal.toLocaleString()}</b>\n\n`;
          }
        }
        cartText += `────────────────\n`;
        cartText += `💵 مجموع اقلام: <b>${subtotal.toLocaleString()} تومان</b>\n`;
        cartText += `🛵 هزینه ارسال: پس از انتخاب نحوه دریافت (حضوری / پیک) در مرحله پرداخت محاسبه می‌شود`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: cartText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '💳 ثبت سفارش و پرداخت', callback_data: 'checkout_start' }],
              [{ text: '🗑️ خالی کردن سبد', callback_data: 'clear_cart' }],
              [{ text: '🍰 ادامه خرید', callback_data: 'menu_categories' }],
              [{ text: '🏠 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]
            ]}
          })
        });
      } else if (data === 'clear_cart') {
        userCarts.delete(chatId);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🗑️ سبد خرید شما خالی شد.',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '🍰 مشاهده منو', callback_data: 'menu_categories' }]] }
          })
        });
      } else if (data === 'checkout_start') {
        const tgCtx = { token, chatId, products, orders, discounts, customers, botSettings, userCarts, userStates };
        await startCheckout(tgCtx);
      } else if (data === 'delivery_pickup' || data === 'delivery_delivery' || data === 'payment_cash_on_delivery' || data === 'payment_online' || data === 'has_discount' || data === 'no_discount' || data === 'confirm_order' || data === 'cancel_order') {
        const tgCtx = { token, chatId, products, orders, discounts, customers, botSettings, userCarts, userStates };
        const handled = await handleCheckoutCallback(tgCtx, data);
        if (handled) return;
      } else if (data === 'track_order' || data === 'track_orders_list') {
        const userOrders = orders.filter(o => o.customerTelegramId === chatId);
        if (userOrders.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '📦 شما در حال حاضر سفارشی ندارید.',
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '🍰 ثبت سفارش جدید', callback_data: 'menu_categories' }]] }
            })
          });
          return;
        }
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `📦 <b>سفارشات شما (${userOrders.length} سفارش):</b>`,
            parse_mode: 'HTML'
          })
        });
        for (const ord of userOrders) {
          const statusMap: Record<string, string> = {
            pending_payment: '⏳ در انتظار تأیید',
            paid_checking: '🔍 بررسی فیش',
            baking: '👩‍🍳 در حال پخت',
            shipped: '🛵 ارسال شده',
            delivered: '✅ تحویل شد',
            cancelled: '❌ لغو شده'
          };
          let orderText = `🔖 <b>کد سفارش:</b> <code>${ord.orderNumber}</code>\n`;
          orderText += `📊 وضعیت: <b>${statusMap[ord.status] || ord.status}</b>\n\n`;
          orderText += `📦 <b>اقلام:</b>\n`;
          ord.items.forEach((item, idx) => {
            orderText += `${idx + 1}. ${item.productName}\n`;
            orderText += `   کد: <code>${item.productCode}</code>\n`;
            orderText += `   ${item.quantity} ${item.unit} × ${item.price.toLocaleString()} = <b>${(item.price * item.quantity).toLocaleString()}</b>\n\n`;
          });
          orderText += `─────────────────\n`;
          orderText += `📦 نحوه دریافت: <b>${ord.deliveryMethod === 'pickup' ? '🏪 حضوری' : '🛵 پیک'}</b>\n`;
          orderText += `💳 نحوه پرداخت: <b>${ord.paymentMethod === 'cash_on_delivery' ? '💵 در محل' : '💳 آنلاین'}</b>\n`;
          orderText += `💵 مجموع: <b>${ord.subtotal.toLocaleString()}</b>\n`;
          orderText += `🚚 ارسال: <b>${ord.shippingFee === 0 ? 'رایگان' : ord.shippingFee.toLocaleString()}</b>\n`;
          if (ord.discountAmount > 0) {
            orderText += `🎟️ تخفیف: <b>-${ord.discountAmount.toLocaleString()}</b>\n`;
          }
          orderText += `─────────────────\n`;
          orderText += `💎 <b>مبلغ نهایی: ${ord.totalAmount.toLocaleString()} تومان</b>\n`;
          
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: orderText,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]] }
            })
          });
        }
      } else if (data === 'admin_orders_list') {
        if (orders.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '📦 هیچ سفارشی ثبت نشده است.',
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
            })
          });
          return;
        }
        for (const ord of orders.slice(0, 5)) {
          const items = ord.items.map(i => `▫️ ${i.productName} (${i.quantity} ${i.unit})`).join('\n');
          const caption = `📋 <b>سفارش ${ord.orderNumber}</b>\n\n👤 ${ord.customerName}\n📞 <code>${ord.customerPhone}</code>\n\n${items}\n\n💰 <b>${ord.totalAmount.toLocaleString()} تومان</b>`;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: caption,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: '👩‍🍳 شروع پخت', callback_data: `admin_status_${ord.id}_baking` }, { text: '🛵 ارسال', callback_data: `admin_status_${ord.id}_shipped` }],
                [{ text: '✅ تحویل شد', callback_data: `admin_status_${ord.id}_delivered` }, { text: '❌ لغو', callback_data: `admin_status_${ord.id}_cancelled` }]
              ]}
            })
          });
        }
      } else if (data.startsWith('admin_status_')) {
        const parts = data.replace('admin_status_', '').split('_');
        const orderId = parts[0];
        const newStatus = parts[1] as any;
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          orders[idx].status = newStatus;
          orders[idx].updatedAt = new Date().toISOString();
          const statusLabels: Record<string, string> = { baking: '👩‍🍳 پخت', shipped: '🛵 ارسال', delivered: '✅ تحویل', cancelled: '❌ لغو' };
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ وضعیت سفارش ${orders[idx].orderNumber} به <b>${statusLabels[newStatus] || newStatus}</b> تغییر یافت.`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '📦 سفارشات', callback_data: 'admin_orders_list' }], [{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
            })
          });
        }
      } else if (data === 'admin_products_manager') {
        if (products.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '🧁 هیچ محصولی ثبت نشده. از دکمه «➕ افزودن محصول» استفاده کنید.',
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: '➕ افزودن محصول', callback_data: 'admin_add_product' }],
                [{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]
              ]}
            })
          });
          return;
        }
        for (const prod of products.slice(0, 8)) {
          const caption = `🎂 <b>${prod.name}</b>\n▫️ ${prod.category}\n▫️ قیمت: <b>${prod.price.toLocaleString()}</b> / ${prod.unit}\n▫️ ${prod.isAvailable ? '🟢 موجود' : '🔴 ناموجود'}`;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: caption,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: prod.isAvailable ? '🔴 ناموجود' : '🟢 موجود', callback_data: `admin_toggle_avail_${prod.id}` }, { text: '🗑️ حذف', callback_data: `admin_delete_prod_${prod.id}` }]
              ]}
            })
          });
        }
      } else if (data.startsWith('admin_toggle_avail_')) {
        const prodId = data.replace('admin_toggle_avail_', '');
        const prod = products.find(p => p.id === prodId);
        if (prod) {
          prod.isAvailable = !prod.isAvailable;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ ${prod.name}: <b>${prod.isAvailable ? '🟢 موجود' : '🔴 ناموجود'}</b>`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '🧁 محصولات', callback_data: 'admin_products_manager' }], [{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
            })
          });
        }
      } else if (data.startsWith('admin_delete_prod_')) {
        const prodId = data.replace('admin_delete_prod_', '');
        const idx = products.findIndex(p => p.id === prodId);
        if (idx !== -1) {
          const name = products[idx].name;
          products.splice(idx, 1);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🗑️ محصول <b>${name}</b> حذف شد.`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '🧁 محصولات', callback_data: 'admin_products_manager' }], [{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
            })
          });
        }
      } else if (data === 'admin_add_product') {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '➕ <b>افزودن محصول جدید</b>\n\nلطفاً <b>نام محصول</b> را ارسال کنید:\n<i>(مثال: کیک شکلاتی بلژیکی)</i>',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '❌ انصراف', callback_data: 'admin_panel' }]] }
          })
        });
      } else if (data === 'admin_discounts_list') {
        if (discounts.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '🎟️ هیچ کد تخفیفی ثبت نشده است.',
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
            })
          });
          return;
        }
        let text = '🎟️ <b>کدهای تخفیف:</b>\n\n';
        for (const d of discounts) {
          text += `<code>${d.code}</code> - ${d.type === 'percentage' ? d.value + '٪' : d.value.toLocaleString() + ' تومان'} ${d.isActive ? '🟢' : '🔴'}\n`;
        }
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
          })
        });
      } else if (data === 'admin_customers_manager') {
        if (customers.length === 0) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '👥 هیچ مشتری‌ای ثبت نشده است.\n\nمشتریان پس از اولین خرید اضافه می‌شوند.',
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
            })
          });
          return;
        }
        let text = `👥 <b>مشتریان (${customers.length} نفر):</b>\n\n`;
        for (const c of customers.slice(0, 10)) {
          text += `${c.name} - <code>${c.phone || '---'}</code>\n💳 ${c.walletBalance.toLocaleString()} تومان | ${c.totalOrdersCount} سفارش\n\n`;
        }
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
          })
        });
      } else if (data === 'admin_sales_stats') {
        const totalRevenue = orders.reduce((s, o) => s + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
        const text = `📊 <b>آمار فروش:</b>\n\n💰 مجموع فروش: <b>${totalRevenue.toLocaleString()} تومان</b>\n📦 تعداد سفارشات: <b>${orders.length}</b>\n🧁 محصولات فعال: <b>${products.filter(p => p.isAvailable).length}</b>\n👥 مشتریان: <b>${customers.length}</b>`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
          })
        });
      } else if (data === 'admin_quick_settings') {
        const text = `⚙️ <b>تنظیمات:</b>\n\n💳 کارت: <code>${botSettings.cardNumber}</code>\n👤 ${botSettings.cardHolder}\n🛵 پیک: ${botSettings.shippingFee.toLocaleString()} تومان\n🎁 ارسال رایگان: بالای ${botSettings.freeShippingThreshold.toLocaleString()} تومان`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '👨‍🍳 منوی ادمین', callback_data: 'admin_panel' }]] }
          })
        });
      }
    }
  }

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true, 
        allowedHosts: true,
        hmr: { host: '0.0.0.0' }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Auto-save data every 10 seconds
  setInterval(() => {
    saveAllData();
  }, 10000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Auto-start Telegram polling if token is available
    const envToken = process.env.TELEGRAM_BOT_TOKEN;
    if (envToken) {
      botSettings.telegramBotToken = envToken;
      botSettings.isLiveBotActive = true;
      startTelegramPolling(envToken);
      console.log('🤖 Telegram bot polling started automatically from env variable');
    } else if (botSettings.telegramBotToken && botSettings.isLiveBotActive) {
      startTelegramPolling(botSettings.telegramBotToken);
      console.log('🤖 Telegram bot polling resumed from saved settings');
    }
  });
}

startServer();
