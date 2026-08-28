import React, { useMemo } from 'react';
import {
  ArrowUpLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  FileText,
  MessageCircle,
  Package,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  CustomerUser,
  CustomPastryOrder,
  Invoice,
  Order,
  Product,
  SupportTicket,
} from '../types';
import { invoiceSourceLabels, invoiceStatusLabels } from '../utils/invoices';
import { formatIranianDateTime } from '../utils/iranianDate';

export type DashboardNavigationTarget =
  | 'customers'
  | 'invoices'
  | 'products'
  | 'orders'
  | 'custom_orders'
  | 'support'
  | 'analytics';

interface DashboardProps {
  botName?: string;
  invoices: Invoice[];
  orders: Order[];
  customOrders: CustomPastryOrder[];
  customers: CustomerUser[];
  products: Product[];
  supportTickets: SupportTicket[];
  onNavigate: (target: DashboardNavigationTarget) => void;
}

const money = (value: unknown) => `${Math.max(0, Number(value) || 0).toLocaleString('fa-IR')} تومان`;
const safeNumber = (value: unknown) => Math.max(0, Number(value) || 0);

const dayKeyInTehran = (value: Date): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const shortPersianDay = (value: Date) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  month: 'short',
  day: 'numeric',
}).format(value);

const regularOrderStatusLabel: Record<Order['status'], string> = {
  pending_payment: 'در انتظار پرداخت',
  paid_checking: 'بررسی فیش',
  baking: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
};

const customOrderStatusLabel: Record<CustomPastryOrder['status'], string> = {
  pending_review: 'در انتظار بررسی',
  price_quoted: 'در انتظار تأیید مشتری',
  approved_by_customer: 'تأیید شده',
  baking: 'در حال آماده‌سازی',
  ready: 'آماده تحویل',
  delivered: 'تحویل شده',
  rejected: 'رد شده',
};

const statusTone = (status: string) => {
  if (['paid', 'delivered', 'ready'].includes(status)) return 'border-emerald-800/60 bg-emerald-950/35 text-emerald-200';
  if (['payment_review', 'paid_checking', 'pending_review'].includes(status)) return 'border-orange-800/60 bg-orange-950/35 text-orange-200';
  if (['cancelled', 'rejected', 'refunded'].includes(status)) return 'border-rose-800/60 bg-rose-950/35 text-rose-200';
  return 'border-sky-800/60 bg-sky-950/35 text-sky-200';
};

export const Dashboard: React.FC<DashboardProps> = ({
  botName,
  invoices,
  orders,
  customOrders,
  customers,
  products,
  supportTickets,
  onNavigate,
}) => {
  const data = useMemo(() => {
    const received = invoices.reduce((sum, invoice) => sum + safeNumber(invoice.paidAmount), 0);
    const receivable = invoices
      .filter((invoice) => !['cancelled', 'refunded'].includes(invoice.status))
      .reduce((sum, invoice) => sum + safeNumber(invoice.remainingAmount), 0);
    const paymentReviewInvoices = invoices.filter((invoice) => invoice.status === 'payment_review');
    const openTickets = supportTickets.filter((ticket) => ['open', 'in_progress'].includes(ticket.status));
    const runningRegularOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const runningCustomOrders = customOrders.filter((order) => !['delivered', 'rejected'].includes(order.status));
    const lowStockProducts = products.filter((product) => product.isAvailable && typeof product.stockKgOrCount === 'number' && product.stockKgOrCount <= 5);
    const unavailableProducts = products.filter((product) => !product.isAvailable);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeCustomers = customers.filter((customer) => {
      const lastActive = new Date(customer.lastActiveAt).getTime();
      return Number.isFinite(lastActive) && lastActive >= thirtyDaysAgo;
    });

    const now = new Date();
    const salesDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return { key: dayKeyInTehran(date), label: shortPersianDay(date), value: 0 };
    });
    const dayByKey = new Map(salesDays.map((day) => [day.key, day]));
    invoices.forEach((invoice) => {
      invoice.payments
        .filter((payment) => payment.status === 'confirmed')
        .forEach((payment) => {
          const date = new Date(payment.paidAt || payment.updatedAt || payment.createdAt || invoice.updatedAt || invoice.createdAt);
          const day = Number.isNaN(date.getTime()) ? undefined : dayByKey.get(dayKeyInTehran(date));
          if (day) day.value += safeNumber(payment.amount);
        });
    });
    const chartMaximum = Math.max(...salesDays.map((day) => day.value), 1);

    const invoiceActivities = invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      kind: 'invoice' as const,
      title: invoice.invoiceNumber,
      subtitle: `${invoice.customerName} • ${invoiceStatusLabels[invoice.status]}`,
      date: invoice.updatedAt || invoice.createdAt,
      target: 'invoices' as DashboardNavigationTarget,
      status: invoice.status,
    }));
    const ticketActivities = supportTickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      kind: 'ticket' as const,
      title: `تیکت ${ticket.ticketNumber}`,
      subtitle: `${ticket.customerName} • ${ticket.subject}`,
      date: ticket.updatedAt || ticket.createdAt,
      target: 'support' as DashboardNavigationTarget,
      status: ticket.status,
    }));
    const activities = [...invoiceActivities, ...ticketActivities]
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
      .slice(0, 6);

    const latestInvoices = [...invoices]
      .sort((first, second) => new Date(second.updatedAt || second.createdAt).getTime() - new Date(first.updatedAt || first.createdAt).getTime())
      .slice(0, 5);

    return {
      received,
      receivable,
      paymentReviewInvoices,
      openTickets,
      runningRegularOrders,
      runningCustomOrders,
      lowStockProducts,
      unavailableProducts,
      activeCustomers,
      salesDays,
      chartMaximum,
      activities,
      latestInvoices,
    };
  }, [customers, customOrders, invoices, orders, products, supportTickets]);

  const hasUrgentItems = data.paymentReviewInvoices.length > 0 || data.openTickets.length > 0 || data.lowStockProducts.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-800/45 bg-gradient-to-l from-indigo-950/65 via-slate-900 to-slate-900 p-5 shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-16 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-700/50 bg-indigo-950/50 px-3 py-1 text-[11px] font-semibold text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" /> نمای کلی عملیات قنادی
            </div>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">داشبورد مدیریت{botName ? ` ${botName}` : ''}</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300 sm:text-sm">
              وضعیت فروش، رسیدهای در انتظار بررسی، سفارش‌ها، مشتریان و پیام‌های پشتیبانی را از یک صفحه پیگیری کنید.
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-xs ${hasUrgentItems ? 'border-amber-700/60 bg-amber-950/35 text-amber-100' : 'border-emerald-700/60 bg-emerald-950/35 text-emerald-100'}`}>
            <div className="flex items-center gap-2 font-bold">
              {hasUrgentItems ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {hasUrgentItems ? 'موارد نیازمند رسیدگی دارید' : 'همه موارد مهم بررسی شده‌اند'}
            </div>
            <p className="mt-1 text-[11px] opacity-85">
              {data.paymentReviewInvoices.length.toLocaleString('fa-IR')} فیش، {data.openTickets.length.toLocaleString('fa-IR')} تیکت و {data.lowStockProducts.length.toLocaleString('fa-IR')} هشدار موجودی
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'وصول‌شده از فاکتورها', value: money(data.received), icon: CircleDollarSign, tone: 'border-emerald-800/55 bg-emerald-950/25 text-emerald-300', target: 'invoices' as DashboardNavigationTarget },
          { label: 'مانده قابل دریافت', value: money(data.receivable), icon: WalletCards, tone: 'border-amber-800/55 bg-amber-950/25 text-amber-300', target: 'invoices' as DashboardNavigationTarget },
          { label: 'رسیدهای در انتظار تأیید', value: data.paymentReviewInvoices.length.toLocaleString('fa-IR'), icon: ReceiptText, tone: 'border-orange-800/55 bg-orange-950/25 text-orange-300', target: 'invoices' as DashboardNavigationTarget },
          { label: 'مشتریان فعال ۳۰ روز اخیر', value: data.activeCustomers.length.toLocaleString('fa-IR'), icon: Users, tone: 'border-sky-800/55 bg-sky-950/25 text-sky-300', target: 'customers' as DashboardNavigationTarget },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <button key={stat.label} type="button" onClick={() => onNavigate(stat.target)} className={`group rounded-2xl border p-4 text-right shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 ${stat.tone}`}>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>{stat.label}</span><Icon className="h-4 w-4" /></div>
              <strong className="mt-2 block text-base text-white sm:text-lg">{stat.value}</strong>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] opacity-75">مشاهده جزئیات <ArrowUpLeft className="h-3 w-3 transition group-hover:-translate-x-0.5" /></span>
            </button>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-lg sm:p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-black text-white"><BarChart3 className="h-4 w-4 text-indigo-300" />دریافت‌های ۷ روز اخیر</h3>
              <p className="mt-1 text-[11px] text-slate-500">بر پایه پرداخت‌های تأییدشده فاکتورها</p>
            </div>
            <button type="button" onClick={() => onNavigate('analytics')} className="inline-flex items-center gap-1 rounded-lg border border-indigo-800/70 bg-indigo-950/35 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-900/45">گزارش فروش <ArrowUpLeft className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex h-44 items-end gap-2 sm:gap-3" dir="ltr">
            {data.salesDays.map((day) => {
              const height = day.value > 0 ? Math.max(10, Math.round((day.value / data.chartMaximum) * 100)) : 4;
              return (
                <div key={day.key} className="group flex min-w-0 flex-1 flex-col justify-end" title={`${day.label}: ${money(day.value)}`}>
                  <div className="relative flex h-32 items-end rounded-t-xl bg-slate-950/65 px-1">
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 via-indigo-500 to-sky-400 transition-all duration-500 group-hover:brightness-125" style={{ height: `${height}%` }} />
                  </div>
                  <span className="mt-2 truncate text-center text-[9px] text-slate-500" dir="rtl">{day.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2 text-[11px] text-slate-400"><span>جمع هفت روز</span><strong className="text-emerald-300">{money(data.salesDays.reduce((sum, day) => sum + day.value, 0))}</strong></div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-black text-white"><ClipboardList className="h-4 w-4 text-amber-300" />صف رسیدگی امروز</h3><p className="mt-1 text-[11px] text-slate-500">اولویت‌های عملیاتی پنل</p></div></div>
          <div className="space-y-2.5">
            {[
              { label: 'فیش‌های ارسال‌شده مشتریان', description: 'بررسی و تأیید یا رد پرداخت', value: data.paymentReviewInvoices.length, icon: ReceiptText, target: 'invoices' as DashboardNavigationTarget, tone: 'text-orange-300 bg-orange-950/30 border-orange-900/60' },
              { label: 'تیکت‌های باز و در حال پیگیری', description: 'پاسخ‌گویی به پیام مشتریان', value: data.openTickets.length, icon: MessageCircle, target: 'support' as DashboardNavigationTarget, tone: 'text-purple-300 bg-purple-950/30 border-purple-900/60' },
              { label: 'هشدار موجودی کالا', description: data.lowStockProducts.length ? 'موجودی پنج یا کمتر' : 'کالای کم‌موجودی ثبت نشده', value: data.lowStockProducts.length, icon: Package, target: 'products' as DashboardNavigationTarget, tone: 'text-rose-300 bg-rose-950/30 border-rose-900/60' },
            ].map((item) => {
              const Icon = item.icon;
              return <button key={item.label} type="button" onClick={() => onNavigate(item.target)} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-right transition hover:border-slate-700 hover:bg-slate-800/70"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><strong className="block text-xs text-slate-100">{item.label}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.description}</span></div><span className={`min-w-7 rounded-full px-2 py-1 text-center text-xs font-black ${item.value > 0 ? item.tone : 'bg-slate-800 text-slate-400'}`}>{item.value.toLocaleString('fa-IR')}</span></button>;
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-black text-white"><ShoppingBag className="h-4 w-4 text-sky-300" />وضعیت سفارش‌ها</h3><p className="mt-1 text-[11px] text-slate-500">سفارش‌های فعال خارج از تحویل‌شده و لغوشده</p></div><button type="button" onClick={() => onNavigate('orders')} className="text-[11px] font-semibold text-sky-300 hover:text-sky-200">مشاهده سفارش‌ها</button></div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onNavigate('orders')} className="rounded-xl border border-sky-900/55 bg-sky-950/25 p-3 text-right transition hover:bg-sky-950/45"><span className="text-[11px] text-slate-400">سفارش عادیِ فعال</span><strong className="mt-1 block text-2xl text-sky-200">{data.runningRegularOrders.length.toLocaleString('fa-IR')}</strong></button>
            <button type="button" onClick={() => onNavigate('custom_orders')} className="rounded-xl border border-fuchsia-900/55 bg-fuchsia-950/20 p-3 text-right transition hover:bg-fuchsia-950/40"><span className="text-[11px] text-slate-400">سفارش سفارشیِ فعال</span><strong className="mt-1 block text-2xl text-fuchsia-200">{data.runningCustomOrders.length.toLocaleString('fa-IR')}</strong></button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            {[
              { label: 'فیش سفارش عادی', count: orders.filter((order) => order.status === 'paid_checking').length, target: 'orders' as DashboardNavigationTarget },
              { label: 'در حال آماده‌سازی', count: orders.filter((order) => order.status === 'baking').length + customOrders.filter((order) => order.status === 'baking').length, target: 'custom_orders' as DashboardNavigationTarget },
              { label: 'آماده ارسال/تحویل', count: orders.filter((order) => order.status === 'shipped').length + customOrders.filter((order) => order.status === 'ready').length, target: 'orders' as DashboardNavigationTarget },
              { label: 'در انتظار بررسی سفارش سفارشی', count: customOrders.filter((order) => order.status === 'pending_review').length, target: 'custom_orders' as DashboardNavigationTarget },
            ].map((stage) => <button type="button" key={stage.label} onClick={() => onNavigate(stage.target)} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/45 px-2.5 py-2 text-slate-400 hover:bg-slate-800"><span>{stage.label}</span><strong className="text-slate-200">{stage.count.toLocaleString('fa-IR')}</strong></button>)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-black text-white"><CalendarClock className="h-4 w-4 text-violet-300" />آخرین فعالیت‌ها</h3><p className="mt-1 text-[11px] text-slate-500">آخرین تغییرات فاکتورها و پشتیبانی</p></div></div>
          {data.activities.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 px-3 py-8 text-center text-xs text-slate-500">هنوز فعالیتی برای نمایش ثبت نشده است.</div> : <div className="space-y-2">{data.activities.map((activity) => <button type="button" key={activity.id} onClick={() => onNavigate(activity.target)} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-2.5 text-right transition hover:bg-slate-800/70"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.kind === 'invoice' ? 'bg-violet-950/60 text-violet-300' : 'bg-purple-950/60 text-purple-300'}`}>{activity.kind === 'invoice' ? <FileText className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-100">{activity.title}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-500">{activity.subtitle}</span></div><div className="shrink-0 text-left"><span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] ${statusTone(activity.status)}`}>{activity.kind === 'invoice' ? invoiceStatusLabels[activity.status as Invoice['status']] : activity.status === 'open' ? 'باز' : activity.status === 'in_progress' ? 'در حال پیگیری' : 'پاسخ‌داده‌شده'}</span><span className="mt-1 block text-[9px] text-slate-600">{formatIranianDateTime(activity.date)}</span></div></button>)}</div>}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-black text-white"><ReceiptText className="h-4 w-4 text-violet-300" />فاکتورهای اخیر</h3><p className="mt-1 text-[11px] text-slate-500">دسترسی سریع به آخرین اسناد مالی</p></div><button type="button" onClick={() => onNavigate('invoices')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:text-violet-200">همه فاکتورها <ArrowUpLeft className="h-3.5 w-3.5" /></button></div>
          {data.latestInvoices.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 px-3 py-8 text-center text-xs text-slate-500">هنوز فاکتوری ثبت نشده است.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-right text-xs"><thead className="border-b border-slate-800 text-[10px] text-slate-500"><tr><th className="pb-2 font-medium">شماره</th><th className="pb-2 font-medium">مشتری</th><th className="pb-2 font-medium">وضعیت</th><th className="pb-2 text-left font-medium">مانده</th></tr></thead><tbody>{data.latestInvoices.map((invoice) => <tr key={invoice.id} className="border-b border-slate-800/70 last:border-0"><td className="py-3 font-mono text-[11px] font-bold text-white">{invoice.invoiceNumber}</td><td className="py-3 text-slate-300"><span className="block max-w-32 truncate">{invoice.customerName}</span><span className="mt-0.5 block text-[9px] text-slate-600">{invoiceSourceLabels[invoice.source]}</span></td><td className="py-3"><span className={`rounded-md border px-1.5 py-1 text-[9px] ${statusTone(invoice.status)}`}>{invoiceStatusLabels[invoice.status]}</span></td><td className="py-3 text-left font-semibold text-amber-200">{money(invoice.remainingAmount)}</td></tr>)}</tbody></table></div>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-rose-300" /><div><h3 className="text-sm font-black text-white">کالا و موجودی</h3><p className="mt-1 text-[11px] text-slate-500">نمای سریع کاتالوگ</p></div></div>
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onNavigate('products')} className="rounded-xl border border-emerald-900/55 bg-emerald-950/20 p-3 text-right"><span className="text-[10px] text-slate-500">کالای فعال</span><strong className="mt-1 block text-xl text-emerald-200">{products.filter((product) => product.isAvailable).length.toLocaleString('fa-IR')}</strong></button><button type="button" onClick={() => onNavigate('products')} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-right"><span className="text-[10px] text-slate-500">غیرفعال / ناموجود</span><strong className="mt-1 block text-xl text-slate-200">{data.unavailableProducts.length.toLocaleString('fa-IR')}</strong></button></div>
          <button type="button" onClick={() => onNavigate('products')} className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2.5 text-right text-xs text-slate-300 hover:bg-slate-800"><span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-amber-300" />مدیریت کاتالوگ و موجودی</span><ArrowUpLeft className="h-3.5 w-3.5 text-slate-500" /></button>
        </div>
      </section>
    </div>
  );
};
