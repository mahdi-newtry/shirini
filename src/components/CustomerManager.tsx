import React, { useState } from 'react';
import { 
  Users, 
  Phone, 
  MapPin, 
  MessageCircle, 
  ShoppingBag, 
  Wallet, 
  Star, 
  Crown, 
  Award, 
  Search,
  Calendar,
  CreditCard,
  TrendingUp,
  User,
  Filter,
  Trash2,
  X,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChefHat,
  AlertCircle
} from 'lucide-react';
import { CustomerUser, WalletTransaction, Order, CustomPastryOrder } from '../types';
import { formatPrice, toPersianDigits, formatDatePersian } from '../utils/formatters';
import { matchesSearchValues } from '../utils/search';

interface CustomerManagerProps {
  customers: CustomerUser[];
  walletTransactions: WalletTransaction[];
  orders: Order[];
  customOrders?: CustomPastryOrder[];
  onAdjustWallet?: (customerId: string, amount: number, description: string) => Promise<void>;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  walletTransactions,
  orders,
  customOrders = [],
  onAdjustWallet
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);
  const [adjustingCustomer, setAdjustingCustomer] = useState<CustomerUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50000);
  const [adjustReason, setAdjustReason] = useState<string>('شارژ هدیه وفاداری');
  const [showOnlyWithOrders, setShowOnlyWithOrders] = useState(false);

  // Match a customer's full order history by Telegram ID first, then fall
  // back to contact details for older records created before IDs were saved.
  const getCustomerOrders = (customer: CustomerUser) => {
    return orders.filter((order) =>
      (order.customerTelegramId && String(order.customerTelegramId) === String(customer.telegramId)) ||
      (customer.phone && order.customerPhone === customer.phone) ||
      (customer.name && order.customerName === customer.name)
    );
  };

  const getCustomerCustomOrders = (customer: CustomerUser) => {
    return customOrders.filter((order) =>
      String(order.customerTelegramId) === String(customer.telegramId) ||
      (customer.phone && order.customerPhone === customer.phone) ||
      (customer.name && order.customerName === customer.name)
    );
  };

  // Search customer identity plus their order number/product information. This
  // means entering a cake name, product code, order code, @username or Telegram
  // ID all leads back to the related customer record.
  const filteredCustomers = customers.filter((customer) => {
    const customerOrders = getCustomerOrders(customer);
    const customerCustomOrders = getCustomerCustomOrders(customer);
    const matchesSearch = matchesSearchValues(searchQuery, [
      customer.id,
      customer.name,
      customer.phone,
      customer.username,
      customer.telegramId,
      customer.address,
      ...customerOrders.flatMap((order) => [
        order.orderNumber,
        order.id,
        order.customerUsername,
        order.customerTelegramName,
        ...(order.items || []).flatMap((item) => [item.productName, item.productCode]),
      ]),
      ...customerCustomOrders.flatMap((order) => [
        order.orderNumber,
        order.id,
        order.customerUsername,
        order.customerTelegramName,
        order.pastryType,
        order.shapeAndDesign,
        order.writingOnCake,
      ]),
    ]);

    const matchesTier = selectedTier === 'all' || customer.tier === selectedTier;
    const matchesOrders = !showOnlyWithOrders || customer.totalOrdersCount > 0;

    return matchesSearch && matchesTier && matchesOrders;
  });

  // Calculate totals
  const totalWalletBalance = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);
  const totalRewardPoints = customers.reduce((sum, c) => sum + (c.rewardPoints || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrdersCount || 0), 0);
  const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpentTomans || 0), 0);
  const customersWithOrders = customers.filter(c => c.totalOrdersCount > 0).length;
  const newCustomers = customers.filter(c => c.totalOrdersCount === 0).length;

  const handlePerformAdjust = async () => {
    if (!adjustingCustomer || !onAdjustWallet) return;
    try {
      await onAdjustWallet(adjustingCustomer.id, adjustAmount, adjustReason);
      setAdjustingCustomer(null);
      setAdjustAmount(50000);
      setAdjustReason('شارژ هدیه وفاداری');
    } catch (e: any) {
      alert('خطا در تغییر موجودی: ' + e.message);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'vip': return <Crown className="w-4 h-4" />;
      case 'gold': return <Award className="w-4 h-4" />;
      case 'silver': return <Star className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'vip':
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'gold':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'silver':
        return 'bg-slate-400/20 text-slate-200 border border-slate-400/30';
      default:
        return 'bg-slate-700 text-slate-300 border border-slate-600';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'vip': return 'VIP ویژه';
      case 'gold': return 'طلایی';
      case 'silver': return 'نقره‌ای';
      default: return 'برنزی';
    }
  };

  // Get wallet transactions for selected customer
  const getCustomerTransactions = (customerId: string) => {
    return walletTransactions.filter(t => t.customerId === customerId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending_payment: { label: 'در انتظار پرداخت', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
      paid_checking: { label: 'بررسی فیش', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: AlertCircle },
      baking: { label: 'در حال پخت', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: ChefHat },
      shipped: { label: 'ارسال شده', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Truck },
      delivered: { label: 'تحویل شده', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
      cancelled: { label: 'لغو شده', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending_payment;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                مدیریت مشتریان و کاربران ربات
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              پایگاه داده مشتریان و باشگاه وفاداری
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              مشاهده اطلاعات کامل مشتریان، موجودی کیف پول، امتیازات وفاداری، تاریخچه خرید و تراکنش‌ها. امکان مدیریت سطح وفاداری و شارژ کیف پول.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 hover:border-indigo-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">کل مشتریان</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-white">{toPersianDigits(customers.length)}</span>
            <span className="text-xs text-slate-400 mr-1">نفر</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">مشتریان فعال</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">{toPersianDigits(customersWithOrders)}</span>
            <span className="text-xs text-slate-400 mr-1">نفر</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">مشتریان جدید</span>
            <User className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-amber-400">{toPersianDigits(newCustomers)}</span>
            <span className="text-xs text-slate-400 mr-1">نفر</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">موجودی کیف‌پول‌ها</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-emerald-400">{formatPrice(totalWalletBalance)}</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 hover:border-rose-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">کل سفارشات</span>
            <Package className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-white">{toPersianDigits(totalOrders)}</span>
            <span className="text-xs text-slate-400 mr-1">سفارش</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 hover:border-pink-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">مجموع خریدها</span>
            <TrendingUp className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold text-white">{formatPrice(totalSpent)}</span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="نام/یوزرنیم/آیدی تلگرام، کد سفارش یا محصول و نام کیک..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          
          <button
            onClick={() => setShowOnlyWithOrders(!showOnlyWithOrders)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              showOnlyWithOrders
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            فقط مشتریان دارای سفارش
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {['all', 'vip', 'gold', 'silver', 'bronze'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTier === tier
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {tier === 'all' ? 'همه' : getTierLabel(tier)}
            </button>
          ))}
        </div>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-semibold text-slate-300">هیچ مشتری‌ای یافت نشد.</p>
          <p className="text-xs">مشتریان پس از استارت کردن ربات تلگرام به صورت خودکار اضافه می‌شوند.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCustomers.map((customer) => {
            const customerOrders = getCustomerOrders(customer);
            return (
              <div
                key={customer.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getTierBadge(customer.tier)}`}>
                      {getTierIcon(customer.tier)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{customer.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTierBadge(customer.tier)}`}>
                          {getTierLabel(customer.tier)}
                        </span>
                        <span className="text-xs text-slate-400">@{customer.username || customer.telegramId}</span>
                      </div>
                    </div>
                  </div>
                  {customer.totalOrdersCount === 0 && (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      جدید
                    </span>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    <span>{customer.phone || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>{toPersianDigits(customer.totalOrdersCount)} سفارش</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-emerald-400">{formatPrice(customer.walletBalance)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>{toPersianDigits(customer.rewardPoints)} امتیاز</span>
                  </div>
                </div>

                {/* Address */}
                {customer.address && (
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{customer.address}</span>
                  </div>
                )}

                {/* Recent Orders Preview */}
                {customerOrders.length > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400 mb-2">آخرین سفارشات:</p>
                    <div className="space-y-1.5">
                      {customerOrders.slice(0, 2).map((order) => (
                        <div key={order.id} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 font-mono">{order.orderNumber}</span>
                          <span className="text-slate-400">{formatPrice(order.totalAmount)}</span>
                          {getStatusBadge(order.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>عضویت: {formatDatePersian(customer.createdAt)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdjustingCustomer(customer);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>شارژ کیف‌پول</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                مشخصات کامل مشتری
              </h4>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">نام کامل:</span>
                <span className="font-bold text-white">{selectedCustomer.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">شماره تلفن:</span>
                <span className="font-bold text-white">{selectedCustomer.phone || '---'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">نام کاربری تلگرام:</span>
                <span className="font-bold text-sky-400">@{selectedCustomer.username || selectedCustomer.telegramId}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">شناسه تلگرام:</span>
                <span className="font-mono text-white">{selectedCustomer.telegramId}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-slate-400 block mb-1">موجودی کیف‌پول:</span>
                <span className="font-bold text-emerald-400">{formatPrice(selectedCustomer.walletBalance)} تومان</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-slate-400 block mb-1">امتیاز وفاداری:</span>
                <span className="font-bold text-amber-400">{toPersianDigits(selectedCustomer.rewardPoints)} ⭐️</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">تعداد کل سفارشات:</span>
                <span className="font-bold text-white">{toPersianDigits(selectedCustomer.totalOrdersCount)} سفارش</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">مجموع خریدها:</span>
                <span className="font-bold text-white">{formatPrice(selectedCustomer.totalSpentTomans)} تومان</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">آدرس:</span>
                <span className="text-white">{selectedCustomer.address || 'ثبت نشده'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">سطح وفاداری:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTierBadge(selectedCustomer.tier)}`}>
                  {getTierLabel(selectedCustomer.tier)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">تاریخ عضویت:</span>
                <span className="text-white">{formatDatePersian(selectedCustomer.createdAt)}</span>
              </div>
            </div>

            {/* Customer Orders */}
            {getCustomerOrders(selectedCustomer).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  سفارشات مشتری ({getCustomerOrders(selectedCustomer).length})
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getCustomerOrders(selectedCustomer).map((order) => (
                    <div key={order.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">{order.orderNumber}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{formatDatePersian(order.createdAt)}</span>
                        <span className="font-bold text-amber-400">{formatPrice(order.totalAmount)} تومان</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {order.items.map((item, idx) => (
                          <span key={idx}>
                            {item.productName} ({item.quantity} {item.unit}){idx < order.items.length - 1 ? '، ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wallet Transactions */}
            {getCustomerTransactions(selectedCustomer.id).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  تاریخچه تراکنش‌های کیف‌پول
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getCustomerTransactions(selectedCustomer.id).map((tx) => (
                    <div key={tx.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-300">{tx.description}</span>
                        <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{formatDatePersian(tx.createdAt)}</span>
                        <span>موجودی پس از: {formatPrice(tx.balanceAfter)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                بستن
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setAdjustingCustomer(selectedCustomer);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>شارژ کیف‌پول</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Wallet Modal */}
      {adjustingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                شارژ کیف‌پول ({adjustingCustomer.name})
              </h4>
              <button
                onClick={() => setAdjustingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>موجودی فعلی:</span>
                <span className="font-bold text-emerald-400">{formatPrice(adjustingCustomer.walletBalance)} تومان</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">مبلغ تغییر (تومان - منفی برای کسر):</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">علت تغییر:</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handlePerformAdjust}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                اعمال در کیف‌پول
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
