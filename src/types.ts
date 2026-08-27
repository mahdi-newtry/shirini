export type ProductCategory = 
  | 'کیک و پای'
  | 'شیرینی تر و خامه‌ای'
  | 'شیرینی خشک و سنتی'
  | 'دسر و باقلوا'
  | 'کوکی و بیسکوئیت'
  | 'نان و کروسان';

export interface Product {
  id: string;
  productCode: string;
  name: string;
  category: ProductCategory;
  price: number; // in Tomans
  unit: string; // e.g., کیلوگرم, جعبه ۱۲ تایی, دیس نیم‌کیلویی, عدد
  image: string;
  images?: string[];
  description: string;
  isAvailable: boolean;
  discountPercent?: number;
  preparationTimeHours?: number;
  stockKgOrCount?: number;
  createdAt: string;
}

export type OrderStatus = 'pending_payment' | 'paid_checking' | 'baking' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed'; // درصدی یا مبلغی به تومان
  value: number; // e.g. 20 (percent) or 50000 (Tomans)
  minPurchaseAmount?: number; // حداقل مبلغ خرید به تومان
  maxDiscountAmount?: number; // حداکثر سقف تخفیف برای کدهای درصدی
  usageLimit?: number; // سقف کل دفعات استفاده
  usedCount: number; // دفعات استفاده شده
  isActive: boolean;
  expiresAt?: string; // ISO date string
  applicableProductIds?: string[]; // خالی یا تعریف‌نشده = همه محصولات
  description?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerTelegramId?: string;
  /** Telegram @username captured when the customer places the order. */
  customerUsername?: string;
  /** Telegram display name, kept separately from the delivery contact name. */
  customerTelegramName?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  couponCode?: string;
  totalAmount: number;
  status: OrderStatus;
  deliveryMethod: 'pickup' | 'delivery';
  paymentMethod: 'cash_on_delivery' | 'online_payment' | 'card_to_card' | 'online_gateway';
  paymentReceiptImage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForumTopicConfig {
  id: string;
  key: 'orders' | 'finance' | 'products' | 'discounts' | 'support' | 'analytics';
  name: string;
  iconEmoji: string;
  colorHex?: string;
  threadId?: number; // Telegram message_thread_id
  enabled: boolean;
  autoReport: boolean;
  description: string;
  lastReportTime?: string;
  lastReportSummary?: string;
}

export interface BotSettings {
  botName: string;
  botUsername: string;
  storeName: string;
  storeBio: string;
  storePhone: string;
  storeAddress: string;
  cardNumber: string;
  cardHolder: string;
  shabaNumber: string;
  shippingFee: number;
  freeShippingThreshold: number;
  adminTelegramId: string;
  adminTelegramIds: string[];
  welcomeMessage: string;
  helpMessage: string;
  orderSuccessMessage?: string;
  paymentGuideMessage?: string;
  supportMessage?: string;
  aboutUsMessage?: string;
  shippingInfoMessage?: string;
  discountBannerMessage?: string;
  customCakeGuideMessage?: string;
  /** Write-only in the panel API; this is only used while submitting a replacement token. */
  telegramBotToken?: string;
  /** Server-provided status flag; it never contains or reveals the token itself. */
  hasTelegramBotToken?: boolean;
  isLiveBotActive: boolean;
  forumGroupId?: string;
  forumGroupTitle?: string;
  forumAutoCreateTopics?: boolean;
  forumTopics?: ForumTopicConfig[];
  webAdminUrl?: string;
  webAdminUsername?: string;
  webAdminPassword?: string;
  webAdminLastLogin?: string;
}

export type SupportCategory = 
  | 'custom_cake' 
  | 'order_inquiry' 
  | 'payment_issue' 
  | 'feedback' 
  | 'consultation' 
  | 'general';

export type TicketStatus = 'open' | 'in_progress' | 'answered' | 'closed';

export interface SupportTicketReply {
  id: string;
  sender: 'customer' | 'admin';
  senderName: string;
  text: string;
  /** Telegram file_id or an image URL sent with this reply. */
  photo?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerTelegramId: string;
  customerUsername?: string;
  customerPhone?: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: 'low' | 'normal' | 'high';
  orderNumber?: string;
  cakePhoto?: string;
  createdAt: string;
  updatedAt: string;
  replies: SupportTicketReply[];
}

export interface CustomerUser {
  id: string;
  telegramId: string;
  name: string;
  phone: string;
  username?: string;
  address?: string;
  walletBalance: number; // in Tomans (کیف پول مشتری)
  rewardPoints: number; // امتیاز باشگاه مشتریان
  totalOrdersCount: number;
  totalSpentTomans: number;
  tier: 'bronze' | 'silver' | 'gold' | 'vip';
  createdAt: string;
  lastActiveAt: string;
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'deposit' | 'withdraw' | 'cashback' | 'order_payment' | 'admin_adjustment';
  amount: number; // in Tomans
  description: string;
  createdAt: string;
  balanceAfter: number;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'hourly' | 'every_6_hours' | 'every_12_hours' | 'daily' | 'weekly' | 'every_order';
  timeOfDay: string; // e.g. "23:30" or "02:00"
  selectedDays: number[]; // 0=Saturday, 1=Sunday, ... 6=Friday
  autoDownload: boolean;
  keepLastSnapshots: number; // e.g. 10
  notifyTelegramTopic: boolean;
  lastBackupTime?: string;
  nextBackupTime?: string;
}

export type CustomPastryType = 
  | 'کیک تولد و مناسبتی'
  | 'کیک عصرانه و خانگی'
  | 'شیرینی تر و خامه‌ای مجلسی'
  | 'شیرینی خشک و سنتی اعلا'
  | 'کوکی و تارت اختصاصی'
  | 'دسر و باقلوا سفارشی'
  | 'پکیج پذیرایی مراسم و جشن';

export type CustomPastryStatus = 
  | 'pending_review'      // در انتظار بررسی و قیمت‌گذاری قناد
  | 'price_quoted'        // قیمت‌گذاری شد - در انتظار تایید و بیعانه مشتری
  | 'approved_by_customer'// تایید مشتری و واریز بیعانه
  | 'baking'              // در حال پخت و تزیین کارگاه
  | 'ready'               // آماده تحویل / ارسال
  | 'delivered'           // تحویل داده شد
  | 'rejected';           // رد شده یا لغو

export interface CustomPastryChatMessage {
  id: string;
  sender: 'customer' | 'admin';
  senderName: string;
  text: string;
  photo?: string;
  createdAt: string;
}

export interface CustomPastryOrder {
  id: string;
  orderNumber: string; // e.g. CP-8910
  customerName: string;
  customerPhone: string;
  customerTelegramId: string;
  customerUsername?: string;
  /** Telegram display name before/alongside the delivery contact name. */
  customerTelegramName?: string;
  pastryType: CustomPastryType;
  spongeFlavor?: string; // e.g. وانیلی فرانسوی, شکلاتی بلژیکی, ردولوت, هل و زعفران, نسکافه
  fillingFlavor?: string; // e.g. موز و گردو خامه, نوتلا فندقی, پسته شاهانه, کارامل لوتوس, توت‌فرنگی
  weightKg?: number; // وزن تقریبی به کیلوگرم یا تعداد نفرات
  servingCount?: number; // تعداد مهمانان
  tierCount?: number; // تعداد طبقات
  dietaryType?: 'عادی' | 'کم‌شکر' | 'بدون قند (دیابتی)' | 'بدون گلوتن' | 'وگان' | 'کتوژنیک';
  shapeAndDesign: string; // توضیحات طرح، رنگ، فوندانت یا خامه، مدل، تم
  writingOnCake?: string; // متن یا دل‌نوشته روی کیک / پلاکارت
  referenceImages?: string[]; // تصاویر ارسالی مدل/طرح مشتری
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  /** Requested Solar Hijri delivery day, collected from the customer in Iran's timezone. */
  deliveryDate?: string; // مثال: 1405/06/15
  deliveryTimeSlot?: string; // بازه زمانی تحویل مثلا 17:00 الی 20:00
  estimatedPrice?: number; // برآورد تقریبی سیستم
  finalPrice?: number; // قیمت قطعی اعلام شده توسط قناد (تومان)
  prepaymentAmount?: number; // مبلغ بیعانه تعیین شده (تومان)
  isPrepaymentPaid?: boolean; // آیا بیعانه پرداخت شده
  paymentReceiptImage?: string; // فیش بیعانه
  status: CustomPastryStatus;
  adminNotes?: string; // یادداشت داخلی کارگاه/سرقناد
  rejectReason?: string;
  chatMessages: CustomPastryChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface BackupSnapshotStats {
  productsCount: number;
  ordersCount: number;
  customersCount: number;
  totalWalletBalance: number;
  discountsCount: number;
  ticketsCount: number;
  forumTopicsCount: number;
  customOrdersCount?: number;
}

export interface MasterBackupPayload {
  app: string;
  version: string;
  exportTimestamp: string;
  checksum: string;
  environment: 'production' | 'staging' | 'dev';
  metadata: {
    generatedBy: string;
    databaseEngine: string;
    totalEntities: number;
    totalWalletBalances: number;
    storeName: string;
    storePhone: string;
  };
  data: {
    products: Product[];
    orders: Order[];
    customOrders?: CustomPastryOrder[];
    customers: CustomerUser[];
    walletTransactions: WalletTransaction[];
    discounts: DiscountCode[];
    supportTickets: SupportTicket[];
    botSettings: BotSettings;
    backupSchedule?: BackupScheduleConfig;
  };
}

export interface BackupSnapshot {
  id: string;
  filename: string;
  timestamp: string;
  type: 'manual' | 'scheduled' | 'pre_restore_safety';
  sizeBytes: number;
  stats: BackupSnapshotStats;
  checksum: string;
  version: string;
  payload: MasterBackupPayload;
}

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

export interface TelegramMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  photo?: string;
  reply_markup?: {
    inline_keyboard?: TelegramInlineButton[][];
  };
  timestamp: string;
  status?: 'sent' | 'received' | 'read';
}

export interface BotUserState {
  telegramId: string;
  name: string;
  username?: string;
  role: 'customer' | 'admin';
  cart: { productId: string; quantity: number }[];
  currentStep?: string; // for multi-step admin/ordering bot wizard
  tempData?: Record<string, any>;
}
