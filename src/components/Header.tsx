import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  CakeSlice, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  User, 
  Smartphone,
  Ticket,
  Headphones,
  Wand2,
  Database,
  Cake,
  Users,
  Menu,
  ChevronRight,
  X
} from 'lucide-react';
import { BotSettings } from '../types';

interface SidebarProps {
  activeTab: 'simulator' | 'products' | 'orders' | 'custom_orders' | 'discounts' | 'support' | 'texts' | 'analytics' | 'settings' | 'backup' | 'customers' | 'admins';
  setActiveTab: (tab: 'simulator' | 'products' | 'orders' | 'custom_orders' | 'discounts' | 'support' | 'texts' | 'analytics' | 'settings' | 'backup' | 'customers' | 'admins') => void;
  botSettings: BotSettings;
  ordersCount: number;
  productsCount: number;
  customOrdersCount?: number;
  pendingCustomOrdersCount?: number;
  discountsCount?: number;
  openTicketsCount?: number;
  simulatorRole: 'customer' | 'admin';
  setSimulatorRole: (role: 'customer' | 'admin') => void;
  expanded: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  botSettings,
  ordersCount,
  productsCount,
  customOrdersCount = 0,
  pendingCustomOrdersCount = 0,
  discountsCount = 0,
  openTicketsCount = 0,
  simulatorRole,
  setSimulatorRole,
  expanded,
  onToggle,
  mobileOpen,
  onMobileClose,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { id: 'simulator' as const, icon: Smartphone, label: 'شبیه‌ساز تلگرام', color: 'sky' },
    { id: 'customers' as const, icon: Users, label: 'کاربران', color: 'sky' },
    { id: 'products' as const, icon: CakeSlice, label: 'محصولات', color: 'amber' },
    { id: 'orders' as const, icon: ShoppingBag, label: 'سفارشات عادی', color: 'emerald', badge: ordersCount || undefined },
    { id: 'custom_orders' as const, icon: Cake, label: 'سفارش دلخواه', color: 'pink', badge: pendingCustomOrdersCount || customOrdersCount || undefined },
    { id: 'support' as const, icon: Headphones, label: 'پشتیبانی و تیکت‌ها', color: 'purple', badge: openTicketsCount || undefined },
    { id: 'texts' as const, icon: Wand2, label: 'شخصی‌سازی متون', color: 'pink' },
    { id: 'discounts' as const, icon: Ticket, label: 'تخفیف‌ها', color: 'rose', badge: discountsCount || undefined },
    { id: 'analytics' as const, icon: BarChart3, label: 'آمار فروش', color: 'indigo' },
    { id: 'backup' as const, icon: Database, label: 'بکاپ و بازیابی', color: 'indigo' },
    { id: 'settings' as const, icon: Settings, label: 'تنظیمات', color: 'slate' },
    { id: 'admins' as const, icon: ShieldCheck, label: 'مدیران ربات', color: 'amber' },
  ];

  const getActiveClasses = (color: string) => {
    const map: Record<string, string> = {
      sky: 'bg-sky-600 text-white shadow-md shadow-sky-600/20',
      amber: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
      emerald: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
      pink: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/20',
      purple: 'bg-purple-600 text-white shadow-md shadow-purple-600/20',
      rose: 'bg-rose-600 text-white shadow-md shadow-rose-600/20',
      indigo: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20',
      slate: 'bg-slate-700 text-white shadow',
    };
    return map[color] || map.slate;
  };

  const handleNavClick = (id: typeof activeTab) => {
    setActiveTab(id);
    onMobileClose();
  };

  const sidebarContent = (
    <>
      {/* Top: Hamburger + Brand */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-800 shrink-0 h-16">
        <button
          onClick={onToggle}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-700 shrink-0"
          title={expanded ? 'بستن منو' : 'باز کردن منو'}
        >
          {expanded ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <div className={`flex items-center gap-2 min-w-0 transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
            <CakeSlice className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-white truncate max-w-[130px]">{botSettings.storeName}</h1>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <Bot className="w-2.5 h-2.5 text-sky-500" />
              <span>@{botSettings.botUsername}</span>
              {botSettings.isLiveBotActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="px-2 py-3 border-b border-slate-800 shrink-0">
        <div className={`flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 gap-1 ${expanded ? 'flex-row' : 'flex-col'}`}>
          <button
            onClick={() => setSimulatorRole('customer')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${expanded ? 'flex-1 px-2' : 'w-full px-0'} ${
              simulatorRole === 'customer'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="دید مشتری"
          >
            <User className="w-4 h-4 shrink-0" />
            {expanded && <span className="whitespace-nowrap">مشتری</span>}
          </button>
          <button
            onClick={() => setSimulatorRole('admin')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${expanded ? 'flex-1 px-2' : 'w-full px-0'} ${
              simulatorRole === 'admin'
                ? 'bg-amber-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="پنل ادمین"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {expanded && <span className="whitespace-nowrap">ادمین</span>}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-medium transition-all relative ${
                isActive
                  ? getActiveClasses(item.color)
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
              {item.badge && item.badge > 0 && (
                <span className={`text-[10px] rounded-full font-bold flex items-center justify-center transition-all ${
                  expanded ? 'mr-auto px-1.5 py-0.5' : 'absolute top-0.5 left-0.5 w-4 h-4'
                } ${
                  isActive 
                    ? 'bg-white/25 text-white' 
                    : 'bg-amber-500 text-white'
                }`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className={`text-[10px] text-slate-600 text-center transition-opacity duration-200 whitespace-nowrap ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          مدیریت قنادی
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onMobileClose}
          style={{ display: isMobile ? 'block' : 'none' }}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <aside
          className="fixed top-0 right-0 z-50 h-screen w-72 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
          style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
              <CakeSlice className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">{botSettings.storeName || 'پنل مدیریت'}</h1>
          </div>
          <button
            onClick={onMobileClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Role Switcher */}
        <div className="px-2 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 gap-1 flex-row">
            <button
              onClick={() => setSimulatorRole('customer')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all flex-1 px-2 ${
                simulatorRole === 'customer'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>مشتری</span>
            </button>
            <button
              onClick={() => setSimulatorRole('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all flex-1 px-2 ${
                simulatorRole === 'admin'
                  ? 'bg-amber-600 text-white shadow font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>ادمین</span>
            </button>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? getActiveClasses(item.color)
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className={`mr-auto text-[10px] rounded-full font-bold px-2 py-0.5 ${
                    isActive ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className="fixed top-0 right-0 z-40 h-screen bg-slate-900 border-l border-slate-800 shadow-xl transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col"
          style={{ width: expanded ? '16rem' : '4rem' }}
        >
          {sidebarContent}
        </aside>
      )}
    </>
  );
};
