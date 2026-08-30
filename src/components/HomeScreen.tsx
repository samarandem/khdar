import React, { useState, useMemo } from 'react';
import { Product, Invoice, ShopSettings, ActiveTab } from '../types';
import { PrintableBatchInvoices } from './PrintableBatchInvoices';
import { printHtmlElement, generatePdfFromElement } from '../services/pdfService';
import {
  Plus,
  Receipt,
  TrendingUp,
  Calendar,
  Tag,
  SlidersHorizontal,
  ArrowLeft,
  CheckCircle2,
  ShoppingBag,
  Eye,
  Carrot,
  Edit,
  Trash2,
  Users,
  Printer,
  FileDown,
  Loader2,
} from 'lucide-react';

interface HomeScreenProps {
  invoices: Invoice[];
  settings: ShopSettings;
  products?: Product[];
  onStartNewInvoice: () => void;
  onSelectInvoice?: (invoice: Invoice) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onPrintInvoice?: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoice: Invoice) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  invoices,
  settings,
  onStartNewInvoice,
  onSelectInvoice,
  onViewInvoice,
  onPrintInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onUpdateInvoice,
  setActiveTab,
  onNavigateToTab,
}) => {
  const navigateTab = (tab: ActiveTab) => {
    if (setActiveTab) setActiveTab(tab);
    else if (onNavigateToTab) onNavigateToTab(tab);
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    if (onSelectInvoice) onSelectInvoice(invoice);
    else if (onViewInvoice) onViewInvoice(invoice);
  };
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Calculate Today's & Yesterday's Stats
  const todayInvoices = invoices.filter((inv) => inv.date === todayStr);
  const yesterdayInvoices = invoices.filter((inv) => inv.date === yesterdayStr);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'today') return todayInvoices;
    if (invoiceFilter === 'yesterday') return yesterdayInvoices;
    return invoices;
  }, [invoices, invoiceFilter, todayInvoices, yesterdayInvoices]);

  // Limit home screen display to top 6 recent invoices to keep layout compact and avoid long page scrolling
  const displayedInvoices = useMemo(() => {
    return filteredInvoices.slice(0, 6);
  }, [filteredInvoices]);

  const handlePrintFiltered = async () => {
    await printHtmlElement('printable-daily-invoices-doc');
  };

  const handlePdfFiltered = async () => {
    try {
      setIsPdfLoading(true);
      const titleName = invoiceFilter === 'today'
        ? 'فواتير_اليوم'
        : invoiceFilter === 'yesterday'
        ? 'فواتير_الأمس'
        : 'جميع_الفواتير';
      await generatePdfFromElement('printable-daily-invoices-doc', `${titleName}_${todayStr}`);
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Most sold item calculation
  const itemCounts: Record<string, number> = {};
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      itemCounts[item.productName] = (itemCounts[item.productName] || 0) + item.quantity;
    });
  });
  const topItemEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
  const topItemName = topItemEntry ? topItemEntry[0] : 'بندورة بلدية';

  return (
    <div className="space-y-4 pb-16 animate-in fade-in duration-200">
      {/* 1. High Density 3-Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-gray-700">
              <TrendingUp className="w-4 h-4 text-[#087A35]" />
              مبيعات اليوم
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F9F4] text-[#087A35]">
              اليوم
            </span>
          </div>
          <div className="text-2xl font-black text-[#087A35] tracking-tight">
            {todaySales.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-medium">
            <span>{todayInvoices.length} فواتير بيع مسجلة</span>
          </div>
        </div>

        {/* Card 2: Today's Invoices Count */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-gray-700">
              <Receipt className="w-4 h-4 text-blue-600" />
              عدد الفواتير
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
              نشطة
            </span>
          </div>
          <div className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            {todayInvoices.length}{' '}
            <span className="text-xs font-normal text-gray-500">فاتورة</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-medium">
            من إجمالي {invoices.length} فاتورة
          </div>
        </div>

        {/* Card 3: Top Selling Item */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-gray-700">
              <Carrot className="w-4 h-4 text-amber-600" />
              الأكثر طلباً
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
              رائج
            </span>
          </div>
          <div className="text-lg font-extrabold text-[#1A1A1A] truncate">
            {topItemName}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-medium">
            الأعلى مبيعاً حسب كمية الكيلو
          </div>
        </div>
      </div>

      {/* 2. Large Primary Action Button: + فاتورة جديدة */}
      <button
        id="btn-main-new-invoice"
        onClick={onStartNewInvoice}
        className="w-full py-3.5 px-6 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] active:bg-[#076B2E] text-white font-bold text-base shadow-xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 group"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </div>
        <span>+ فاتورة جديدة سريعة</span>
      </button>

      {/* 3. Quick Action Shortcuts (High Density Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          id="btn-home-customers"
          onClick={() => navigateTab('customers')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white hover:bg-emerald-50/70 border border-gray-200/90 transition-colors text-right group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1A1A1A]">سجل العملاء</div>
            <div className="text-[10px] text-gray-400 truncate">إدارة وتفاصيل الفواتير</div>
          </div>
        </button>

        <button
          id="btn-home-today-prices"
          onClick={() => navigateTab('today-prices')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white hover:bg-[#F0F9F4] border border-gray-200/90 transition-colors text-right group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#F0F9F4] text-[#087A35] flex items-center justify-center shrink-0 group-hover:bg-[#087A35] group-hover:text-white transition-colors">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1A1A1A]">أسعار اليوم</div>
            <div className="text-[10px] text-gray-400 truncate">مشاركة وPDF</div>
          </div>
        </button>

        <button
          id="btn-home-edit-prices"
          onClick={() => navigateTab('edit-prices')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white hover:bg-amber-50/50 border border-gray-200/90 transition-colors text-right group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1A1A1A]">تعديل الأسعار</div>
            <div className="text-[10px] text-gray-400 truncate">تحديث سريع للكيلو</div>
          </div>
        </button>

        <button
          id="btn-home-products-catalog"
          onClick={() => navigateTab('products')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white hover:bg-slate-50 border border-gray-200/90 transition-colors text-right group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
            <Carrot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1A1A1A]">دليل الأصناف</div>
            <div className="text-[10px] text-gray-400 truncate">إدارة الخضار والفواكه</div>
          </div>
        </button>
      </div>

      {/* 4. Recent Invoices Section (High Density Table & Mobile List) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-[#1A1A1A]">الفواتير المسجلة</h2>
            <span className="text-[11px] font-bold text-[#087A35] bg-[#F0F9F4] px-2 py-0.5 rounded-full border border-[#087A35]/20">
              {filteredInvoices.length} فاتورة
            </span>
          </div>

          {/* Filter Buttons for All, Today, Yesterday */}
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setInvoiceFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                invoiceFilter === 'all'
                  ? 'bg-white text-[#087A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الكل ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                invoiceFilter === 'today'
                  ? 'bg-white text-[#087A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              فواتير اليوم ({todayInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                invoiceFilter === 'yesterday'
                  ? 'bg-white text-[#087A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              فواتير الأمس ({yesterdayInvoices.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-home-view-all-invoices"
              onClick={() => navigateTab('invoices')}
              className="text-xs font-bold text-[#087A35] hover:text-[#0A8F3D] flex items-center gap-1 transition-colors"
            >
              <span>عرض سجل الفواتير</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {filteredInvoices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePdfFiltered}
                  disabled={isPdfLoading}
                  className="flex items-center gap-1.5 bg-[#1B4D3E] hover:bg-[#153B2F] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all no-print disabled:opacity-50"
                  title="تحميل PDF للفواتير المعروضة"
                >
                  {isPdfLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {invoiceFilter === 'today'
                      ? 'PDF فواتير اليوم'
                      : invoiceFilter === 'yesterday'
                      ? 'PDF فواتير الأمس'
                      : 'PDF الكل'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintFiltered}
                  className="flex items-center gap-1.5 bg-[#087A35] hover:bg-[#07682d] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all no-print"
                  title="طباعة الفواتير المعروضة"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>
                    {invoiceFilter === 'today'
                      ? 'طباعة فواتير اليوم'
                      : invoiceFilter === 'yesterday'
                      ? 'طباعة فواتير الأمس'
                      : 'طباعة الكل'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-600">لا توجد فواتير مطابقة</p>
            <p className="text-xs text-gray-400 mt-0.5">لم يتم العثور على فواتير لهذا الفترة</p>
          </div>
        ) : (
          <div>
            {/* Desktop High Density Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-500 border-b border-gray-100 font-bold">
                    <th className="py-2.5 px-3">رقم الفاتورة</th>
                    <th className="py-2.5 px-3">المشتري</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3 text-center">الأصناف</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي</th>
                    <th className="py-2.5 px-3 text-center w-28">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedInvoices.map((inv, idx) => (
                    <tr
                      key={inv.id ? `${inv.id}-${idx}` : `inv-${idx}`}
                      onClick={() => handleInvoiceClick(inv)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-[#087A35] bg-[#F0F9F4] px-2 py-0.5 rounded text-xs border border-[#087A35]/20">
                          {inv.id}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#1A1A1A]">
                        {inv.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 font-medium">
                        {inv.date}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-gray-600">
                        {inv.items.length} أصناف
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdateInvoice) {
                              const nextStatus = inv.status === 'paid' ? 'pending' : 'paid';
                              onUpdateInvoice({ ...inv, status: nextStatus });
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                            inv.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          }`}
                          title="اضغط لتغيير الحالة (مدفوعة / ذمم)"
                        >
                          {inv.status === 'pending' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                              <span>ذمم (آجل)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>مدفوعة</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-left font-black text-sm text-[#087A35]">
                        {inv.total.toFixed(2)}{' '}
                        <span className="text-[10px] font-normal text-gray-500">
                          {settings.currency}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvoiceClick(inv);
                            }}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#F0F9F4] hover:text-[#087A35] text-gray-600 inline-flex items-center justify-center transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onPrintInvoice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrintInvoice(inv);
                              }}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#F0F9F4] hover:text-[#087A35] text-gray-600 inline-flex items-center justify-center transition-colors"
                              title="طباعة الفاتورة"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onEditInvoice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditInvoice(inv);
                              }}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-amber-50 hover:text-amber-600 text-gray-600 inline-flex items-center justify-center transition-colors"
                              title="تعديل الفاتورة"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onDeleteInvoice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteInvoice(inv);
                              }}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 inline-flex items-center justify-center transition-colors"
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile High Density Cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {displayedInvoices.map((inv, idx) => (
                <div
                  key={inv.id ? `${inv.id}-${idx}` : `inv-card-${idx}`}
                  id={`invoice-card-${inv.id || idx}`}
                  onClick={() => handleInvoiceClick(inv)}
                  className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#F0F9F4] text-[#087A35] flex items-center justify-center font-bold text-xs border border-[#087A35]/20 shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-[#087A35]">
                          {inv.id}
                        </span>
                        <span className="font-bold text-xs text-[#1A1A1A]">
                          {inv.customerName}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5 font-medium">
                        <span>{inv.date}</span>
                        <span>•</span>
                        <span>{inv.items.length} أصناف</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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

                    <div className="flex items-center gap-1 border-r border-gray-100 pr-1.5 mr-0.5">
                      {onPrintInvoice && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintInvoice(inv);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#087A35] hover:bg-[#F0F9F4] active:scale-95 transition-all"
                          title="طباعة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onEditInvoice && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditInvoice(inv);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 active:scale-95 transition-all"
                          title="تعديل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteInvoice && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteInvoice(inv);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining Invoices Footer Button */}
            {filteredInvoices.length > 6 && (
              <div className="p-3 bg-gray-50/80 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => navigateTab('invoices')}
                  className="text-xs font-bold text-[#087A35] hover:text-[#0A8F3D] inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-3 bg-white hover:bg-emerald-50 rounded-xl border border-emerald-200/80 shadow-2xs"
                >
                  <span>عرض باقي الفواتير (يوجد {filteredInvoices.length - 6} فواتير إضافية)</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable container for consolidated batch invoices of today/yesterday/all */}
      <div
        id="printable-daily-invoices-doc"
        className="opacity-0 pointer-events-none absolute -left-[9999px] top-0 print:opacity-100 print:pointer-events-auto print:static"
      >
        <PrintableBatchInvoices
          invoices={filteredInvoices}
          settings={settings}
        />
      </div>
    </div>
  );
};
