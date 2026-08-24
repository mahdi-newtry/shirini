import React, { useState } from 'react';
import { Users, Plus, Trash2, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { BotSettings } from '../types';

interface AdminManagerProps {
  settings: BotSettings;
  onUpdateSettings: (newSettings: Partial<BotSettings>) => Promise<void>;
}

export const AdminManager: React.FC<AdminManagerProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [newAdminId, setNewAdminId] = useState('');
  const [error, setError] = useState('');

  const adminIds = settings.adminTelegramIds || [];

  const handleAddAdmin = async () => {
    const trimmed = newAdminId.trim();
    if (!trimmed) {
      setError('لطفاً Telegram ID را وارد کنید');
      return;
    }
    if (adminIds.includes(trimmed)) {
      setError('این آیدی قبلاً اضافه شده است');
      return;
    }
    setError('');
    setNewAdminId('');
    await onUpdateSettings({ adminTelegramIds: [...adminIds, trimmed] });
  };

  const handleRemoveAdmin = async (id: string) => {
    await onUpdateSettings({ adminTelegramIds: adminIds.filter(x => x !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">مدیران ربات تلگرام</h3>
            <p className="text-xs text-slate-400">
              Telegram ID کاربرانی که دسترسی به پنل مدیریت در ربات تلگرام دارند
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAdminId}
            onChange={(e) => { setNewAdminId(e.target.value); setError(''); }}
            placeholder="Telegram ID (مثال: 123456789)"
            className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={handleAddAdmin}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            افزودن
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <div className="space-y-2">
          {adminIds.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">هنوز مدیری اضافه نشده</p>
          ) : (
            adminIds.map((id) => (
              <div key={id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-white font-mono">{id}</span>
                </div>
                <button
                  onClick={() => handleRemoveAdmin(id)}
                  className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <p className="text-[11px] text-slate-500">
            💡 برای پیدا کردن Telegram ID خود، ربات <code className="text-amber-400">@userinfobot</code> را در تلگرام استارت کنید.
          </p>
        </div>
      </div>
    </div>
  );
};
