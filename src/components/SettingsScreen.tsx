import React, { useState } from 'react';
import { ShopSettings, Invoice, Product, Customer } from '../types';
import { GoogleSheetsPanel } from './GoogleSheetsPanel';
import {
  Settings,
  Store,
  FileSpreadsheet,
  RotateCcw,
  Save,
  Check,
  Hash,
  ShieldCheck,
  Lock,
  User,
  LogOut,
  Wrench,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { exportInvoicesToExcel, exportProductsToExcel } from '../services/excelService';
import { migrateAllProducts } from '../services/storage';
import { formatImageUrl } from '../utils/imageUtils';

interface SettingsScreenProps {
  settings: ShopSettings;
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  onSaveSettings: (settings: ShopSettings) => void;
  onResetData: () => void;
  onDataLoadedFromSheets?: (
    products?: Product[],
    invoices?: Invoice[],
    settings?: Partial<ShopSettings>,
    customers?: Customer[]
  ) => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  invoices,
  products,
  customers,
  onSaveSettings,
  onResetData,
  onDataLoadedFromSheets = () => {},
  onLogout,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({
    requireLogin: true,
    username: 'user',
    password: 'pass',
    ...settings,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    setFormData({
      requireLogin: true,
      username: 'user',
      password: 'pass',
      ...settings,
    });
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportInvoices = () => {
    exportInvoicesToExcel(invoices, customers, `فواتير_${formData.shopName.replace(/\s+/g, '_')}`, formData);
  };

  const handleExportProducts = () => {
    exportProductsToExcel(products, `قائمة_منتجات_${formData.shopName.replace(/\s+/g, '_')}`);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
          <Settings className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-extrabold text-base text-[#1A1A1A]">إعدادات النظام</h2>
          <p className="text-[11px] text-gray-500 font-medium">
            تخصيص بيانات المحل والفواتير والتصدير
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-[#F0F9F4] border border-[#087A35]/30 text-[#087A35] text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#087A35]" />
          <span>تم حفظ التعديلات بنجاح!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* 1. Shop Info */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 space-y-3">
          <h3 className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Store className="w-4 h-4 text-[#087A35]" />
            <span>بيانات المحل</span>
          </h3>

          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                اسم المحل
              </label>
              <input
                id="input-setting-shop-name"
                type="text"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                الوصف / الشعار الفرعي
              </label>
              <input
                id="input-setting-shop-subtitle"
                type="text"
                value={formData.shopSubtitle}
                onChange={(e) => setFormData({ ...formData, shopSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:border-[#087A35] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5">
                  رقم الهاتف للاتصال
                </label>
                <input
                  id="input-setting-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5">
                  رقم الواتساب (مع الرمز الدولي)
                </label>
                <input
                  id="input-setting-whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="962791234567"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Logo Settings with File Upload & Live Preview */}
            <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800">
                  شعار المحل (اللوجو للفواتير والـ PDF)
                </label>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف الشعار</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Logo Preview Box */}
                <div className="w-16 h-16 rounded-xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData.logoUrl ? (
                    <img
                      src={formatImageUrl(formData.logoUrl)}
                      alt="معاينة اللوجو"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* Upload & Link Controls */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="logo-file-input"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>اختيار صورة من الجهاز</span>
                    </label>
                    <input
                      id="logo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <span className="text-[10px] text-gray-500 font-medium">أو أدخل الرابط أدناه:</span>
                  </div>

                  <input
                    id="input-setting-logo-url"
                    type="text"
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="رابط مباشر أو رابط Google Drive"
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-800 focus:border-[#087A35] focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                عنوان المحل
              </label>
              <input
                id="input-setting-address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:border-[#087A35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                عبارة التذييل في الفاتورة (Slogan)
              </label>
              <input
                id="input-setting-slogan"
                type="text"
                value={formData.slogan}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:border-[#087A35] focus:outline-none"
              />
            </div>

            {/* Custom Today Prices Title */}
            <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-200/80 space-y-1.5">
              <label className="block text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span>عنوان / كتابة قائمة أسعار اليوم</span>
                <span className="text-[10px] font-medium text-emerald-700">يظهر في الـ PDF والنشرة والشاشة</span>
              </label>
              <input
                id="input-setting-today-prices-title"
                type="text"
                value={formData.todayPricesTitle || ''}
                onChange={(e) => setFormData({ ...formData, todayPricesTitle: e.target.value })}
                placeholder="أسعار اليوم"
                className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-emerald-950 focus:border-[#087A35] focus:outline-none placeholder:text-gray-400"
              />
              <p className="text-[10px] text-emerald-800/80">
                يمكنك تخصيص العنوان الذي يظهر في ترويسة ملف PDF لأسعار اليوم، الشاشة الرئيسية، ورسائل الواتساب (مثال: "أسعار اليوم"، "نشرة أسعار الخضار والفواكه"، "قائمة الأسعار الرسمية").
              </p>
            </div>
          </div>
        </div>

        {/* 2. Invoice & Rounding Preferences */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 space-y-3">
          <h3 className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Hash className="w-4 h-4 text-[#087A35]" />
            <span>إعدادات الفاتورة والعملة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                العملة
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                رقم بداية الفواتير
              </label>
              <input
                type="number"
                value={formData.startingInvoiceNumber}
                onChange={(e) => setFormData({ ...formData, startingInvoiceNumber: parseInt(e.target.value, 10) || 1001 })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                منازل تقريب الإجمالي
              </label>
              <select
                value={formData.roundingMode}
                onChange={(e) => setFormData({ ...formData, roundingMode: e.target.value as '2' | '3' })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none"
              >
                <option value="2">منزلتين (مثال: 1.76 د.أ)</option>
                <option value="3">3 منازل (مثال: 1.762 د.أ)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Login & Security Settings */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#087A35]" />
              <span>أمان وتسجيل الدخول (User & Password)</span>
            </h3>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                title="تسجيل الخروج وقفل الشاشة"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <span className="text-xs font-bold text-gray-800 block">
                  طلب تسجيل الدخول عند فتح الموقع
                </span>
                <span className="text-[10px] text-gray-500 block">
                  إظهار شاشة اسم المستخدم وكلمة المرور لحماية النظام
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireLogin ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, requireLogin: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#087A35]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>اسم المستخدم (Username)</span>
                </label>
                <input
                  id="input-setting-username"
                  type="text"
                  value={formData.username || 'user'}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="user"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                  <span>كلمة المرور (Password)</span>
                </label>
                <input
                  id="input-setting-password"
                  type="text"
                  value={formData.password || 'pass'}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="pass"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#087A35] focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500">
              * ملاحظة: يمكنك دائماً الدخول باستخدام <strong className="text-gray-700">user / pass</strong> أو الحساب المخصص أعلاه.
            </p>
          </div>
        </div>

        {/* Save Settings Button */}
        <button
          id="btn-save-settings"
          type="submit"
          className="w-full py-2.5 px-4 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white font-bold text-xs shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>حفظ إعدادات المحل</span>
        </button>
      </form>

      {/* Google Sheets Live Database Section */}
      <GoogleSheetsPanel
        products={products}
        invoices={invoices}
        settings={settings}
        customers={customers}
        onDataLoadedFromSheets={onDataLoadedFromSheets}
      />

      {/* 3. Excel Export & Backup Section */}
      <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 space-y-2.5">
        <h3 className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
          <FileSpreadsheet className="w-4 h-4 text-[#087A35]" />
          <span>تصدير البيانات إلى Excel</span>
        </h3>

        <p className="text-[11px] text-gray-500">
          يمكنك تصدير كامل سجلات الفواتير وتفاصيل كل صنف بدقة وزنية عالية، أو تصدير قائمة المنتجات والأسعار الحالية.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          <button
            id="btn-settings-export-invoices-excel"
            type="button"
            onClick={handleExportInvoices}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#F0F9F4] hover:bg-[#E2F4EB] text-[#087A35] font-bold text-xs border border-[#087A35]/30 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#087A35]" />
            <span>تصدير الفواتير والأصناف (Excel)</span>
          </button>

          <button
            id="btn-settings-export-products-excel"
            type="button"
            onClick={handleExportProducts}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-gray-600" />
            <span>تصدير قائمة المنتجات (Excel)</span>
          </button>
        </div>
      </div>

      {/* 4. Maintenance */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 space-y-3">
          <h3 className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
            <Wrench className="w-4 h-4 text-gray-500" />
            <span>صيانة البيانات</span>
          </h3>
          <p className="text-[11px] text-gray-500">
            إذا واجهت مشاكل في الأسعار أو فواصل الأرقام، يمكنك إصلاحها هنا.
          </p>
          <button
            id="btn-fix-prices"
            type="button"
            onClick={() => {
              if (window.confirm('هل تريد تصحيح تنسيق جميع أسعار المنتجات؟')) {
                migrateAllProducts();
                alert('تم تصحيح الأسعار بنجاح!');
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
          >
            تصحيح تنسيق الأسعار
          </button>
        </div>

      {/* 4. Reset Demo Data */}
      <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 space-y-2">
        <h3 className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
          <RotateCcw className="w-4 h-4 text-gray-500" />
          <span>إعادة ضبط البيانات التجريبية</span>
        </h3>
        <p className="text-[11px] text-gray-500">
          استعادة البيانات الافتراضية للفواتير والمنتجات وإعدادات المحل الأصلية.
        </p>
        <button
          id="btn-reset-demo-data"
          type="button"
          onClick={() => {
            if (window.confirm('هل تريد استعادة البيانات التجريبية الافتراضية؟')) {
              onResetData();
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 text-xs font-bold transition-colors"
        >
          إعادة ضبط البيانات الافتراضية
        </button>
      </div>
    </div>
  );
};
