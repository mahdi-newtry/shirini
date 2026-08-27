import { Product, BotSettings, Order, DiscountCode, SupportTicket, CustomerUser, WalletTransaction, BackupScheduleConfig, BackupSnapshot, CustomPastryOrder } from '../types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_BOT_SETTINGS: BotSettings = {
  botName: '',
  botUsername: '',
  storeName: '',
  storeBio: '',
  storePhone: '',
  storeAddress: '',
  cardNumber: '',
  cardHolder: '',
  shabaNumber: '',
  shippingFee: 0,
  freeShippingThreshold: 0,
  adminTelegramId: '',
  adminTelegramIds: [],
  welcomeMessage: '',
  helpMessage: '',
  orderSuccessMessage: '',
  paymentGuideMessage: '',
  supportMessage: '',
  aboutUsMessage: '',
  shippingInfoMessage: '',
  customCakeGuideMessage: '',
  telegramBotToken: '',
  isLiveBotActive: false,
  forumGroupId: '',
  forumGroupTitle: '',
  forumAutoCreateTopics: false,
  forumTopics: [],
  webAdminUrl: typeof window !== 'undefined' ? window.location.origin : '',
  webAdminUsername: 'admin',
  // The server supplies and hashes the documented initial password; never put
  // a plaintext credential into the browser bundle or settings seed.
  webAdminLastLogin: ''
};

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_DISCOUNT_CODES: DiscountCode[] = [];

export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [];

export const INITIAL_CUSTOMERS: CustomerUser[] = [];

export const INITIAL_WALLET_TRANSACTIONS: WalletTransaction[] = [];

export const INITIAL_CUSTOM_ORDERS: CustomPastryOrder[] = [];

export const INITIAL_BACKUP_SCHEDULE: BackupScheduleConfig = {
  enabled: false,
  frequency: 'daily',
  timeOfDay: '23:30',
  selectedDays: [0, 1, 2, 3, 4, 5, 6],
  autoDownload: false,
  keepLastSnapshots: 10,
  notifyTelegramTopic: false,
  lastBackupTime: '',
  nextBackupTime: ''
};

export const INITIAL_BACKUP_SNAPSHOTS: BackupSnapshot[] = [];
