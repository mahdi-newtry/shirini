import { Product, BotSettings, Order, DiscountCode, SupportTicket, CustomerUser, WalletTransaction, BackupScheduleConfig, BackupSnapshot, CustomPastryOrder } from '../types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_BOT_SETTINGS: BotSettings = {
  botName: 'ربات قنادی شیرین‌کام',
  botUsername: 'ShirinKamPastryBot',
  storeName: 'قنادی و شیرینی‌پزی لوکس شیرین‌کام',
  storeBio: 'عرضه‌کننده انواع کیک‌های سفارشی، شیرینی‌های تر و خشک روز، باقلوا سنتی و دسرهای مدرن با بهترین مواد اولیه',
  storePhone: '۰۲۱-۸۸۹۹۲۲۳۳',
  storeAddress: 'تهران، خیابان ولیعصر، نرسیده به میدان ونک، پلاک ۱۲۴',
  cardNumber: '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸',
  cardHolder: 'محمد رضایی (مدیریت قنادی شیرین‌کام)',
  shabaNumber: 'IR650170000000123456789012',
  shippingFee: 45000,
  freeShippingThreshold: 700000,
  adminTelegramId: 'admin_shirinkam',
  welcomeMessage: '🎂 به ربات سفارش آنلاین شیرینی و کیک قنادی شیرین‌کام خوش آمدید!\nتمام محصولات ما روزانه و با تازه ترین مواد اولیه پخت می‌شوند.\nلطفاً یکی از گزینه‌های زیر را انتخاب نمایید:',
  helpMessage: 'راهنمای ربات:\n🔹 مشاهده محصولات و سفارش: انتخاب دکمه «🍰 منو و سفارش آنلاین»\n🔹 سبد خرید و تسویه: دکمه «🛒 سبد خرید»\n🔹 پیگیری وضعیت سفارش: دکمه «📦 پیگیری سفارش»\n🔹 پنل مدیریت قنادی: ارسال دستور /admin یا دکمه «👨‍🍳 پنل ادمین»',
  orderSuccessMessage: '🎉 <b>سفارش شما با موفقیت ثبت شد!</b>\n\n🔖 <b>شماره سفارش:</b> <code>{orderNumber}</code>\n💰 <b>مبلغ کل:</b> {totalAmount} تومان\n\n💳 لطفاً مبلغ سفارش را به کارت زیر واریز نموده و عکس فیش را ارسال فرمایید:\n<code>{cardNumber}</code>\n\n👨‍🍳 سفارش پس از تایید حسابداری آماده‌سازی خواهد شد.',
  paymentGuideMessage: '💳 <b>اطلاعات پرداخت و واریز کارت‌به‌کارت:</b>\n\n🔹 <b>شماره کارت:</b>\n<code>{cardNumber}</code>\n\n🔹 <b>نام صاحب حساب:</b> {cardHolder}\n🔹 <b>شماره شبا:</b> <code>{shabaNumber}</code>\n\n⚠️ لطفاً پس از انتقال وجه، <b>عکس یا اسکرین‌شات فیش واریزی</b> را در همین چت ارسال نمایید.',
  supportMessage: '👩‍🍳 <b>مرکز پشتیبانی و مشاوره قنادی شیرین‌کام:</b>\n\nهمکاران ما همه‌روزه از ساعت ۹:۰۰ صبح تا ۲۲:۳۰ شب آماده پاسخگویی و مشاوره سفارش کیک و جشن‌ها هستند.\n\n📞 <b>تلفن تماس مستقیم:</b> {storePhone}\n📍 <b>آدرس شعبه مرکزی:</b> {storeAddress}\n\n⚡️ برای ارسال پیام مستقیم، طرح کیک سفارشی یا ثبت انتقاد، می‌توانید پیام خود را در چت ارسال فرمایید.',
  aboutUsMessage: '🏪 <b>درباره مجموعه قنادی شیرین‌کام:</b>\n\nبیش از یک دهه سابقه در پخت انواع کیک‌های لوکس، شیرینی‌های فرانسوی و سنتی ایرانی با باکیفیت‌ترین مواد اولیه.\n\n📍 <b>آدرس:</b> {storeAddress}\n📞 <b>تلفن:</b> {storePhone}\n📸 <b>پیج اینستاگرام:</b> @shirinkam_pastry',
  shippingInfoMessage: '🛵 <b>قوانین و هزینه ارسال با پیک:</b>\n\n🔹 بسته‌بندی در کارتن‌های محکم و جعبه‌های عایق ضدضربه مخصوص کیک.\n🔹 هزینه ارسال ثابت: <b>{shippingFee} تومان</b>\n🔹 <b>ارسال رایگان</b> برای خریدهای بالای <b>{freeShippingThreshold} تومان</b>.',
  customCakeGuideMessage: '🎂 <b>راهنمای سفارش کیک اختصاصی:</b>\n\n۱. ارسال تصویر یا طرح مدنظرتان در چت 📸\n۲. تعیین وزن تقریبی یا تعداد مهمانان (هر نفر ۱۵۰ الی ۲۰۰ گرم)\n۳. انتخاب طعم اسفنج و فیلینگ دلخواه (شکلات، گردو، موز، نوتلا، توت‌فرنگی)\n۴. ثبت متن روی کیک و تاریخ تحویل.',
  telegramBotToken: '',
  isLiveBotActive: false,
  forumGroupId: '-1002345678901',
  forumGroupTitle: 'گروه مدیریت و هماهنگی قنادی شیرین‌کام',
  forumAutoCreateTopics: true,
  forumTopics: [
    {
      id: 'topic-1',
      key: 'orders',
      name: '📦 سفارشات جدید و ارسال',
      iconEmoji: '📦',
      colorHex: '#3b82f6',
      threadId: 2,
      enabled: true,
      autoReport: true,
      description: 'اعلان لحظه‌ای ثبت سفارشات جدید مشتریان، تغییر وضعیت، آماده‌سازی و ارسال با پیک',
      lastReportTime: '2025-01-20T13:20:00.000Z',
      lastReportSummary: 'سفارش جدید SH-8422 به مبلغ ۹۴۰,۰۰۰ تومان ثبت شد.'
    },
    {
      id: 'topic-2',
      key: 'finance',
      name: '💳 واریزی‌ها و فیش‌های بانکی',
      iconEmoji: '💳',
      colorHex: '#10b981',
      threadId: 3,
      enabled: true,
      autoReport: true,
      description: 'گزارش واریزهای کارت‌به‌کارت، ارسال تصویر فیش پرداختی مشتری و تسویه‌های مالی',
      lastReportTime: '2025-01-20T11:45:00.000Z',
      lastReportSummary: 'فیش واریزی سفارش SH-8421 به مبلغ ۱,۱۹۶,۰۰۰ تومان تایید شد.'
    },
    {
      id: 'topic-3',
      key: 'products',
      name: '🧁 موجودی و تغییر قیمت محصولات',
      iconEmoji: '🧁',
      colorHex: '#f59e0b',
      threadId: 4,
      enabled: true,
      autoReport: true,
      description: 'اطلاع‌رسانی تغییر قیمت شیرینی‌ها، اعمال تخفیف‌های ویژه کالا و هشدار اتمام موجودی',
      lastReportTime: '2025-01-16T15:00:00.000Z',
      lastReportSummary: 'محصول کوکی نیویورکی با تخفیف ۱۵٪ در ربات فعال شد.'
    },
    {
      id: 'topic-4',
      key: 'discounts',
      name: '🎟️ کدهای تخفیف و کمپین‌ها',
      iconEmoji: '🎟️',
      colorHex: '#ec4899',
      threadId: 5,
      enabled: true,
      autoReport: true,
      description: 'گزارش استفاده از کدهای تخفیف توسط مشتریان و تعریف کمپین‌های جدید',
      lastReportTime: '2025-01-18T16:00:00.000Z',
      lastReportSummary: 'کد تخفیف SHIRIN20 توسط مشتری استفاده شد.'
    },
    {
      id: 'topic-5',
      key: 'support',
      name: '💬 پیام‌ها و پشتیبانی مشتریان',
      iconEmoji: '💬',
      colorHex: '#8b5cf6',
      threadId: 6,
      enabled: true,
      autoReport: true,
      description: 'دریافت پیام‌ها و درخواست‌های متفرقه مشتریان ارسالی به ربات',
      lastReportTime: '2025-01-20T10:10:00.000Z',
      lastReportSummary: 'مشتری: آیا امکان آماده‌سازی کیک سفارشی با طرح اختصاصی هست؟'
    },
    {
      id: 'topic-6',
      key: 'analytics',
      name: '📊 گزارشات روزانه و آمار فروش',
      iconEmoji: '📊',
      colorHex: '#06b6d4',
      threadId: 7,
      enabled: true,
      autoReport: true,
      description: 'خلاصه آمار فروش شبانه، مجموع دریافتی‌ها و پرفروش‌ترین کیک‌ها و شیرینی‌ها',
      lastReportTime: '2025-01-19T23:00:00.000Z',
      lastReportSummary: 'گزارش فروش روز گذشته: ۲,۱۳۶,۰۰۰ تومان مجموع سفارشات'
    }
  ],
  webAdminUrl: typeof window !== 'undefined' ? window.location.origin : 'https://shirinkam-admin.iran.run',
  webAdminUsername: 'admin_shirin',
  webAdminPassword: 'shirin_pass_2025',
  webAdminLastLogin: '2025-01-20T14:30:00.000Z'
};

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_DISCOUNT_CODES: DiscountCode[] = [];

export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [];

export const INITIAL_CUSTOMERS: CustomerUser[] = [];

export const INITIAL_WALLET_TRANSACTIONS: WalletTransaction[] = [];

export const INITIAL_CUSTOM_ORDERS: CustomPastryOrder[] = [];

export const INITIAL_BACKUP_SCHEDULE: BackupScheduleConfig = {
  enabled: true,
  frequency: 'daily',
  timeOfDay: '23:30',
  selectedDays: [0, 1, 2, 3, 4, 5, 6], // همه روزهای هفته
  autoDownload: false,
  keepLastSnapshots: 10,
  notifyTelegramTopic: true,
  lastBackupTime: '2025-01-19T23:30:00.000Z',
  nextBackupTime: '2025-01-20T23:30:00.000Z'
};

export const INITIAL_BACKUP_SNAPSHOTS: BackupSnapshot[] = [];

