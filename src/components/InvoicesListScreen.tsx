import React, { useState, useMemo, useRef } from 'react';
import { Invoice, ShopSettings } from '../types';
import { importInvoicesFromExcel } from '../services/excelService';
import {
  Search,
  Receipt,
  Calendar,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  X,
  Edit,
  Trash2,
  Eye,
  Printer,
  Upload,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface InvoicesListScreenProps {
  invoices: Invoice[];
  settings: ShopSettings;
  onSelectInvoice?: (invoice: Invoice) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onPrintInvoice?: (invoice: Invoice) => void;
  onStartNewInvoice: () => void;
  onExportExcel?: () => void;
  onImportInvoices?: (invoices: Invoice[]) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoice: Invoice) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';
type StatusFilter = 'all' | 'paid' | 'pending';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const InvoicesListScreen: React.FC<InvoicesListScreenProps> = ({
  invoices,
  settings,
  onSelectInvoice,
  onViewInvoice,
  onPrintInvoice,
  onStartNewInvoice,
  onExportExcel,
  onImportInvoices,
  onEditInvoice,
  onDeleteInvoice,
  onUpdateInvoice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleInvoiceClick = (invoice: Invoice) => {
    if (onSelectInvoice) onSelectInvoice(invoice);
    else if (onViewInvoice) onViewInvoice(invoice);
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotification(null);

    try {
      const result = await importInvoicesFromExcel(file, invoices);
      if (onImportInvoices) {
        onImportInvoices(result.updatedInvoices);
      }
      setImportNotification({
        type: 'success',
        message: `تم استيراد الفواتير بنجاح: تم تحديث ${result.matchedCount} فاتورة وإضافة ${result.addedCount} فاتورة جديدة.`,
      });
    } catch (err: any) {
      setImportNotification({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء قراءة ملف الفواتير من Excel',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter & Sort invoices
  const filteredInvoices = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return invoices
      .filter((inv) => {
        // 1. Search Query (invoice ID, customer name, phone, or item name)
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          inv.id.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          (inv.customerPhone && inv.customerPhone.includes(q)) ||
          inv.items.some((item) => item.productName.toLowerCase().includes(q));

        if (!matchSearch) return false;

        // 2. Status Filter
        const isPending = inv.status === 'pending';
        if (statusFilter === 'paid' && isPending) return false;
        if (statusFilter === 'pending' && !isPending) return false;

        // 3. Date Filter
        if (dateFilter === 'today') {
          return inv.date === todayStr;
        }
        if (dateFilter === 'yesterday') {
          return inv.date === yesterdayStr;
        }
        if (dateFilter === 'week') {
          const invDate = new Date(inv.date);
          return invDate >= sevenDaysAgo;
        }
        if (dateFilter === 'month') {
          const invDate = new Date(inv.date);
          return invDate >= thirtyDaysAgo;
        }

        return true; // 'all'
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const dateCompare = (b.date || '').localeCompare(a.date || '');
          if (dateCompare !== 0) return dateCompare;
          return (b.time || '').localeCompare(a.time || '');
        }
        if (sortBy === 'oldest') {
          const dateCompare = (a.date || '').localeCompare(b.date || '');
          if (dateCompare !== 0) return dateCompare;
          return (a.time || '').localeCompare(b.time || '');
        }
        if (sortBy === 'highest') {
          return b.total - a.total;
        }
        if (sortBy === 'lowest') {
          return a.total - b.total;
        }
        return 0;
      });
  }, [invoices, searchQuery, dateFilter, statusFilter, sortBy]);

  // Aggregate stats of filtered invoices
  const filteredStats = useMemo(() => {
    let totalSales = 0;
    let paidSales = 0;
    let pendingSales = 0;
    let paidCount = 0;
    let pendingCount = 0;

    filteredInvoices.forEach((inv) => {
      totalSales += inv.total;
      if (inv.status === 'pending') {
        pendingSales += inv.total;
        pendingCount += 1;
      } else {
        paidSales += inv.total;
        paidCount += 1;
      }
    });

    return { totalSales, paidSales, pendingSales, paidCount, pendingCount };
  }, [filteredInvoices]);

  const hasActiveFilters =
    searchQuery !== '' || dateFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setStatusFilter('all');
    setSortBy('newest');
  };

  return (
    <div className="space-y-3.5 pb-28 animate-in fade-in duration-200">
      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* Top Title & Excel Export/Import (High Density) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="font-extrabold text-base text-[#1A1A1A]">سجل الفواتير</h2>
          <p className="text-[11px] text-gray-500 font-medium">
            إجمالي {invoices.length} فاتورة مسجلة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export to Excel */}
          <button
            id="btn-invoices-export-excel"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F9F4] hover:bg-[#E2F4EB] text-[#087A35] text-xs font-bold border border-[#087A35]/30 transition-colors cursor-pointer"
            title="تصدير الفواتير إلى ملف Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#087A35]" />
            <span>تصدير Excel</span>
          </button>

          {/* Import from Excel */}
          <button
            id="btn-invoices-import-excel"
            onClick={handleTriggerFileInput}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
            title="استيراد وتحديث الفواتير من ملف Excel"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-blue-700" />
            )}
            <span>{isImporting ? 'جاري الاستيراد...' : 'استيراد Excel'}</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importNotification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            importNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{importNotification.message}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-gray-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search, Status & Date Filter Card */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 space-y-3">
        {/* Search Bar & Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-invoices-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم المشتري، الهاتف، أو اسم الصنف..."
              className="w-full pr-9 pl-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#087A35] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-[#087A35] shrink-0"
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
            <option value="highest">الأعلى مبلغاً</option>
            <option value="lowest">الأقل مبلغاً</option>
          </select>
        </div>

        {/* Status Filter Row */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 mb-1 flex items-center justify-between">
            <span>حالة الفاتورة (الدفع):</span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                إلغاء الفلاتر
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              id="filter-status-all"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-[#1A1A1A] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              جميع الحالات
            </button>

            <button
              id="filter-status-paid"
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>مدفوعة</span>
            </button>

            <button
              id="filter-status-pending"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>ذمم (آجل)</span>
            </button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span>الفترة الزمنية:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              id="filter-date-all"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                dateFilter === 'all'
                  ? 'bg-[#087A35] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              كل الأوقات ({invoices.length})
            </button>

            <button
              id="filter-date-today"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                dateFilter === 'today'
                  ? 'bg-[#087A35] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              اليوم
            </button>

            <button
              id="filter-date-yesterday"
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                dateFilter === 'yesterday'
                  ? 'bg-[#087A35] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الأمس
            </button>

            <button
              id="filter-date-week"
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                dateFilter === 'week'
                  ? 'bg-[#087A35] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              آخر 7 أيام
            </button>

            <button
              id="filter-date-month"
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                dateFilter === 'month'
                  ? 'bg-[#087A35] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              هذا الشهر
            </button>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Summary Banner for Active Filters */}
      <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-gray-200 text-xs space-y-1.5">
        <div className="flex items-center justify-between text-gray-700 font-bold">
          <span>
            نتائج الفلترة: <strong className="text-[#1A1A1A]">{filteredInvoices.length}</strong> فاتورة
          </span>
          <span>
            المجموع الكلي: <strong className="text-[#087A35] font-black">{filteredStats.totalSales.toFixed(2)} {settings.currency}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
          <div className="bg-emerald-50/80 p-1.5 rounded-xl border border-emerald-200/70 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              مدفوع ({filteredStats.paidCount}):
            </span>
            <span className="font-extrabold text-[#087A35] text-xs">
              {filteredStats.paidSales.toFixed(2)} {settings.currency}
            </span>
          </div>

          <div className="bg-amber-50/80 p-1.5 rounded-xl border border-amber-200/70 flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              ذمم ({filteredStats.pendingCount}):
            </span>
            <span className="font-extrabold text-amber-800 text-xs">
              {filteredStats.pendingSales.toFixed(2)} {settings.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Invoices List Table / Cards (High Density) */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200 space-y-3">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-xs font-bold text-gray-700">لم يتم العثور على فواتير</p>
          <p className="text-[11px] text-gray-400">جرب البحث بكلمة أخرى أو تغيير الفلتر</p>
          <button
            onClick={onStartNewInvoice}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#087A35] text-white text-xs font-bold shadow-xs hover:bg-[#0A8F3D] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء فاتورة جديدة</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden divide-y divide-gray-100">
          {filteredInvoices.map((inv, idx) => (
            <div
              key={inv.id ? `${inv.id}-${idx}` : `inv-list-${idx}`}
              id={`invoice-item-${inv.id || idx}`}
              onClick={() => handleInvoiceClick(inv)}
              className="p-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F0F9F4] text-[#087A35] flex items-center justify-center font-bold text-xs border border-[#087A35]/20 group-hover:bg-[#087A35] group-hover:text-white transition-colors shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-[#087A35]">
                      {inv.id}
                    </span>
                    <span className="text-xs font-bold text-[#1A1A1A]">
                      {inv.customerName}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {inv.date}
                    </span>
                    <span>•</span>
                    <span>{inv.items.length} أصناف</span>
                    {inv.customerPhone && (
                      <>
                        <span>•</span>
                        <span dir="ltr">{inv.customerPhone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Price & Status */}
                <div className="text-left">
                  <div className="font-black text-sm text-[#087A35]">
                    {inv.total.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-gray-500">
                      {settings.currency}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateInvoice) {
                        const nextStatus = inv.status === 'paid' ? 'pending' : 'paid';
                        onUpdateInvoice({ ...inv, status: nextStatus });
                      }
                    }}
                    className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      inv.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                    title="اضغط لتغيير الحالة"
                  >
                    {inv.status === 'pending' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                        <span>ذمم</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>مدفوعة</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1 border-r border-gray-100 pr-2 mr-1">
                  {onPrintInvoice && (
                    <button
                      type="button"
                      title="طباعة الفاتورة"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintInvoice(inv);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#087A35] hover:bg-[#F0F9F4] active:scale-95 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onEditInvoice && (
                    <button
                      type="button"
                      title="تعديل الفاتورة"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditInvoice(inv);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 active:scale-95 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteInvoice && (
                    <button
                      type="button"
                      title="حذف الفاتورة"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteInvoice(inv);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
