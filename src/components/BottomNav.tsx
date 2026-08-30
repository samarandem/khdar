import React from 'react';
import { ActiveTab } from '../types';
import { Home, Receipt, Plus, Carrot, MoreHorizontal, Tag, SlidersHorizontal, Settings, FileSpreadsheet, Users } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onStartNewInvoice: () => void;
  onExportExcel: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onStartNewInvoice,
  onExportExcel,
}) => {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  const handleTabClick = (tab: ActiveTab) => {
    setShowMoreMenu(false);
    setActiveTab(tab);
  };

  return (
    <>
      {/* "More" Backdrop Menu */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs transition-opacity no-print"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto bg-white rounded-2xl p-2.5 shadow-xl border border-gray-200 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-bottom-3 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-gray-100">
              <p className="text-[11px] font-bold text-gray-400">خيارات إضافية</p>
            </div>

            <button
              id="btn-more-customers"
              onClick={() => handleTabClick('customers')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-bold transition-colors text-right"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[#1A1A1A] font-bold">سجل العملاء والزبائن</div>
                <div className="text-[10px] text-gray-400">إضافة، تعديل، اتصال وفواتير العميل</div>
              </div>
            </button>

            <button
              id="btn-more-today-prices"
              onClick={() => handleTabClick('today-prices')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:bg-[#F0F9F4] hover:text-[#087A35] text-xs font-bold transition-colors text-right"
            >
              <div className="w-7 h-7 rounded-lg bg-[#F0F9F4] text-[#087A35] flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[#1A1A1A] font-bold">أسعار اليوم</div>
                <div className="text-[10px] text-gray-400">عرض وطباعة ومشاركة الأسعار</div>
              </div>
            </button>

            <button
              id="btn-more-edit-prices"
              onClick={() => handleTabClick('edit-prices')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:bg-amber-50 hover:text-amber-800 text-xs font-bold transition-colors text-right"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[#1A1A1A] font-bold">تعديل الأسعار</div>
                <div className="text-[10px] text-gray-400">تحديث سريع لأسعار اليوم</div>
              </div>
            </button>

            <button
              id="btn-more-excel"
              onClick={() => {
                setShowMoreMenu(false);
                onExportExcel();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-800 text-xs font-bold transition-colors text-right"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[#1A1A1A] font-bold">تصدير إكسل (Excel)</div>
                <div className="text-[10px] text-gray-400">تحميل شيت الفواتير والأصناف</div>
              </div>
            </button>

            <button
              id="btn-more-settings"
              onClick={() => handleTabClick('settings')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-xs font-bold transition-colors text-right"
            >
              <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[#1A1A1A] font-bold">إعدادات المحل</div>
                <div className="text-[10px] text-gray-400">معلومات المحل وأرقام التواصل</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-sm no-print">
        <div className="max-w-lg mx-auto px-4 h-15 flex items-center justify-between relative">
          {/* 1. Home */}
          <button
            id="nav-tab-home"
            onClick={() => handleTabClick('home')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'home'
                ? 'text-[#087A35] font-bold'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            <Home className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[10px]">الرئيسية</span>
          </button>

          {/* 2. Invoices */}
          <button
            id="nav-tab-invoices"
            onClick={() => handleTabClick('invoices')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'invoices'
                ? 'text-[#087A35] font-bold'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            <Receipt className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[10px]">الفواتير</span>
          </button>

          {/* 3. Center Elevated Action Button: + فاتورة */}
          <div className="flex-1 flex justify-center -mt-5">
            <button
              id="nav-tab-new-invoice-center"
              onClick={onStartNewInvoice}
              className="w-12 h-12 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white flex flex-col items-center justify-center shadow-md shadow-[#087A35]/30 active:scale-95 transition-all focus:outline-none"
              title="فاتورة جديدة"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span className="text-[8px] font-extrabold mt-[-2px]">فاتورة</span>
            </button>
          </div>

          {/* 4. Products */}
          <button
            id="nav-tab-products"
            onClick={() => handleTabClick('products')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'products'
                ? 'text-[#087A35] font-bold'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            <Carrot className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[10px]">الأصناف</span>
          </button>

          {/* 5. More */}
          <button
            id="nav-tab-more"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              showMoreMenu || activeTab === 'settings' || activeTab === 'today-prices' || activeTab === 'edit-prices'
                ? 'text-[#087A35] font-bold'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            <MoreHorizontal className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[10px]">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
};
