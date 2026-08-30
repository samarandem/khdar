import React, { useState } from 'react';
import { ShopSettings } from '../types';
import { verifyCredentials, loginSession } from '../services/authService';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  Store,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface LoginScreenProps {
  settings: ShopSettings;
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const isValid = verifyCredentials(username, password, settings);

      if (isValid) {
        loginSession(username, rememberMe);
        setIsLoading(false);
        onLoginSuccess(username.trim());
      } else {
        setIsLoading(false);
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F0F9F4] via-[#FAFAFA] to-white flex flex-col justify-center items-center px-4 py-8 select-none" dir="rtl">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 border border-gray-100 space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#087A35] flex items-center justify-center text-white shadow-lg shadow-emerald-700/20 ring-4 ring-emerald-50">
              <Store className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0F9F4] border border-[#087A35]/20 text-[#087A35] text-xs font-bold mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تسجيل الدخول للنظام</span>
              </div>
              <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
                {settings.shopName || 'خضار وفواكه'}
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {settings.shopSubtitle || 'نظام إدارة الفواتير والمبيعات اليومية'}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                اسم المستخدم (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-[#1A1A1A] placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:border-[#087A35] focus:ring-2 focus:ring-[#087A35]/15 focus:outline-none transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  كلمة المرور (Password)
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="أدخل كلمة المرور"
                  className="w-full pr-9 pl-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-[#1A1A1A] placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:border-[#087A35] focus:ring-2 focus:ring-[#087A35]/15 focus:outline-none transition-all"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#087A35] border-gray-300 focus:ring-[#087A35] accent-[#087A35]"
                />
                <span className="text-xs font-medium text-gray-600">
                  تذكر تسجيل الدخول في هذا المتصفح
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>دخول للنظام</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-gray-400 font-medium">
          نظام الكاشير والفواتير السحابي © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
