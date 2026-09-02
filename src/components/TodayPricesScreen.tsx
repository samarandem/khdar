import React, { useState, useRef } from 'react';
import { Product, ShopSettings } from '../types';
import { normalizeCategory } from '../utils/categoryUtils';
import {
  Tag,
  Calendar,
  Download,
  MessageCircle,
  Printer,
  Store,
  Sparkles,
  Phone,
  MapPin,
  FileSpreadsheet,
  Check,
  Upload,
  RotateCcw,
  AlertTriangle,
  X,
  Leaf,
  Truck,
  Loader2,
} from 'lucide-react';
import { generatePdfFromElement, formatTodayPricesForWhatsApp, printHtmlElement } from '../services/pdfService';
import { exportProductsToExcel, importProductsFromExcel } from '../services/excelService';
import { formatImageUrl, DEFAULT_SHOP_LOGO } from '../utils/imageUtils';

interface TodayPricesScreenProps {
  products: Product[];
  settings: ShopSettings;
  onEditPrices: () => void;
  onBatchUpdateProducts?: (products: Product[]) => void;
  onResetOfficialPrices?: () => void;
}

export const TodayPricesScreen: React.FC<TodayPricesScreenProps> = ({
  products,
  settings,
  onEditPrices,
  onBatchUpdateProducts,
  onResetOfficialPrices,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [printFilter, setPrintFilter] = useState<'all' | 'vegetables' | 'fruits' | 'available'>('all');

  const activeProducts = products.filter((p) => p.active);

  const displayedProducts = activeProducts.filter((p) => {
    if (printFilter === 'vegetables') {
      return normalizeCategory(p.category) === 'vegetables' || normalizeCategory(p.category) === 'herbs';
    }
    if (printFilter === 'fruits') {
      return normalizeCategory(p.category) === 'fruits';
    }
    if (printFilter === 'available') {
      return p.price > 0;
    }
    return true;
  });

  const todayDateFormatted = new Date().toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement(
        'printable-today-prices-doc',
        `${(settings.todayPricesTitle || 'أسعار_اليوم').replace(/\s+/g, '_')}_${settings.shopName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = () => {
    exportProductsToExcel(displayedProducts, `${(settings.todayPricesTitle || 'أسعار_اليوم').replace(/\s+/g, '_')}_${settings.shopName.replace(/\s+/g, '_')}`);
    setExcelSuccess(true);
    setTimeout(() => setExcelSuccess(false), 3000);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printHtmlElement(
        'printable-today-prices-doc',
        `${(settings.todayPricesTitle || 'أسعار_اليوم').replace(/\s+/g, '_')}_${settings.shopName.replace(/\s+/g, '_')}`
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = formatTodayPricesForWhatsApp(displayedProducts, settings);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsProcessingImport(true);
      const result = await importProductsFromExcel(file, products);
      if (onBatchUpdateProducts) {
        onBatchUpdateProducts(result.updatedProducts);
      }
      setNotice({
        type: 'success',
        msg: `تم تحديث أسعار ${result.matchedCount} صنف${
          result.addedCount > 0 ? ` وإضافة ${result.addedCount} صنف جديد` : ''
        } من ملف الإكسل!`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        msg: err?.message || 'فشل استيراد الأسعار من ملف الإكسل',
      });
    } finally {
      setIsProcessingImport(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3.5 pb-28 animate-in fade-in duration-200">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Banner & Actions (High Density) */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 space-y-2.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#087A35] text-white flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#1A1A1A] leading-tight">
                {settings.todayPricesTitle || 'أسعار اليوم'} المعتمدة ({printFilter === 'all' ? `${activeProducts.length} صنف` : `${displayedProducts.length} من ${activeProducts.length} صنف`})
              </h2>
              <div className="text-[10px] text-[#087A35] font-bold flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-[#087A35]" />
                <span>{todayDateFormatted}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              id="btn-today-import-excel"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImport}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition-colors flex items-center gap-1"
            >
              <Upload className={`w-3.5 h-3.5 ${isProcessingImport ? 'animate-spin' : ''}`} />
              <span>{isProcessingImport ? 'جاري القراءة...' : 'استيراد من Excel'}</span>
            </button>

            {onResetOfficialPrices && (
              <button
                id="btn-today-reset-prices"
                onClick={() => {
                  if (window.confirm('هل تريد استرجاع وتحديث كافة الأسعار الرسمية لجميع الأصناف؟')) {
                    onResetOfficialPrices();
                    setNotice({
                      type: 'success',
                      msg: 'تم استرجاع وتطبيق لائحة الأسعار الرسمية بنجاح!',
                    });
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold border border-gray-200 transition-colors flex items-center gap-1"
                title="استعادة الأسعار الرسمية للأصناف"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>الأسعار الرسمية</span>
              </button>
            )}

            <button
              id="btn-today-edit-prices-shortcut"
              onClick={onEditPrices}
              className="px-2.5 py-1 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold transition-colors"
            >
              تعديل يدوي
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
              notice.type === 'success'
                ? 'bg-[#F0F9F4] border border-[#087A35]/30 text-[#087A35]'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {notice.type === 'success' ? (
                <Check className="w-4 h-4 text-[#087A35]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span>{notice.msg}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Selection Row */}
        <div className="flex flex-col gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-xs font-black text-gray-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#087A35]" />
            <span>فلترة الأصناف للطباعة والمشاركة:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setPrintFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center gap-1 ${
                printFilter === 'all'
                  ? 'bg-[#087A35] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <span>الكل</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${printFilter === 'all' ? 'bg-[#065F28] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {activeProducts.length}
              </span>
            </button>

            <button
              onClick={() => setPrintFilter('vegetables')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center gap-1 ${
                printFilter === 'vegetables'
                  ? 'bg-[#087A35] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <span>خضار</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${printFilter === 'vegetables' ? 'bg-[#065F28] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {activeProducts.filter(p => normalizeCategory(p.category) === 'vegetables' || normalizeCategory(p.category) === 'herbs').length}
              </span>
            </button>

            <button
              onClick={() => setPrintFilter('fruits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center gap-1 ${
                printFilter === 'fruits'
                  ? 'bg-[#087A35] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <span>فواكه</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${printFilter === 'fruits' ? 'bg-[#065F28] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {activeProducts.filter(p => normalizeCategory(p.category) === 'fruits').length}
              </span>
            </button>

            <button
              onClick={() => setPrintFilter('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center gap-1 ${
                printFilter === 'available'
                  ? 'bg-[#087A35] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <span>الأصناف الموجودة فقط</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${printFilter === 'available' ? 'bg-[#065F28] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {activeProducts.filter(p => p.price > 0).length}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
          <button
            id="btn-today-download-pdf"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="py-2 px-2 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'تحميل...' : 'PDF'}</span>
          </button>

          <button
            id="btn-today-download-excel"
            onClick={handleDownloadExcel}
            className="py-2 px-2 rounded-xl bg-[#F0F9F4] hover:bg-[#E2F4EB] text-[#087A35] font-bold text-xs border border-[#087A35]/30 transition-colors flex items-center justify-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            id="btn-today-share-whatsapp"
            onClick={handleShareWhatsApp}
            className="py-2 px-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors flex items-center justify-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>واتساب</span>
          </button>

          <button
            id="btn-today-print"
            onClick={handlePrint}
            disabled={isPrinting}
            className="py-2 px-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087A35]" />
                <span>جاري التجهيز...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </>
            )}
          </button>
        </div>

        {excelSuccess && (
          <div className="bg-[#F0F9F4] border border-[#087A35]/30 text-[#087A35] text-[11px] font-bold p-2 rounded-xl flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-[#087A35]" />
            <span>تم تصدير ملف إكسل بأسعار اليوم بنجاح!</span>
          </div>
        )}
      </div>

      {/* Printable A4 Price List Canvas */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xs border border-gray-200 overflow-x-auto w-full">
        <div
          id="printable-today-prices-doc"
          className="bg-white p-1 space-y-6 text-gray-800 w-[780px] mx-auto"
          dir="rtl"
          style={{
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            letterSpacing: 'normal',
          }}
        >
          {(() => {
            // 16 items per page fits cleanly within A4 height (1100px) with streamlined row heights and compact padding
            const ITEMS_PER_PAGE = 16;
            const chunks = [];
            for (let i = 0; i < displayedProducts.length; i += ITEMS_PER_PAGE) {
              chunks.push(displayedProducts.slice(i, i + ITEMS_PER_PAGE));
            }
            const chunksToRender = chunks.length > 0 ? chunks : [[]];

            return chunksToRender.map((chunk, pageIdx) => (
              <div
                key={pageIdx}
                className="pdf-page bg-white p-6 space-y-4 flex flex-col justify-between mx-auto"
                style={{
                  width: '780px',
                  minHeight: '100%',
                  boxSizing: 'border-box',
                  pageBreakAfter: 'always',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px',
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              >
                {/* Top content wrapper */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', flex: 1 }}>
                  {/* Header Section */}
                  {pageIdx === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        borderBottom: '2px solid #e2e8f0',
                        paddingBottom: '12px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Left: Shop Branding */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '12px',
                          width: '42%',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#f0fdf4',
                            border: '2px solid #86efac',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            width: '74px',
                            height: '74px',
                            minWidth: '74px',
                            minHeight: '74px',
                            maxWidth: '74px',
                            maxHeight: '74px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={formatImageUrl(settings.logoUrl)}
                            alt="شعار المحل"
                            style={{
                              width: '66px',
                              height: '66px',
                              maxWidth: '66px',
                              maxHeight: '66px',
                              objectFit: 'contain',
                              display: 'block',
                              borderRadius: '10px',
                              imageRendering: '-webkit-optimize-contrast',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                            loading="eager"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const imgEl = e.target as HTMLImageElement;
                              if (imgEl && settings.logoUrl) {
                                const original = settings.logoUrl.trim();
                                const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(original)}&output=png`;
                                if (imgEl.src !== proxyUrl && !imgEl.src.includes('images.weserv.nl')) {
                                  imgEl.src = proxyUrl;
                                  return;
                                }
                              }
                              if (imgEl && imgEl.src !== DEFAULT_SHOP_LOGO) {
                                imgEl.src = DEFAULT_SHOP_LOGO;
                              }
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: '22px',
                              fontWeight: '900',
                              color: '#087A35',
                              margin: 0,
                              lineHeight: 1.2,
                              direction: 'rtl',
                            }}
                          >
                            {settings.shopName || 'خضار وفواكه'}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '900',
                              color: '#334155',
                              margin: 0,
                              lineHeight: 1.2,
                              direction: 'rtl',
                            }}
                          >
                            {settings.shopSubtitle || 'فواكه طازجة وخضار يومية'}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: '900',
                              color: '#087A35',
                              marginTop: '2px',
                            }}
                          >
                            <Leaf style={{ width: '14px', height: '14px', color: '#087A35' }} />
                            <span>جودة عالية وطازجة</span>
                          </div>
                        </div>
                      </div>

                      {/* Center: Main Title */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          width: '28%',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '5px 14px',
                            borderRadius: '12px',
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid #86efac',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '24px',
                              fontWeight: '900',
                              color: '#087A35',
                              margin: 0,
                              lineHeight: 1.2,
                              direction: 'rtl',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {settings.todayPricesTitle || 'أسعار اليوم'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ display: 'block', height: '2px', width: '24px', backgroundColor: '#087A35', borderRadius: '2px' }} />
                            <Leaf style={{ width: '13px', height: '13px', color: '#087A35' }} />
                            <span style={{ display: 'block', height: '2px', width: '24px', backgroundColor: '#087A35', borderRadius: '2px' }} />
                          </div>
                        </div>
                      </div>

                      {/* Right: Date Badge */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '6px',
                          width: '30%',
                        }}
                      >
                        <div
                          style={{
                            width: '155px',
                            backgroundColor: '#087A35',
                            border: '1.5px solid #087A35',
                            borderRadius: '12px',
                            padding: '4px 6px',
                            textAlign: 'center',
                            color: '#ffffff',
                            boxSizing: 'border-box',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: '900', paddingBottom: '2px' }}>قائمة الأسعار المعتمدة</div>
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#087A35',
                              borderRadius: '8px',
                              padding: '3px 8px',
                              fontWeight: '900',
                              fontSize: '13px',
                              direction: 'ltr',
                              textAlign: 'center',
                            }}
                          >
                            {new Date().toLocaleDateString('ar-JO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Simplified Header for Page 2+ */
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '2px solid #e2e8f0',
                        paddingBottom: '10px',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Leaf style={{ width: '18px', height: '18px', color: '#087A35' }} />
                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#087A35' }}>{settings.shopName}</span>
                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>|</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#334155' }}>تكملة قائمة أسعار اليوم</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>
                        التاريخ: {new Date().toLocaleDateString('ar-JO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* High Density Table with Enlarged Item Box */}
                  <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1.5px solid #cbd5e1', width: '100%', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#087A35', color: '#ffffff', fontWeight: '900', fontSize: '13px' }}>
                          <th style={{ padding: '9px 8px', width: '38px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>م</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>الصنف</th>
                          <th style={{ padding: '9px 10px', width: '95px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>الوحدة</th>
                          <th style={{ padding: '9px 12px', width: '120px', textAlign: 'center' }}>السعر</th>
                        </tr>
                      </thead>
                      <tbody style={{ backgroundColor: '#ffffff' }}>
                        {chunk.map((prod, idx) => {
                          const globalIdx = pageIdx * ITEMS_PER_PAGE + idx;
                          return (
                            <tr key={prod.id} style={{ borderBottom: '1px solid #e2e8f0', minHeight: '38px' }}>
                              {/* Index */}
                              <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: '900', fontSize: '12px', color: '#087A35', borderLeft: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                {globalIdx + 1}
                              </td>

                              {/* Product Name + Image */}
                              <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 'bold', borderLeft: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: '900', fontSize: '13px', color: '#0f172a', lineHeight: 1.2 }}>{prod.name}</span>
                                    <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#64748b', marginTop: '1px' }}>
                                      {normalizeCategory(prod.category) === 'vegetables'
                                        ? 'خضار طازجة'
                                        : normalizeCategory(prod.category) === 'fruits'
                                        ? 'فواكه طازجة'
                                        : normalizeCategory(prod.category) === 'herbs'
                                        ? 'ورقيات وأعشاب'
                                        : 'بكسات وشوالات'}
                                    </span>
                                  </div>
                                  {prod.image && (prod.image.startsWith('http') || prod.image.startsWith('data:')) ? (
                                    <img
                                      src={prod.image}
                                      alt={prod.name}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        minWidth: '28px',
                                        minHeight: '28px',
                                        maxWidth: '28px',
                                        maxHeight: '28px',
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        display: 'block',
                                        marginInlineStart: '8px',
                                        backgroundColor: '#ffffff',
                                      }}
                                      crossOrigin="anonymous"
                                      onError={(e) => {
                                        const imgEl = e.target as HTMLElement;
                                        imgEl.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '15px', marginInlineStart: '8px' }}>{prod.image || '🥗'}</span>
                                  )}
                                </div>
                              </td>

                              {/* Unit */}
                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '900', fontSize: '12px', color: '#334155', borderLeft: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                {prod.unit}
                              </td>

                              {/* Price */}
                              <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '900', color: '#087A35' }}>
                                    {prod.price.toFixed(3)}
                                  </span>
                                  <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#475569' }}>
                                    {settings.currency}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box', marginTop: 'auto' }}>
                  <div
                    style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '16px',
                      padding: '10px 14px',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        justifyContent: 'space-between',
                        gap: '8px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* 1: Address (عالي الوضوح والخط بارز) */}
                      <div
                        style={{
                          flex: 1.25,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#64748b' }}>العنوان</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', lineHeight: 1.3 }}>
                            {settings.address || 'عمان - الأردن'}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#dc2626',
                            flexShrink: 0,
                          }}
                        >
                          <MapPin style={{ width: '17px', height: '17px', color: '#dc2626' }} />
                        </div>
                      </div>

                      {/* 2: Delivery */}
                      <div
                        style={{
                          flex: 1.1,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          borderRight: '1.5px solid #e2e8f0',
                          paddingRight: '8px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#64748b' }}>خدمة توصيل</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: '#087A35', lineHeight: 1.3 }}>
                            سريعة ومضمونة
                          </span>
                        </div>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#087A35',
                            flexShrink: 0,
                          }}
                        >
                          <Truck style={{ width: '17px', height: '17px', color: '#087A35' }} />
                        </div>
                      </div>

                      {/* 3: Whatsapp */}
                      <div
                        style={{
                          flex: 1.1,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          borderRight: '1.5px solid #e2e8f0',
                          paddingRight: '8px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#64748b' }}>واتساب</span>
                          <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#0f172a', direction: 'ltr', textAlign: 'right' }}>
                            {settings.whatsapp || '0791234567'}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#059669',
                            flexShrink: 0,
                          }}
                        >
                          <MessageCircle style={{ width: '17px', height: '17px', color: '#059669' }} />
                        </div>
                      </div>

                      {/* 4: Phone */}
                      <div
                        style={{
                          flex: 1.1,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          borderRight: '1.5px solid #e2e8f0',
                          paddingRight: '8px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#64748b' }}>للطلب والاتصال</span>
                          <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#0f172a', direction: 'ltr', textAlign: 'right' }}>
                            {settings.phone || '0791234567'}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#087A35',
                            flexShrink: 0,
                          }}
                        >
                          <Phone style={{ width: '17px', height: '17px', color: '#087A35' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Green Bottom Solid Strip */}
                  <div
                    style={{
                      backgroundColor: '#087A35',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '11px',
                      fontWeight: '900',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Leaf style={{ width: '14px', height: '14px', color: '#ffffff', flexShrink: 0 }} />
                      <span>{settings.slogan || 'جودة عالية ... طازجة يومية'}</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.85 }}>
                      صفحة {pageIdx + 1} من {chunksToRender.length}
                    </span>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};
