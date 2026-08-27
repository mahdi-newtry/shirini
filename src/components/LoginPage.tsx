import React, { useState } from 'react';
import { Lock, User, CakeSlice, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  settings: any;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, settings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validUsername = settings.webAdminUsername || 'admin';
    const validPassword = settings.webAdminPassword || 'admin';

    if (username === validUsername && password === validPassword) {
      localStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('نام کاربری یا رمز عبور اشتباه است');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 shadow-2xl shadow-pink-500/30 mb-4">
            <CakeSlice className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">پنل مدیریت قنادی</h1>
          <p className="text-slate-400 text-sm">برای ورود نام کاربری و رمز عبور خود را وارد کنید</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 space-y-6 shadow-2xl">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">نام کاربری</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                placeholder="admin"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">رمز عبور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                placeholder="admin"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.02]"
          >
            ورود به پنل
          </button>

          {/* Hint */}
          <p className="text-xs text-slate-500 text-center">
            نام کاربری و رمز عبور پیش‌فرض: <code className="text-amber-400">admin</code>
          </p>
        </form>
      </div>
    </div>
  );
};
