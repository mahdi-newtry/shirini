import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  AlertCircle, 
  Eye, 
  X,
  CreditCard,
  User,
  Calendar,
  ChefHat
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatPrice, toPersianDigits, formatDatePersian } from '../utils/formatters';

interface OrderManagerProps {
  orders: Order[];
  onUpdateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  onUpdateOrderStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeReceiptModal, setActiveReceiptModal] = useState<Order | null>(null);

  const statusConfig: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string; activeBg: string; activeText: string; activeBorder: string; icon: any }
  > = {
    pending_payment: {
      label: 'در انتظار پرداخت',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      activeBg: 'bg-amber-500',
      activeText: 'text-white',
      activeBorder: 'border-amber-600',
      icon: Clock,
    },
    paid_checking: {
      label: 'بررسی فیش واریز',
      bg: 'bg-sky-500/15',
      text: 'text-sky-300',
      border: 'border-sky-500/30',
      activeBg: 'bg-sky-500',
      activeText: 'text-white',
      activeBorder: 'border-sky-600',
      icon: AlertCircle,
    },
    baking: {
      label: 'در حال پخت و آماده‌سازی',
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-300',
      border: 'border-indigo-500/30',
      activeBg: 'bg-indigo-500',
      activeText: 'text-white',
      activeBorder: 'border-indigo-600',
      icon: ChefHat,
    },
    shipped: {
      label: 'تحویل به پیک (ارسال)',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      activeBg: 'bg-purple-500',
      activeText: 'text-white',
      activeBorder: 'border-purple-600',
      icon: Truck,
    },
    delivered: {
      label: 'تحویل داده شد',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      activeBg: 'bg-emerald-500',
      activeText: 'text-white',
      activeBorder: 'border-emerald-600',
      icon: CheckCircle2,
    },
    cancelled: {
      label: 'لغو شده',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      activeBg: 'bg-rose-500',
      activeText: 'text-white',
      activeBorder: 'border-rose-600',
      icon: XCircle,
    },
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus === 'all') return true;
    return order.status === selectedStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>مدیریت سفارشات قنادی</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            پیگیری و پردازش سفارشات ثبت شده در ربات تلگرام
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            سفارشات مشتریان به محض ثبت در تلگرام اینجا قرار می‌گیرند. شما می‌توانید فیش واریز را تایید، وضعیت پخت را تعیین و به پیک بسپارید.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 text-slate-300 text-xs">
          <span>کل سفارشات:</span>
          <b className="text-amber-400 text-sm font-bold">{toPersianDigits(orders.length)}</b>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedStatus === 'all'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          همه سفارشات ({toPersianDigits(orders.length)})
        </button>

        {Object.entries(statusConfig).map(([statusKey, cfg]) => {
          const count = orders.filter((o) => o.status === statusKey).length;
          const isActive = selectedStatus === statusKey;
          return (
            <button
              key={statusKey}
              onClick={() => setSelectedStatus(statusKey)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? `${cfg.activeBg} ${cfg.activeText} border ${cfg.activeBorder} shadow-md`
                  : `${cfg.bg} ${cfg.text} border ${cfg.border} hover:opacity-80`
              }`}
            >
              <span>{cfg.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-white/25' : 'bg-slate-900/60'
              }`}>
                {toPersianDigits(count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-semibold text-slate-300">سفارشی در این وضعیت موجود نیست.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const currentCfg = statusConfig[order.status];
            const StatusIcon = currentCfg.icon;

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-lg transition-all space-y-5"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-mono font-bold">
                      #{order.orderNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white">{order.customerName}</h3>
                        <span className="text-xs text-slate-400 font-mono">({order.customerPhone})</span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>ثبت شده در: {formatDatePersian(order.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${currentCfg.bg} ${currentCfg.text} border ${currentCfg.border}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{currentCfg.label}</span>
                  </div>
                </div>

                {/* Items & Address Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  
                  {/* Ordered Items Breakdown */}
                  <div className="lg:col-span-2 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-400 block">
                      اقلام سفارش داده شده ({toPersianDigits(order.items.length)} قلم):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-3"
                        >
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                            <p className="text-[11px] text-slate-400">
                              {toPersianDigits(item.quantity)} {item.unit} × {formatPrice(item.price)}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-amber-400">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        <b>یادداشت و متن روی کیک:</b> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Delivery & Payment Details */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-xs text-slate-300">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{order.customerAddress}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                        <a href={`tel:${order.customerPhone}`} className="text-sky-400 hover:underline">
                          {order.customerPhone}
                        </a>
                      </div>

                      <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>مجموع اقلام:</span>
                          <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>هزینه پیک:</span>
                          <span>{order.shippingFee === 0 ? 'رایگان' : formatPrice(order.shippingFee)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-slate-800">
                          <span>مبلغ کل:</span>
                          <span className="text-amber-400">{formatPrice(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {order.paymentReceiptImage && (
                      <button
                        onClick={() => setActiveReceiptModal(order)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>مشاهده فیش واریزی مشتری</span>
                      </button>
                    )}
                  </div>

                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">تغییر مرحله سفارش:</span>
                  
                  <div className="flex flex-wrap items-center gap-1.5">
                    {order.status !== 'baking' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'baking')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>شروع پخت و تزیین</span>
                      </button>
                    )}

                    {order.status !== 'shipped' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'shipped')}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>تحویل به پیک</span>
                      </button>
                    )}

                    {order.status !== 'delivered' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تکمیل و تحویل شد</span>
                      </button>
                    )}

                    {order.status !== 'cancelled' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'cancelled')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>لغو سفارش</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {activeReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                فیش واریز سفارش #{activeReceiptModal.orderNumber}
              </h3>
              <button
                onClick={() => setActiveReceiptModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-96">
              <img
                src={activeReceiptModal.paymentReceiptImage}
                alt="Receipt"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p>مبلغ سفارش: <b className="text-amber-400">{formatPrice(activeReceiptModal.totalAmount)}</b></p>
              <p>نام واریز کننده: <b>{activeReceiptModal.customerName}</b></p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveReceiptModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
