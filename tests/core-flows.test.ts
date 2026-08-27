import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleCustomerCallback } from '../src/telegramHandlers';
import { generateUniqueOrderNumber, normalizeOrderNumber, resolveUniqueOrderNumber } from '../src/utils/orderNumber';
import { normalizeOrderSearchValue } from '../src/components/OrderManager';
import { getTicketImageSource } from '../src/components/SupportManager';

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
  assert.equal(
    getTicketImageSource('AgAC+/=_test-reply-photo'),
    '/api/telegram/file/AgAC%2B%2F%3D_test-reply-photo'
  );
  assert.equal(getTicketImageSource('https://example.test/legacy-photo.jpg'), 'https://example.test/legacy-photo.jpg');

  // The live-update portion is deliberately kept at the server boundary (it
  // receives Telegram's msg.photo). Verify its persisted reply contract and
  // its UI consumer so a file_id cannot regress to an unrendered Markdown URL.
  const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const supportManagerSource = fs.readFileSync(new URL('../src/components/SupportManager.tsx', import.meta.url), 'utf8');
  assert.match(serverSource, /telegramUser:\s*cb\.from/);
  assert.match(serverSource, /replyPhotoState[\s\S]{0,1200}photo:\s*photoFileId/);
  assert.doesNotMatch(serverSource, /savedPhotoUrl/);
  assert.match(supportManagerSource, /reply\.photo \|\| getLegacyReplyImage\(reply\.text\)/);
  assert.match(supportManagerSource, /api\/telegram\/file\/\$\{encodeURIComponent\(imageReference\)\}/);
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
  await testTicketUsesTelegramAccountAndKnownPhone();
  await testTicketDoesNotInventPhoneAndPhotoReplyKeepsFileIdContract();
  testUniqueOrderTrackingNumbers();
  assert.ok(sentMessages.length >= 2, 'The mocked bot should send ticket confirmations.');
  console.log('PASS: support profile, ticket image contract, and unique order tracking flows.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
