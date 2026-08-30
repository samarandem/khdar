import React from 'react';
import { ShopSettings, ActiveTab } from '../types';
import { Store, Calendar, FileSpreadsheet, Settings, Plus, Cloud, CloudDownload, RefreshCw, CloudOff, LogOut } from 'lucide-react';
import { formatImageUrl, DEFAULT_SHOP_LOGO } from '../utils/imageUtils';

interface HeaderProps {
  settings: ShopSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onExportExcel: () => void;
  onStartNewInvoice?: () => void;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
  lastSyncedAt?: string;
  onSyncNow?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  setActiveTab,
  onExportExcel,
  onStartNewInvoice,
  isCloudConnected = false,
  isSyncing = false,
  lastSyncedAt,
  onSyncNow,
  onLogout,
}) => {
  const todayFormatted = new Date().toLocaleDateString('ar-JO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs no-print">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Subtitle */}
        <div
          id="app-header-brand"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#087A35] flex items-center justify-center text-white shadow-xs group-hover:bg-[#0A8F3D] transition-colors overflow-hidden p-0.5">
            <img
              src={formatImageUrl(settings.logoUrl)}
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target && settings.logoUrl) {
                  const original = settings.logoUrl.trim();
                  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(original)}&output=png`;
                  if (target.src !== proxyUrl && !target.src.includes('images.weserv.nl')) {
                    target.src = proxyUrl;
                    return;
                  }
                }
                if (target && target.src !== DEFAULT_SHOP_LOGO) {
                  target.src = DEFAULT_SHOP_LOGO;
                }
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base text-[#1A1A1A] leading-tight tracking-tight">
                {settings.shopName || 'خضار وفواكه'}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold bg-[#F0F9F4] text-[#087A35] rounded border border-[#087A35]/20">
                مباشر
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-none mt-0.5">
              {settings.shopSubtitle || 'فواتير ومبيعات'}
            </p>
          </div>
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cloud Sync Status Indicator Pill */}
          <button
            id="btn-header-cloud-sync"
            onClick={() => {
              if (onSyncNow) {
                onSyncNow();
              } else {
                setActiveTab('settings');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isSyncing
                ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
            }`}
            title={
              lastSyncedAt
                ? `آخر جلب من الإكسل: ${new Date(lastSyncedAt).toLocaleTimeString('ar-JO')}`
                : 'جلب وتحديث البيانات من Google Sheets الآن'
            }
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#087A35] animate-spin" />
            ) : (
              <CloudDownload className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">
              {isSyncing ? 'جاري الجلب...' : 'مزامنة من الشيت'}
            </span>
          </button>

          {onStartNewInvoice && (
            <button
              id="btn-header-new-invoice"
              onClick={onStartNewInvoice}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold shadow-xs transition-colors"
              title="فاتورة جديدة"
            >
              <Plus className="w-4 h-4" />
              <span>فاتورة جديدة</span>
            </button>
          )}

          <button
            id="btn-header-date-prices"
            onClick={() => setActiveTab('today-prices')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F0F9F4] hover:bg-[#E2F4E9] text-[#087A35] text-xs font-bold border border-[#087A35]/20 transition-colors"
            title="عرض أسعار اليوم"
          >
            <Calendar className="w-3.5 h-3.5 text-[#087A35]" />
            <span className="hidden xs:inline">{todayFormatted}</span>
          </button>

          <button
            id="btn-header-excel"
            onClick={onExportExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-[#F0F9F4] hover:text-[#087A35] text-gray-700 text-xs font-bold transition-colors"
            title="تصدير إكسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#087A35]" />
            <span className="hidden md:inline">إكسل</span>
          </button>

          <button
            id="btn-header-settings"
            onClick={() => setActiveTab('settings')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-[#087A35] hover:bg-[#F0F9F4] border border-gray-200 transition-colors"
            title="الإعدادات"
          >
            <Settings className="w-4 h-4" />
          </button>

          {onLogout && (
            <button
              id="btn-header-logout"
              onClick={onLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
              title="تسجيل الخروج وقفل الشاشة"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
