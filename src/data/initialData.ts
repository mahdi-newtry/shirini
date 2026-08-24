import { Product, BotSettings, Order, DiscountCode, SupportTicket, CustomerUser, WalletTransaction, BackupScheduleConfig, BackupSnapshot, CustomPastryOrder } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'کیک تولد شکلاتی بلژیکی با گاناش',
    category: 'کیک و پای',
    price: 420000,
    unit: 'کیلوگرم',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700&auto=format&fit=crop&q=80',
    description: 'کیک اسفنجی شکلاتی ۳ لایه با فیلینگ کرم شکلات بلژیکی، گردوی تفت‌داده شده و موز با روکش گاناش براق.',
    isAvailable: true,
    discountPercent: 10,
    preparationTimeHours: 4,
    stockKgOrCount: 15,
    createdAt: '2025-01-10T10:00:00.000Z'
  },
  {
    id: 'prod-2',
    name: 'شیرینی تر ناپلئونی فرانسوی',
    category: 'شیرینی تر و خامه‌ای',
    price: 360000,
    unit: 'کیلوگرم',
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700&auto=format&fit=crop&q=80',
    description: 'لایه‌های خمیر هزارلای ترد و طلایی با کرم پاتیسیر فرانسوی سبک و پودر قند مرغوب.',
    isAvailable: true,
    preparationTimeHours: 2,
    stockKgOrCount: 20,
    createdAt: '2025-01-11T11:00:00.000Z'
  },
  {
    id: 'prod-3',
    name: 'رولت خامه تازه توت‌فرنگی',
    category: 'شیرینی تر و خامه‌ای',
    price: 340000,
    unit: 'کیلوگرم',
    image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=700&auto=format&fit=crop&q=80',
    description: 'کیک اسفنجی لطیف وانیلی پیچیده شده با خامه قنادی اعلا و پوره توت فرنگی طبیعی.',
    isAvailable: true,
    discountPercent: 5,
    preparationTimeHours: 2,
    stockKgOrCount: 18,
    createdAt: '2025-01-12T09:30:00.000Z'
  },
  {
    id: 'prod-4',
    name: 'باقلوا استانبولی سرشیر و پسته اعلا',
    category: 'دسر و باقلوا',
    price: 580000,
    unit: 'کیلوگرم',
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=700&auto=format&fit=crop&q=80',
    description: 'باقلوای دست‌پخت تنوری با شهد هل و گلاب ناب کاشان، مغز پسته دو پوست سبز رفسنجان و کره حیوانی.',
    isAvailable: true,
    preparationTimeHours: 3,
    stockKgOrCount: 25,
    createdAt: '2025-01-13T14:20:00.000Z'
  },
  {
    id: 'prod-5',
    name: 'شیرینی دانمارکی گل‌محمدی داغ',
    category: 'شیرینی خشک و سنتی',
    price: 290000,
    unit: 'کیلوگرم',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=80',
    description: 'دانمارکی تازه و برشته با کرم هل و زعفران، رومال عسل طبیعی و خلال بادام تست شده.',
    isAvailable: true,
    preparationTimeHours: 1,
    stockKgOrCount: 30,
    createdAt: '2025-01-14T08:00:00.000Z'
  },
  {
    id: 'prod-6',
    name: 'شیرینی نخودچی اعلا زعفرانی',
    category: 'شیرینی خشک و سنتی',
    price: 320000,
    unit: 'جعبه نیم‌کیلویی',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=700&auto=format&fit=crop&q=80',
    description: 'پخته شده با آرد نخودچی دو آتیشه مرغوب، روغن کرمانشاهی و عطر زعفران ممتاز و خلال پسته.',
    isAvailable: true,
    preparationTimeHours: 1,
    stockKgOrCount: 40,
    createdAt: '2025-01-14T12:00:00.000Z'
  },
  {
    id: 'prod-7',
    name: 'کروسان کره‌ای فرانسوی شکلات نوتلا',
    category: 'نان و کروسان',
    price: 110000,
    unit: 'عدد',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=700&auto=format&fit=crop&q=80',
    description: 'کروسان چند لایه با کره فرانسوی ۸۲٪ و مغز شکلات فندقی نوتلای خالص و پودر کاکائو.',
    isAvailable: true,
    preparationTimeHours: 1,
    stockKgOrCount: 35,
    createdAt: '2025-01-15T07:30:00.000Z'
  },
  {
    id: 'prod-8',
    name: 'کوکی نیویورکی با تکه‌های شکلات تلخ و فندق',
    category: 'کوکی و بیسکوئیت',
    price: 85000,
    unit: 'عدد',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=700&auto=format&fit=crop&q=80',
    description: 'کوکی گرم نیویورکی ضخیم و مرطوب در مرکز، با تکه‌های شکلات ۷۰٪ و تکه‌های فندق رست شده.',
    isAvailable: true,
    discountPercent: 15,
    preparationTimeHours: 1,
    stockKgOrCount: 50,
    createdAt: '2025-01-16T15:00:00.000Z'
  }
];

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

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'SH-8421',
    customerName: 'سارا حسینی',
    customerPhone: '09121112233',
    customerAddress: 'تهران، سعادت آباد، میدان کاج، خیابان مروارید، کوچه ۵، پلاک ۱۲، واحد ۴',
    customerTelegramId: '109845214',
    items: [
      {
        productId: 'prod-1',
        productName: 'کیک تولد شکلاتی بلژیکی با گاناش',
        productImage: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700&auto=format&fit=crop&q=80',
        price: 378000,
        quantity: 2,
        unit: 'کیلوگرم'
      },
      {
        productId: 'prod-7',
        productName: 'کروسان کره‌ای فرانسوی شکلات نوتلا',
        productImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=700&auto=format&fit=crop&q=80',
        price: 110000,
        quantity: 4,
        unit: 'عدد'
      }
    ],
    subtotal: 1196000,
    shippingFee: 0, // above threshold
    discountAmount: 0,
    totalAmount: 1196000,
    status: 'baking',
    paymentMethod: 'card_to_card',
    paymentReceiptImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    notes: 'لطفاً روی کیک بنویسید: «تولدت مبارک آرتین جان»',
    createdAt: '2025-01-20T11:15:00.000Z',
    updatedAt: '2025-01-20T11:45:00.000Z'
  },
  {
    id: 'ord-102',
    orderNumber: 'SH-8422',
    customerName: 'امیرحسین مهدوی',
    customerPhone: '09355556677',
    customerAddress: 'تهران، یوسف آباد، خیابان ابن سینا، پلاک ۳۳',
    customerTelegramId: '87654321',
    items: [
      {
        productId: 'prod-4',
        productName: 'باقلوا استانبولی سرشیر و پسته اعلا',
        productImage: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=700&auto=format&fit=crop&q=80',
        price: 580000,
        quantity: 1,
        unit: 'کیلوگرم'
      },
      {
        productId: 'prod-2',
        productName: 'شیرینی تر ناپلئونی فرانسوی',
        productImage: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700&auto=format&fit=crop&q=80',
        price: 360000,
        quantity: 1,
        unit: 'کیلوگرم'
      }
    ],
    subtotal: 940000,
    shippingFee: 0,
    discountAmount: 0,
    totalAmount: 940000,
    status: 'paid_checking',
    paymentMethod: 'card_to_card',
    notes: 'تحویل تا ساعت ۶ عصر امروز ممکن است؟',
    createdAt: '2025-01-20T13:20:00.000Z',
    updatedAt: '2025-01-20T13:20:00.000Z'
  }
];

export const INITIAL_DISCOUNT_CODES: DiscountCode[] = [
  {
    id: 'disc-1',
    code: 'SHIRIN20',
    type: 'percentage',
    value: 20,
    minPurchaseAmount: 300000,
    maxDiscountAmount: 120000,
    usageLimit: 100,
    usedCount: 14,
    isActive: true,
    description: 'تخفیف ۲۰ درصدی سفارش اول برای خریدهای بالای ۳۰۰ هزار تومان (سقف ۱۲۰ هزار تومان)',
    createdAt: '2025-01-10T12:00:00.000Z'
  },
  {
    id: 'disc-2',
    code: 'WELCOME50',
    type: 'fixed',
    value: 50000,
    minPurchaseAmount: 250000,
    usageLimit: 50,
    usedCount: 22,
    isActive: true,
    description: 'کد هدیه ۵۰ هزار تومانی به مناسبت عضویت در ربات تلگرام قنادی',
    createdAt: '2025-01-12T14:00:00.000Z'
  },
  {
    id: 'disc-3',
    code: 'BAHAR1404',
    type: 'percentage',
    value: 15,
    minPurchaseAmount: 400000,
    maxDiscountAmount: 90000,
    usageLimit: 200,
    usedCount: 5,
    isActive: true,
    description: 'جشنواره بهاره شیرین‌کام - ۱۵٪ تخفیف روی انواع کیک و شیرینی تر',
    createdAt: '2025-01-15T09:00:00.000Z'
  },
  {
    id: 'disc-4',
    code: 'VIP100',
    type: 'fixed',
    value: 100000,
    minPurchaseAmount: 600000,
    usageLimit: 30,
    usedCount: 8,
    isActive: true,
    description: 'بن تخفیف ویژه ۱۰۰ هزار تومانی مشتریان وفادار قنادی',
    createdAt: '2025-01-18T16:00:00.000Z'
  }
];

export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    ticketNumber: 'TK-9201',
    customerName: 'مهسا کاظمی',
    customerTelegramId: '109845214',
    customerUsername: 'mahsak_77',
    customerPhone: '09123334455',
    category: 'custom_cake',
    subject: 'سفارش کیک تولد ۲ طبقه با تم پاییز و ماکارون',
    message: 'سلام وقتتون بخیر، من برای روز جمعه هفته آینده یک کیک تولد ۲ طبقه حدود ۴ کیلو با فیلینگ موز و نوتلا و دیزاین پاییزی با ماکارون می‌خواستم. آیا امکان اجراش هست و هزینه حدودی چقدر میشه؟',
    cakePhoto: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&auto=format&fit=crop&q=80',
    status: 'open',
    priority: 'high',
    createdAt: '2025-01-20T10:15:00.000Z',
    updatedAt: '2025-01-20T10:15:00.000Z',
    replies: [
      {
        id: 'rep-1',
        sender: 'customer',
        senderName: 'مهسا کاظمی',
        text: 'سلام وقتتون بخیر، من برای روز جمعه هفته آینده یک کیک تولد ۲ طبقه حدود ۴ کیلو با فیلینگ موز و نوتلا و دیزاین پاییزی با ماکارون می‌خواستم. آیا امکان اجراش هست و هزینه حدودی چقدر میشه؟',
        createdAt: '2025-01-20T10:15:00.000Z'
      }
    ]
  },
  {
    id: 'tkt-2',
    ticketNumber: 'TK-8421',
    customerName: 'سارا حسینی',
    customerTelegramId: '109845214',
    customerUsername: 'sara_hosseini',
    customerPhone: '09121112233',
    orderNumber: 'SH-8421',
    category: 'order_inquiry',
    subject: 'هماهنگی ساعت تحویل سفارش و متن روی کیک',
    message: 'سلام، سفارش SH-8421 رو ثبت کردم. لطفاً حتماً تا ساعت ۱۸ به دستم برسه چون مهمونی ساعت ۱۹ شروع میشه. روی کیک هم حتماً بنویسید «تولدت مبارک آرتین جان». ممنون از کیفیت خوبتون.',
    status: 'answered',
    priority: 'normal',
    createdAt: '2025-01-20T11:20:00.000Z',
    updatedAt: '2025-01-20T11:35:00.000Z',
    replies: [
      {
        id: 'rep-1',
        sender: 'customer',
        senderName: 'سارا حسینی',
        text: 'سلام، سفارش SH-8421 رو ثبت کردم. لطفاً حتماً تا ساعت ۱۸ به دستم برسه چون مهمونی ساعت ۱۹ شروع میشه. روی کیک هم حتماً بنویسید «تولدت مبارک آرتین جان». ممنون از کیفیت خوبتون.',
        createdAt: '2025-01-20T11:20:00.000Z'
      },
      {
        id: 'rep-2',
        sender: 'admin',
        senderName: 'سرآشپز قنادی شیرین‌کام',
        text: 'سلام سرکار خانم حسینی عزیز، سفارش شما با کد SH-8421 در بخش تزئین قرار دارد و متن مورد نظر شما با خط خوش شکلاتی نوشته خواهد شد. پیک ویژه هماهنگ شده و راس ساعت ۱۷:۳۰ تحویل شما خواهد شد. با آرزوی اوقاتی شاد! 🎉',
        createdAt: '2025-01-20T11:35:00.000Z'
      }
    ]
  },
  {
    id: 'tkt-3',
    ticketNumber: 'TK-7512',
    customerName: 'علی رضایی',
    customerTelegramId: '204918231',
    customerUsername: 'ali_rezaei',
    customerPhone: '09351239876',
    category: 'consultation',
    subject: 'شیرینی بدون شکر (رژیمی) و مناسب افراد دیابتی',
    message: 'درود، آیا شیرینی خشک یا کیکی دارید که با استویا یا قند طبیعی پخته شده باشه و برای افراد دیابتی مشکلی نداشته باشه؟ برای مراسم عیادت می‌خواستم.',
    status: 'answered',
    priority: 'normal',
    createdAt: '2025-01-19T14:40:00.000Z',
    updatedAt: '2025-01-19T15:10:00.000Z',
    replies: [
      {
        id: 'rep-1',
        sender: 'customer',
        senderName: 'علی رضایی',
        text: 'درود، آیا شیرینی خشک یا کیکی دارید که با استویا یا قند طبیعی پخته شده باشه و برای افراد دیابتی مشکلی نداشته باشه؟ برای مراسم عیادت می‌خواستم.',
        createdAt: '2025-01-19T14:40:00.000Z'
      },
      {
        id: 'rep-2',
        sender: 'admin',
        senderName: 'واحد سلامت قنادی',
        text: 'سلام جناب رضایی، بله ما کوکی‌های جو دوسر با شیره توت خالص و همچنین شیرینی نخودچی با استویا تولید می‌کنیم که دارای گواهی سلامت و کاملاً مناسب افراد دیابتی می‌باشد. می‌توانید در منوی ربات بخش شیرینی خشک سفارش دهید.',
        createdAt: '2025-01-19T15:10:00.000Z'
      }
    ]
  }
];

export const INITIAL_CUSTOMERS: CustomerUser[] = [
  {
    id: 'usr-101',
    telegramId: '109845214',
    name: 'سارا حسینی',
    phone: '09121112233',
    username: 'sara_hosseini',
    address: 'تهران، سعادت آباد، میدان کاج، خیابان مروارید، کوچه ۵، پلاک ۱۲، واحد ۴',
    walletBalance: 250000, // ۲۵۰ هزار تومان در کیف پول
    rewardPoints: 520,
    totalOrdersCount: 6,
    totalSpentTomans: 3850000,
    tier: 'gold',
    createdAt: '2025-01-05T10:00:00.000Z',
    lastActiveAt: '2025-01-20T13:20:00.000Z'
  },
  {
    id: 'usr-102',
    telegramId: '87654321',
    name: 'امیرحسین مهدوی',
    phone: '09355556677',
    username: 'amir_mahdavi',
    address: 'تهران، یوسف آباد، خیابان ابن سینا، پلاک ۳۳',
    walletBalance: 180000, // ۱۸۰ هزار تومان
    rewardPoints: 340,
    totalOrdersCount: 4,
    totalSpentTomans: 2450000,
    tier: 'silver',
    createdAt: '2025-01-08T14:30:00.000Z',
    lastActiveAt: '2025-01-20T11:45:00.000Z'
  },
  {
    id: 'usr-103',
    telegramId: '304918231',
    name: 'مهسا کاظمی',
    phone: '09123334455',
    username: 'mahsak_77',
    address: 'تهران، نیاوران، خیابان مژده، پلاک ۱۸',
    walletBalance: 320000, // ۳۲۰ هزار تومان
    rewardPoints: 680,
    totalOrdersCount: 8,
    totalSpentTomans: 5900000,
    tier: 'vip',
    createdAt: '2025-01-02T09:15:00.000Z',
    lastActiveAt: '2025-01-20T10:15:00.000Z'
  },
  {
    id: 'usr-104',
    telegramId: '204918231',
    name: 'علی رضایی',
    phone: '09351239876',
    username: 'ali_rezaei',
    address: 'تهران، پاسداران، بوستان دوم، پلاک ۷',
    walletBalance: 95000, // ۹۵ هزار تومان
    rewardPoints: 190,
    totalOrdersCount: 2,
    totalSpentTomans: 1120000,
    tier: 'bronze',
    createdAt: '2025-01-14T11:20:00.000Z',
    lastActiveAt: '2025-01-19T15:10:00.000Z'
  },
  {
    id: 'usr-105',
    telegramId: '419283746',
    name: 'فاطمه نوری',
    phone: '09197778899',
    username: 'fatemeh_nouri',
    address: 'تهران، شهرک غرب، فاز ۳، بلوار پاکنژاد',
    walletBalance: 150000, // ۱۵۰ هزار تومان
    rewardPoints: 260,
    totalOrdersCount: 3,
    totalSpentTomans: 1840000,
    tier: 'silver',
    createdAt: '2025-01-10T16:45:00.000Z',
    lastActiveAt: '2025-01-18T18:00:00.000Z'
  }
];

export const INITIAL_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'wtx-1',
    customerId: 'usr-101',
    customerName: 'سارا حسینی',
    type: 'deposit',
    amount: 200000,
    description: 'شارژ آنلاین کیف پول از درگاه شتاب',
    createdAt: '2025-01-15T12:00:00.000Z',
    balanceAfter: 200000
  },
  {
    id: 'wtx-2',
    customerId: 'usr-101',
    customerName: 'سارا حسینی',
    type: 'cashback',
    amount: 50000,
    description: 'پاداش کش‌بک سفارش کیک تولد (جشنواره شیرین‌کام)',
    createdAt: '2025-01-20T11:45:00.000Z',
    balanceAfter: 250000
  },
  {
    id: 'wtx-3',
    customerId: 'usr-103',
    customerName: 'مهسا کاظمی',
    type: 'deposit',
    amount: 300000,
    description: 'واریز کارت‌به‌کارت و افزایش اعتبار کیف پول',
    createdAt: '2025-01-18T14:20:00.000Z',
    balanceAfter: 300000
  },
  {
    id: 'wtx-4',
    customerId: 'usr-103',
    customerName: 'مهسا کاظمی',
    type: 'cashback',
    amount: 20000,
    description: 'کش‌بک خرید ۵ درصدی باشگاه مشتریان VIP',
    createdAt: '2025-01-19T09:30:00.000Z',
    balanceAfter: 320000
  }
];

export const INITIAL_CUSTOM_ORDERS: CustomPastryOrder[] = [
  {
    id: 'custom-1',
    orderNumber: 'CP-7011',
    customerName: 'سارا حسینی',
    customerPhone: '09121112233',
    customerTelegramId: '109845214',
    customerUsername: 'sarah_h',
    pastryType: 'کیک تولد و مناسبتی',
    spongeFlavor: 'شکلاتی بلژیکی با پودر کاکائو هلندی',
    fillingFlavor: 'موز، گردوی تست شده و نوتلا خالص',
    weightKg: 3.5,
    servingCount: 22,
    tierCount: 2,
    dietaryType: 'عادی',
    shapeAndDesign: 'طرح تم کهکشانی و شب پرستاره با رنگ زمینه سرمه‌ای متالیک، دیزاین شکلات بادبانی و دانه‌های شکری نقره‌ای',
    writingOnCake: 'تولدت مبارک آرتین جان 💙✨',
    referenceImages: [
      'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700&auto=format&fit=crop&q=80'
    ],
    deliveryType: 'delivery',
    deliveryAddress: 'تهران، سعادت آباد، میدان کاج، خیابان مروارید، کوچه ۵، پلاک ۱۲، واحد ۴',
    deliveryDate: '1404/11/05',
    deliveryTimeSlot: '۱۷:۰۰ الی ۲۰:۰۰',
    estimatedPrice: 1650000,
    finalPrice: 1750000,
    prepaymentAmount: 600000,
    isPrepaymentPaid: true,
    paymentReceiptImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    status: 'baking',
    adminNotes: 'شکلات‌های دست‌ساز بادبانی طلایی آماده شده. طبقه دوم فردا صبح فیلینگ‌گذاری شود.',
    chatMessages: [
      {
        id: 'cmsg-1',
        sender: 'customer',
        senderName: 'سارا حسینی',
        text: 'سلام خسته نباشید، امکانش هست رنگ سرمه‌ای کیک مات باشه نه خیلی براق؟',
        createdAt: '2025-01-20T10:15:00.000Z'
      },
      {
        id: 'cmsg-2',
        sender: 'admin',
        senderName: 'سرقناد شیرین‌کام',
        text: 'سلام خانم حسینی عزیز، بله حتماً با مخمل‌پاشی شکلات سرمه‌ای مات اجرا می‌کنیم تا جلوه فوق‌العاده‌ای داشته باشه.',
        createdAt: '2025-01-20T10:25:00.000Z'
      }
    ],
    createdAt: '2025-01-19T14:30:00.000Z',
    updatedAt: '2025-01-20T10:25:00.000Z'
  },
  {
    id: 'custom-2',
    orderNumber: 'CP-7012',
    customerName: 'علی محمدی',
    customerPhone: '09122223344',
    customerTelegramId: '208741963',
    customerUsername: 'ali_mohammadi',
    pastryType: 'شیرینی تر و خامه‌ای مجلسی',
    spongeFlavor: 'وانیلی فرانسوی و نسکافه‌ای لایه‌ای',
    fillingFlavor: 'کرم پاتیسیر پسته شاهانه و خلال پسته تازه',
    weightKg: 5,
    servingCount: 40,
    dietaryType: 'کم‌شکر',
    shapeAndDesign: 'چیدمان در ۳ دیس استیل مجلسی ویژه مراسم دفاعیه، تزیین با گل‌های طبیعی خوراکی ارگانیک و ورق طلای خوراکی',
    writingOnCake: 'موفقیت در دفاعیه دکتری - دکتر محمدی 🎓',
    referenceImages: [
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700&auto=format&fit=crop&q=80'
    ],
    deliveryType: 'delivery',
    deliveryAddress: 'تهران، میدان ونک، خیابان ملاصدرا، پلاک ۸۵، دانشکده مهندسی',
    deliveryDate: '1404/11/06',
    deliveryTimeSlot: '۱۰:۰۰ الی ۱۲:۰۰ صبح',
    estimatedPrice: 2100000,
    finalPrice: 2250000,
    prepaymentAmount: 800000,
    isPrepaymentPaid: false,
    status: 'price_quoted',
    adminNotes: 'گل‌های ارگانیک سفارش داده شد. دیس‌ها از انبار تشریفات رزرو شد.',
    chatMessages: [
      {
        id: 'cmsg-3',
        sender: 'admin',
        senderName: 'قنادی شیرین‌کام',
        text: 'جناب آقای محمدی، قیمت کل سفارش شما به همراه ۳ دیس تشریفاتی و تزیینات ویژه ۲,۲۵۰,۰۰۰ تومان برآورد شد. مبلغ بیعانه ۸۰۰,۰۰۰ تومان می‌باشد.',
        createdAt: '2025-01-20T11:00:00.000Z'
      }
    ],
    createdAt: '2025-01-20T09:40:00.000Z',
    updatedAt: '2025-01-20T11:00:00.000Z'
  },
  {
    id: 'custom-3',
    orderNumber: 'CP-7013',
    customerName: 'مهسا کاظمی',
    customerPhone: '09355556677',
    customerTelegramId: '304859124',
    customerUsername: 'mahsa_kz',
    pastryType: 'کیک عصرانه و خانگی',
    spongeFlavor: 'هویج، گردو و دارچین سیلان',
    fillingFlavor: 'کرم پنیر خامه‌ای لایت کم‌چرب و دارچین',
    weightKg: 2,
    servingCount: 12,
    tierCount: 1,
    dietaryType: 'بدون گلوتن',
    shapeAndDesign: 'قالب شیاردار نوردیک با رومال سس کارامل شور بدون شکر و خلال بادام برشته',
    writingOnCake: 'Sweet 30th Birthday Mahsa 🌸',
    deliveryType: 'pickup',
    deliveryDate: '1404/11/08',
    deliveryTimeSlot: '۱۵:۰۰ الی ۱۷:۰۰',
    estimatedPrice: 920000,
    status: 'pending_review',
    chatMessages: [],
    createdAt: '2025-01-20T13:10:00.000Z',
    updatedAt: '2025-01-20T13:10:00.000Z'
  }
];

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

export const INITIAL_BACKUP_SNAPSHOTS: BackupSnapshot[] = [
  {
    id: 'snap-1737329400000',
    filename: 'shirinkam-auto-backup-1404-10-29.json',
    timestamp: '2025-01-19T23:30:00.000Z',
    type: 'scheduled',
    sizeBytes: 42800,
    version: '2.5.0',
    checksum: 'a8f4c2e190b38d67e41982cf0b5a12cd894ef712',
    stats: {
      productsCount: 8,
      ordersCount: 2,
      customersCount: 5,
      totalWalletBalance: 995000,
      discountsCount: 4,
      ticketsCount: 3,
      forumTopicsCount: 6
    },
    payload: {
      app: 'ShirinKam Pastry Management System',
      version: '2.5.0',
      exportTimestamp: '2025-01-19T23:30:00.000Z',
      checksum: 'a8f4c2e190b38d67e41982cf0b5a12cd894ef712',
      environment: 'production',
      metadata: {
        generatedBy: 'AutoScheduler-Daemon',
        databaseEngine: 'MasterInMemoryEngine',
        totalEntities: 28,
        totalWalletBalances: 995000,
        storeName: 'قنادی و شیرینی‌پزی لوکس شیرین‌کام',
        storePhone: '۰۲۱-۸۸۹۹۲۲۳۳'
      },
      data: {
        products: INITIAL_PRODUCTS,
        orders: INITIAL_ORDERS,
        customers: INITIAL_CUSTOMERS,
        walletTransactions: INITIAL_WALLET_TRANSACTIONS,
        discounts: INITIAL_DISCOUNT_CODES,
        supportTickets: INITIAL_SUPPORT_TICKETS,
        botSettings: INITIAL_BOT_SETTINGS,
        backupSchedule: INITIAL_BACKUP_SCHEDULE
      }
    }
  },
  {
    id: 'snap-1737243000000',
    filename: 'shirinkam-manual-snapshot-predeploy.json',
    timestamp: '2025-01-18T18:00:00.000Z',
    type: 'manual',
    sizeBytes: 41200,
    version: '2.5.0',
    checksum: '6e29bc37f19034aa78de0129bc83f081297e61da',
    stats: {
      productsCount: 8,
      ordersCount: 2,
      customersCount: 5,
      totalWalletBalance: 995000,
      discountsCount: 4,
      ticketsCount: 3,
      forumTopicsCount: 6
    },
    payload: {
      app: 'ShirinKam Pastry Management System',
      version: '2.5.0',
      exportTimestamp: '2025-01-18T18:00:00.000Z',
      checksum: '6e29bc37f19034aa78de0129bc83f081297e61da',
      environment: 'production',
      metadata: {
        generatedBy: 'Admin-Manual',
        databaseEngine: 'MasterInMemoryEngine',
        totalEntities: 28,
        totalWalletBalances: 995000,
        storeName: 'قنادی و شیرینی‌پزی لوکس شیرین‌کام',
        storePhone: '۰۲۱-۸۸۹۹۲۲۳۳'
      },
      data: {
        products: INITIAL_PRODUCTS,
        orders: INITIAL_ORDERS,
        customers: INITIAL_CUSTOMERS,
        walletTransactions: INITIAL_WALLET_TRANSACTIONS,
        discounts: INITIAL_DISCOUNT_CODES,
        supportTickets: INITIAL_SUPPORT_TICKETS,
        botSettings: INITIAL_BOT_SETTINGS,
        backupSchedule: INITIAL_BACKUP_SCHEDULE
      }
    }
  }
];

