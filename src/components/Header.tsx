import React from 'react';
import { 
  Bot, 
  CakeSlice, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  User, 
  Sparkles,
  Smartphone,
  Ticket,
  Headphones,
  Wand2,
  Sun,
  Moon,
  Database,
  Cake
} from 'lucide-react';
import { BotSettings } from '../types';

interface HeaderProps {
  activeTab: 'simulator' | 'products' | 'orders' | 'custom_orders' | 'discounts' | 'support' | 'texts' | 'analytics' | 'settings' | 'backup';
  setActiveTab: (tab: 'simulator' | 'products' | 'orders' | 'custom_orders' | 'discounts' | 'support' | 'texts' | 'analytics' | 'settings' | 'backup') => void;
  botSettings: BotSettings;
  ordersCount: number;
  productsCount: number;
  customOrdersCount?: number;
  pendingCustomOrdersCount?: number;
  discountsCount?: number;
  openTicketsCount?: number;
  simulatorRole: 'customer' | 'admin';
  setSimulatorRole: (role: 'customer' | 'admin') => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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
  theme,
  toggleTheme,
}) => {
  const isLight = theme === 'light';

  return (
    <header className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-lg'} border-b sticky top-0 z-40 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand & Store Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/20 ring-2 ring-white/10 shrink-0">
              <CakeSlice className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
                  {botSettings.storeName}
                </h1>
                <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isLight 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}>
                  قنادی و شیرینی‌پزی
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-1.5 mt-0.5`}>
                <Bot className="w-3.5 h-3.5 text-sky-500" />
                <span>ربات تلگرام: @{botSettings.botUsername}</span>
                {botSettings.isLiveBotActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="ربات واقعی فعال است" />
                )}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={`hidden xl:flex items-center gap-1 p-1.5 rounded-xl border ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <button
              id="tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>شبیه‌ساز تلگرام</span>
            </button>

            <button
              id="tab-products"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'products'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CakeSlice className="w-4 h-4" />
              <span>محصولات</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full border ${
                isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {productsCount}
              </span>
            </button>

            <button
              id="tab-orders"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>سفارشات عادی</span>
              {ordersCount > 0 && (
                <span className="text-[11px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                  {ordersCount}
                </span>
              )}
            </button>

            <button
              id="tab-custom-orders"
              onClick={() => setActiveTab('custom_orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'custom_orders'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25 font-bold'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Cake className="w-4 h-4 text-pink-400" />
              <span>سفارش دلخواه</span>
              {pendingCustomOrdersCount > 0 ? (
                <span className="text-[11px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                  {pendingCustomOrdersCount}
                </span>
              ) : customOrdersCount > 0 ? (
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full border ${
                  isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {customOrdersCount}
                </span>
              ) : null}
            </button>

            <button
              id="tab-support"
              onClick={() => setActiveTab('support')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'support'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>پشتیبانی و تیکت‌ها</span>
              {openTicketsCount > 0 && (
                <span className="text-[11px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                  {openTicketsCount}
                </span>
              )}
            </button>

            <button
              id="tab-texts"
              onClick={() => setActiveTab('texts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'texts'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              <span>شخصی‌سازی متون</span>
            </button>

            <button
              id="tab-discounts"
              onClick={() => setActiveTab('discounts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'discounts'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>تخفیف‌ها</span>
              {discountsCount > 0 && (
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full border ${
                  isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {discountsCount}
                </span>
              )}
            </button>

            <button
              id="tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>آمار</span>
            </button>

            <button
              id="tab-backup"
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'backup'
                  ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>بکاپ و بازیابی</span>
            </button>

            <button
              id="tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-700 text-white shadow'
                  : isLight 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>تنظیمات</span>
            </button>
          </nav>

          {/* Quick Controls: Theme Toggle & Role Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle Button */}
            <button
              id="admin-theme-switch-btn"
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm group ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-slate-400 shadow-slate-200/50'
                  : 'bg-slate-950/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-amber-500/40 hover:text-amber-300'
              }`}
              title={isLight ? 'تغییر به تم تیره (دارک مود)' : 'تغییر به تم روشن (لایت مود)'}
            >
              {isLight ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform duration-200" />
                  <span className="hidden sm:inline font-medium">تم تیره</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-200" />
                  <span className="hidden sm:inline font-medium">تم روشن</span>
                </>
              )}
            </button>

            {/* Role Switcher */}
            <div className={`flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
            }`}>
              <button
                id="role-customer-toggle"
                onClick={() => setSimulatorRole('customer')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  simulatorRole === 'customer'
                    ? 'bg-sky-600 text-white shadow'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمایش ربات از دید خریدار شیرینی"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">دید مشتری</span>
              </button>
              <button
                id="role-admin-toggle"
                onClick={() => setSimulatorRole('admin')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  simulatorRole === 'admin'
                    ? 'bg-amber-600 text-white shadow font-semibold'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمایش پنل مدیریت ادمین در تلگرام"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>پنل صاحب قنادی</span>
              </button>
            </div>
          </div>

        </div>

        {/* Mobile & Medium Screen Sub-Navigation Bar */}
        <div className={`flex xl:hidden overflow-x-auto py-2 gap-1.5 border-t scrollbar-none ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'simulator' ? 'bg-sky-500 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            📱 شبیه‌ساز تلگرام
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'products' ? 'bg-amber-600 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            🍰 محصولات ({productsCount})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            📦 سفارشات ({ordersCount})
          </button>
          <button
            onClick={() => setActiveTab('custom_orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'custom_orders' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            🎂 کیک دلخواه {pendingCustomOrdersCount > 0 ? `(${pendingCustomOrdersCount})` : customOrdersCount > 0 ? `(${customOrdersCount})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'support' ? 'bg-purple-600 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            💬 پشتیبانی {openTicketsCount > 0 ? `(${openTicketsCount})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('texts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'texts' ? 'bg-pink-600 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            ✍️ متون ربات
          </button>
          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'discounts' ? 'bg-rose-600 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            🎟️ تخفیف‌ها ({discountsCount})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            📊 آمار فروش
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'backup' ? 'bg-indigo-600 text-white font-bold' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            💾 بکاپ و بازیابی
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-slate-700 text-white' : isLight ? 'text-slate-700 bg-slate-100' : 'text-slate-300 bg-slate-800/40'
            }`}
          >
            ⚙️ تنظیمات ربات
          </button>
        </div>
      </div>
    </header>
  );
};


