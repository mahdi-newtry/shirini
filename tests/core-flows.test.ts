import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleCustomerCallback } from '../src/telegramHandlers';
import { handleCheckoutCallback } from '../src/checkoutFlow';
import { generateUniqueOrderNumber, normalizeOrderNumber, resolveUniqueOrderNumber } from '../src/utils/orderNumber';
import { normalizeOrderSearchValue } from '../src/components/OrderManager';
import { getTicketImageSource } from '../src/components/SupportManager';
import { resolveTelegramImageSource } from '../src/utils/telegramImage';
import { CUSTOM_ORDER_STATUS_LABELS, formatCustomOrderTrackingMessage } from '../src/utils/customOrderTracking';
import { compactSearchValue, matchesSearchValues, normalizeSearchValue } from '../src/utils/search';
import {
  formatIranianDeliveryDate,
  getIranianPersianDate,
  normalizeIranianDeliveryDate,
  normalizeIranianDeliveryTime,
} from '../src/utils/iranianDate';
import { DEFAULT_PANEL_PASSWORD, DEFAULT_PANEL_USERNAME, getPanelCredentials, omitPanelPassword } from '../src/utils/panelAuth';

const sentMessages: string[] = [];
(globalThis as any).fetch = async (_url: string, init?: { body?: string }) => {
  sentMessages.push(init?.body || '');
  return { ok: true, json: async () => ({ ok: true }) };
};

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    token: 'test-token',
    chatId: '731245',
    products: [],
    orders: [],
    discounts: [],
    customers: [],
    supportTickets: [],
    customOrders: [],
    botSettings: {},
    userCarts: new Map(),
    userStates: new Map(),
    ...overrides,
  } as any;
}

function testTelegramImageResolver() {
  const telegramFileId = 'AgAC+/=_test-reply-photo';
  const expectedProxy = '/api/telegram/file/AgAC%2B%2F%3D_test-reply-photo';

  assert.equal(resolveTelegramImageSource(telegramFileId), expectedProxy);
  assert.equal(getTicketImageSource(telegramFileId), expectedProxy);
  assert.equal(resolveTelegramImageSource(' https://example.test/legacy-photo.jpg '), 'https://example.test/legacy-photo.jpg');
  assert.equal(resolveTelegramImageSource('data:image/png;base64,aGVsbG8='), 'data:image/png;base64,aGVsbG8=');
  assert.equal(resolveTelegramImageSource('blob:https://panel.example/receipt'), 'blob:https://panel.example/receipt');
  assert.equal(resolveTelegramImageSource('/uploads/receipt.png'), '/uploads/receipt.png');
  assert.equal(resolveTelegramImageSource('./uploads/receipt.png'), './uploads/receipt.png');
  assert.equal(resolveTelegramImageSource('uploads/legacy-receipt.webp?version=4'), 'uploads/legacy-receipt.webp?version=4');
  assert.equal(resolveTelegramImageSource('   '), null);
  assert.equal(resolveTelegramImageSource(), null);
}

async function testTicketUsesTelegramAccountAndKnownPhone() {
  const userStates = new Map<string, any>();
  const customers = [{
    id: 'usr-1',
    telegramId: '731245',
    name: 'نام ثبت‌شده سفارش',
    phone: '09121234567',
    username: 'previous_username',
    address: 'تهران',
    walletBalance: 0,
    rewardPoints: 0,
    totalOrdersCount: 1,
    totalSpentTomans: 0,
    tier: 'bronze',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  }];
  const ctx = makeContext({
    customers,
    userStates,
    telegramUser: {
      id: 731245,
      first_name: 'نگار',
      last_name: 'رضایی',
      username: 'negar_live',
    },
  });
  userStates.set(ctx.chatId, {
    mode: 'support_finalize',
    category: 'general',
    subject: 'پیگیری سفارش',
    message: 'لطفاً وضعیت سفارش را بفرمایید.',
    photo: 'AgACAgQAAxkBAAIB-test-initial-photo',
  });

  assert.equal(await handleCustomerCallback(ctx, 'support_finalize'), true);
  assert.equal(ctx.supportTickets.length, 1);

  const ticket = ctx.supportTickets[0];
  assert.equal(ticket.customerName, 'نگار رضایی');
  assert.equal(ticket.customerUsername, 'negar_live');
  assert.equal(ticket.customerTelegramId, ctx.chatId);
  assert.equal(ticket.customerPhone, '09121234567');
  assert.equal(ticket.cakePhoto, 'AgACAgQAAxkBAAIB-test-initial-photo');
  assert.equal(ticket.replies[0].senderName, 'نگار رضایی');
  assert.equal(customers[0].username, 'negar_live');
  assert.equal(userStates.has(ctx.chatId), false);
}

async function testTicketDoesNotInventPhoneAndPhotoReplyKeepsFileIdContract() {
  const userStates = new Map<string, any>();
  const ctx = makeContext({
    chatId: '910001',
    userStates,
    telegramUser: { id: 910001, first_name: 'سارا', username: 'sara_test' },
  });
  userStates.set(ctx.chatId, {
    mode: 'support_finalize',
    category: 'feedback',
    subject: 'نظر',
    message: 'سپاسگزارم',
  });

  assert.equal(await handleCustomerCallback(ctx, 'support_finalize'), true);
  const ticket = ctx.supportTickets[0];
  assert.equal(ticket.customerName, 'سارا');
  assert.equal(ticket.customerUsername, 'sara_test');
  assert.equal(ticket.customerPhone, '');

  // The live-update portion is deliberately kept at the server boundary (it
  // receives Telegram's msg.photo). Verify its persisted reply contract and
  // its UI consumer so a file_id cannot regress to an unrendered Markdown URL.
  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const supportManagerSource = fs.readFileSync(new URL('../src/components/SupportManager.tsx', import.meta.url), 'utf8');
  const resolverSource = fs.readFileSync(new URL('../src/utils/telegramImage.ts', import.meta.url), 'utf8');
  assert.match(serverSource, /telegramUser:\s*cb\.from/);
  assert.match(serverSource, /replyPhotoState[\s\S]{0,1200}photo:\s*photoFileId/);
  assert.doesNotMatch(serverSource, /savedPhotoUrl/);
  assert.match(supportManagerSource, /reply\.photo \|\| getLegacyReplyImage\(reply\.text\)/);
  assert.match(resolverSource, /api\/telegram\/file\/\$\{encodeURIComponent\(normalizedReference\)\}/);
}

function testProductImagesStayReachableForTelegram() {
  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const persistenceSource = fs.readFileSync(new URL('../src/persistData.ts', import.meta.url), 'utf8');

  // A Telegram Bot API photo URL is fetched outside the browser and therefore
  // cannot send the authenticated panel cookie. New catalog photos have a
  // narrow public route, while arbitrary /data files remain protected.
  assert.match(serverSource, /app\.get\('\/product-images\/:filename', servePublicProductImage\('product-images', false\)\)/);
  assert.match(serverSource, /app\.get\('\/data\/:filename', servePublicProductImage\('data', true\)\)/);
  assert.match(serverSource, /isReferencedProductImage/);
  assert.match(serverSource, /\/product-images\/\$\{encodeURIComponent\(filename\)\}/);
  assert.match(serverSource, /app\.use\('\/data', requirePanelAuth\)/);
  assert.match(serverSource, /PRODUCT_IMAGE_DIR/);
  assert.match(persistenceSource, /export const DATA_DIR/);
}

function testCustomOrdersAppearInCustomerTrackingWithDetails() {
  const customOrder = {
    id: 'custom-tracking-1',
    orderNumber: 'CO-123456',
    customerName: 'نگار رضایی',
    customerPhone: '09121234567',
    customerTelegramId: '731245',
    pastryType: 'کیک تولد و مناسبتی',
    shapeAndDesign: 'کیک دو طبقه با طرح <خامه‌ای>',
    spongeFlavor: 'شکلاتی، بدون گلوتن',
    fillingFlavor: 'موز و گردو',
    weightKg: 2.5,
    servingCount: 18,
    tierCount: 2,
    dietaryType: 'بدون گلوتن',
    writingOnCake: 'تولدت مبارک',
    deliveryType: 'delivery',
    deliveryAddress: 'تهران، خیابان نمونه، پلاک ۱۰',
    deliveryDate: '1405/06/15',
    deliveryTimeSlot: '17:30 تا 20:00',
    finalPrice: 1250000,
    prepaymentAmount: 500000,
    isPrepaymentPaid: false,
    status: 'price_quoted',
    adminNotes: 'This private workshop note must not be sent to the customer.',
    chatMessages: [],
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  } as any;
  const message = formatCustomOrderTrackingMessage(customOrder);

  assert.equal(CUSTOM_ORDER_STATUS_LABELS.price_quoted, '💬 قیمت اعلام شده؛ در انتظار تأیید شما');
  assert.match(message, /CO-123456/);
  assert.match(message, /کیک تولد و مناسبتی/);
  assert.match(message, /طرح &lt;خامه‌ای&gt;/);
  assert.match(message, /موز و گردو/);
  assert.match(message, /تاریخ درخواستی/);
  assert.match(message, /زمان درخواستی/);
  assert.match(message, /مبلغ نهایی/);
  assert.match(message, /در انتظار پرداخت/);
  assert.doesNotMatch(message, /This private workshop note/);

  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(serverSource, /const userCustomOrders = customOrders\.filter\(\(order\) => String\(order\.customerTelegramId\) === chatId\)/);
  assert.match(serverSource, /totalTrackedOrders = userOrders\.length \+ userCustomOrders\.length/);
  assert.match(serverSource, /formatCustomOrderTrackingMessage\(customOrder\)/);
}

function testProductsAndOrdersUseNarrowViewportSafeLayouts() {
  const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const productManagerSource = fs.readFileSync(new URL('../src/components/ProductManager.tsx', import.meta.url), 'utf8');
  const orderManagerSource = fs.readFileSync(new URL('../src/components/OrderManager.tsx', import.meta.url), 'utf8');
  const addProductModalSource = fs.readFileSync(new URL('../src/components/AddProductModal.tsx', import.meta.url), 'utf8');
  const sidebarSource = fs.readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const mobileHeaderSource = fs.readFileSync(new URL('../src/components/MobileHeader.tsx', import.meta.url), 'utf8');

  assert.ok(appSource.includes('window.innerWidth < 1024'));
  assert.ok(appSource.includes('min-w-0 flex flex-col'));
  assert.ok(appSource.includes('pt-14 lg:pt-0'));
  assert.ok(sidebarSource.includes('hidden lg:flex'));
  assert.ok(mobileHeaderSource.includes('lg:hidden'));
  assert.ok(productManagerSource.includes('grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]'));
  assert.ok(productManagerSource.includes('xl:flex-row'));
  assert.ok(addProductModalSource.includes('max-h-[90dvh]'));
  assert.ok(addProductModalSource.includes('flex flex-wrap items-center justify-end'));
  assert.ok(orderManagerSource.includes('grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]'));
  assert.ok(orderManagerSource.includes('basis-full sm:basis-auto'));
  assert.ok(orderManagerSource.includes('xl:grid-cols-3'));
}

function testCustomerImagePanelsUseSharedZoomViewer() {
  const supportManagerSource = fs.readFileSync(new URL('../src/components/SupportManager.tsx', import.meta.url), 'utf8');
  const initialBubbleIndex = supportManagerSource.indexOf('Initial customer message');
  const initialPhotoIndex = supportManagerSource.indexOf('selectedTicket.cakePhoto');
  assert.ok(initialBubbleIndex >= 0, 'The initial customer message bubble should exist.');
  assert.ok(initialPhotoIndex > initialBubbleIndex, 'The first ticket image must stay inside the initial customer message bubble.');
  assert.match(supportManagerSource, /<TicketImageAttachment/);
  assert.match(supportManagerSource, /<ZoomableImageModal/);
  assert.doesNotMatch(supportManagerSource, /تصویر طرح کیک/);

  for (const componentPath of [
    '../src/components/SupportManager.tsx',
    '../src/components/OrderManager.tsx',
    '../src/components/CustomPastryManager.tsx',
    '../src/components/TelegramSimulator.tsx',
  ]) {
    const componentSource = fs.readFileSync(new URL(componentPath, import.meta.url), 'utf8');
    assert.match(componentSource, /resolveTelegramImageSource/, `${componentPath} should resolve Telegram file IDs through the current host.`);
    assert.match(componentSource, /<ZoomableImageModal/, `${componentPath} should expose the shared zoom viewer.`);
  }

  const zoomViewerSource = fs.readFileSync(new URL('../src/components/ZoomableImageModal.tsx', import.meta.url), 'utf8');
  assert.match(zoomViewerSource, /ZoomIn/);
  assert.match(zoomViewerSource, /ZoomOut/);
  assert.match(zoomViewerSource, /onWheel=\{handleWheel\}/);
  assert.match(zoomViewerSource, /activePointers/);
  assert.match(zoomViewerSource, /distanceBetween/);
  assert.match(zoomViewerSource, /touchAction: 'none'/);

  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(serverSource, /referenceImages:\s*state\.photo\s*\?\s*\[state\.photo\]\s*:\s*\[\]/);
}

async function testCheckoutPersistsTelegramProfileOnOrder() {
  const userStates = new Map<string, any>();
  const orders: any[] = [];
  const customers: any[] = [];
  const ctx = makeContext({
    chatId: '994411',
    orders,
    customers,
    userStates,
    msg: { from: { id: 994411, first_name: 'لیلا', last_name: 'مرادی', username: 'leila_cake' } },
  });
  userStates.set(ctx.chatId, {
    mode: 'checkout_confirm',
    draftOrder: {
      customerName: 'لیلا مرادی',
      customerPhone: '09120000000',
      customerAddress: 'تهران، نمونه',
      items: [],
      subtotal: 250000,
      shippingFee: 0,
      discountAmount: 0,
      totalAmount: 250000,
      paymentMethod: 'cash_on_delivery',
      deliveryMethod: 'delivery',
    },
  });

  assert.equal(await handleCheckoutCallback(ctx, 'confirm_order'), true);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].customerTelegramId, '994411');
  assert.equal(orders[0].customerUsername, 'leila_cake');
  assert.equal(orders[0].customerTelegramName, 'لیلا مرادی');
  assert.equal(customers[0].username, 'leila_cake');
}

function testTolerantPanelSearch() {
  assert.equal(compactSearchValue('  @Sara_‌Cake  '), 'saracake');
  assert.equal(normalizeSearchValue('علي ياسر'), 'علی یاسر');
  assert.equal(compactSearchValue('SH-۲۶۰۸۲۷ / ٤٨٣٩٢١'), 'sh260827483921');
  assert.equal(matchesSearchValues('@sara_cake', ['Sara_Cake']), true);
  assert.equal(matchesSearchValues('۱۲۳٤٥٦', ['123456']), true);
  assert.equal(matchesSearchValues('sh260827483921', ['SH-260827-483921']), true);
  assert.equal(matchesSearchValues('کیک يزدی', ['کیک یزدی']), true);
  assert.equal(matchesSearchValues('کد محصول', ['کیک هویج', 'PRD-123']), false);

  const orderManagerSource = fs.readFileSync(new URL('../src/components/OrderManager.tsx', import.meta.url), 'utf8');
  const customerManagerSource = fs.readFileSync(new URL('../src/components/CustomerManager.tsx', import.meta.url), 'utf8');
  const customManagerSource = fs.readFileSync(new URL('../src/components/CustomPastryManager.tsx', import.meta.url), 'utf8');
  const productManagerSource = fs.readFileSync(new URL('../src/components/ProductManager.tsx', import.meta.url), 'utf8');
  assert.match(orderManagerSource, /customerTelegramName/);
  assert.match(orderManagerSource, /item\.productCode/);
  assert.match(customerManagerSource, /customerCustomOrders/);
  assert.match(customManagerSource, /customerUsername/);
  assert.match(productManagerSource, /product\.productCode/);
}

function testIranianDeliveryInput() {
  // 28 August 2026 is 1405/06/06 in Tehran's Solar Hijri calendar.
  assert.equal(getIranianPersianDate(new Date('2026-08-28T12:00:00Z')), '1405/06/06');
  assert.deepEqual(normalizeIranianDeliveryDate('۱۴۰۵/۰۶/۱۵', '1405/06/06'), { value: '1405/06/15' });
  assert.deepEqual(normalizeIranianDeliveryDate('1405-6-15', '1405/06/06'), { value: '1405/06/15' });
  assert.match(normalizeIranianDeliveryDate('1405/06/05', '1405/06/06').error || '', /نمی‌تواند پیش از امروز/);
  assert.deepEqual(normalizeIranianDeliveryDate('۱۳۹۹/۱۲/۳۰', '1399/01/01'), { value: '1399/12/30' });
  assert.match(normalizeIranianDeliveryDate('۱۴۰۰/۱۲/۳۰', '1400/01/01').error || '', /معتبر نیست/);
  assert.deepEqual(normalizeIranianDeliveryTime('۱۷:۳۰ الی ۲۰'), { value: '17:30 تا 20:00' });
  assert.match(normalizeIranianDeliveryTime('20 تا 17').error || '', /پایان بازه/);
  assert.equal(formatIranianDeliveryDate('1405/06/15'), '۱۴۰۵/۰۶/۱۵');

  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(serverSource, /custom_order_register_delivery_date/);
  assert.match(serverSource, /custom_order_register_delivery_time/);
  assert.match(serverSource, /normalizeIranianDeliveryDate/);
  assert.match(serverSource, /customerTelegramName/);
  assert.doesNotMatch(serverSource, /deliveryDate:\s*new Date\(/);
}

function testServerPanelAuthenticationContract() {
  assert.deepEqual(getPanelCredentials({}), {
    username: DEFAULT_PANEL_USERNAME,
    password: DEFAULT_PANEL_PASSWORD,
  });
  assert.deepEqual(getPanelCredentials({ webAdminUsername: '  manager ', webAdminPassword: 'a-safe-password' }), {
    username: 'manager',
    password: 'a-safe-password',
  });
  assert.deepEqual(omitPanelPassword({
    storeName: 'قنادی',
    webAdminPassword: 'secret',
    webAdminPasswordHash: 'scrypt$private',
    telegramBotToken: 'private-bot-token',
    webAdminUsername: 'admin',
  }), {
    storeName: 'قنادی',
    webAdminUsername: 'admin',
  });

  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const loginSource = fs.readFileSync(new URL('../src/components/LoginPage.tsx', import.meta.url), 'utf8');
  assert.match(serverSource, /app\.post\('\/api\/auth\/login'/);
  assert.match(serverSource, /app\.use\('\/api', requirePanelAuth\)/);
  assert.match(serverSource, /httpOnly:\s*true/);
  assert.match(serverSource, /scryptSync/);
  assert.match(serverSource, /if \(!botSettings\.webAdminPasswordHash\)/);
  assert.match(serverSource, /delete updates\.webAdminPasswordHash/);
  assert.match(serverSource, /getPublicPanelSettings\(\)/);
  assert.match(serverSource, /hasTelegramBotToken/);
  assert.match(serverSource, /data\.startsWith\('admin_'\) && !isTelegramAdmin\(callbackActorId\)/);
  assert.match(serverSource, /String\(cb\.from\?\.id \?\? chatId\)/);
  assert.match(serverSource, /hasCompleteCustomOrderDelivery/);
  assert.match(serverSource, /app\.post\('\/api\/custom-orders\/:id\/chat'[\s\S]{0,1800}saveAllData\(\)/);
  assert.match(serverSource, /app\.delete\('\/api\/custom-orders\/:id'[\s\S]{0,700}saveAllData\(\)/);
  assert.doesNotMatch(appSource, /localStorage/);
  assert.match(appSource, /const \[loading, setLoading\] = useState\(true\)/);
  assert.match(appSource, /delete safeDraft\.telegramBotToken/);
  assert.match(loginSource, /onLogin\(username, password\)/);

  const initialDataSource = fs.readFileSync(new URL('../src/data/initialData.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(initialDataSource, /webAdminPassword\s*:/);

  const settingsSource = fs.readFileSync(new URL('../src/components/BotSettings.tsx', import.meta.url), 'utf8');
  assert.match(settingsSource, /id="telegram-bot-token"/);
  assert.match(settingsSource, /type="password"/);
  assert.match(settingsSource, /hasTelegramBotToken/);
}

function testUniqueOrderTrackingNumbers() {
  assert.equal(normalizeOrderNumber(' sh - 260827 - 483921 '), 'SH-260827-483921');
  assert.equal(normalizeOrderSearchValue('کد SH-۲۶۰۸۲۷-٤٨٣٩٢١'), 'کد sh-260827-483921');
  assert.equal(normalizeOrderSearchValue('۰۹۱۲-٣٤٥-۶۷۸۹'), '0912-345-6789');

  // Force one random collision and make sure the next available six-digit
  // candidate is allocated instead of duplicating a tracking number.
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    const collidingCode = generateUniqueOrderNumber([]);
    let attempts = 0;
    Math.random = () => (attempts++ === 0 ? 0 : 1 / 900_000);
    const replacementCode = generateUniqueOrderNumber([{ orderNumber: collidingCode }]);
    assert.notEqual(replacementCode, collidingCode);
    assert.match(replacementCode, /^SH-\d{6}-\d{6}$/);
    assert.notEqual(resolveUniqueOrderNumber(collidingCode, [{ orderNumber: collidingCode }]), collidingCode);
    assert.match(resolveUniqueOrderNumber('SH-1234', []), /^SH-\d{6}-\d{6}$/);
  } finally {
    Math.random = originalRandom;
  }

  const allocated: Array<{ orderNumber: string }> = [];
  for (let index = 0; index < 100; index += 1) {
    const code = generateUniqueOrderNumber(allocated);
    assert.match(code, /^SH-\d{6}-\d{6}$/);
    assert.equal(allocated.some((order) => order.orderNumber === code), false);
    allocated.push({ orderNumber: code });
  }
  assert.equal(new Set(allocated.map((order) => order.orderNumber)).size, allocated.length);

  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(serverSource, /resolveUniqueOrderNumber\(req\.body\.orderNumber, orders\)/);
}

async function main() {
  testTelegramImageResolver();
  await testTicketUsesTelegramAccountAndKnownPhone();
  await testTicketDoesNotInventPhoneAndPhotoReplyKeepsFileIdContract();
  await testCheckoutPersistsTelegramProfileOnOrder();
  testProductImagesStayReachableForTelegram();
  testCustomOrdersAppearInCustomerTrackingWithDetails();
  testProductsAndOrdersUseNarrowViewportSafeLayouts();
  testCustomerImagePanelsUseSharedZoomViewer();
  testTolerantPanelSearch();
  testIranianDeliveryInput();
  testServerPanelAuthenticationContract();
  testUniqueOrderTrackingNumbers();
  assert.ok(sentMessages.length >= 2, 'The mocked bot should send ticket confirmations.');
  console.log('PASS: search, Iranian delivery, panel authentication, support profile, images, and order tracking flows.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
