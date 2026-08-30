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
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProducts = products.filter((p) => p.active);

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
    exportProductsToExcel(activeProducts, `${(settings.todayPricesTitle || 'أسعار_اليوم').replace(/\s+/g, '_')}_${settings.shopName.replace(/\s+/g, '_')}`);
    setExcelSuccess(true);
    setTimeout(() => setExcelSuccess(false), 3000);
  };

  const handlePrint = async () => {
    await printHtmlElement('printable-today-prices-doc');
  };

  const handleShareWhatsApp = () => {
    const encoded = formatTodayPricesForWhatsApp(products, settings);
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
                {settings.todayPricesTitle || 'أسعار اليوم'} المعتمدة ({activeProducts.length} صنف)
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
            className="py-2 px-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center justify-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
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
            const ITEMS_PER_PAGE = 14;
            const chunks = [];
            for (let i = 0; i < activeProducts.length; i += ITEMS_PER_PAGE) {
              chunks.push(activeProducts.slice(i, i + ITEMS_PER_PAGE));
            }
            const chunksToRender = chunks.length > 0 ? chunks : [[]];

            return chunksToRender.map((chunk, pageIdx) => (
              <div
                key={pageIdx}
                className="pdf-page bg-white p-4 space-y-5 flex flex-col justify-between"
                style={{
                  width: '780px',
                  minHeight: '1100px',
                  boxSizing: 'border-box',
                  pageBreakAfter: 'always',
                  backgroundColor: '#ffffff',
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              >
                {/* Content wrapper */}
                <div className="space-y-4">
                  {/* Header Section */}
                  <div className="flex flex-row items-center justify-between border-b border-gray-200 pb-4">
                    {/* Left: Logo and Shop Name */}
                    <div className="flex flex-col items-center text-center space-y-1 w-1/3">
                      <div
                        className="relative w-20 h-20 flex items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 border border-emerald-200 p-1.5 shadow-2xs"
                        style={{
                          width: '80px',
                          height: '80px',
                          minWidth: '80px',
                          minHeight: '80px',
                          maxWidth: '80px',
                          maxHeight: '80px',
                        }}
                      >
                        <img
                          src={formatImageUrl(settings.logoUrl)}
                          alt={settings.shopName}
                          className="rounded-xl"
                          style={{
                            width: '100%',
                            height: '100%',
                            maxWidth: '70px',
                            maxHeight: '70px',
                            objectFit: 'contain',
                            display: 'block',
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
                      <h1 className="text-base font-extrabold text-[#0B6636] tracking-tight whitespace-nowrap">{settings.shopName}</h1>
                      <p className="text-[10px] text-gray-500 font-bold whitespace-nowrap">{settings.shopSubtitle}</p>
                    </div>

                    {/* Center: Leaf Icon, Title, Date */}
                    <div className="flex flex-col items-center justify-center space-y-1.5 w-1/3 text-center">
                      <Leaf className="w-8 h-8 text-[#0B6636] fill-[#0B6636]" />
                      <h2 className="text-3xl font-black text-[#0B6636] tracking-tight">{settings.todayPricesTitle || 'أسعار اليوم'}</h2>
                      <div className="text-xs font-extrabold text-gray-600">
                        تاريخ اليوم: {new Date().toLocaleDateString('ar-JO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </div>


                  </div>

                  {/* High Density Table with Images */}
                  <div className="border border-[#0B6636]/15 rounded-xl overflow-hidden shadow-3xs">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-[#0B6636] text-white font-bold text-xs border-b border-[#0B6636]/20" style={{ backgroundColor: '#0B6636' }}>
                          <th className="py-2 px-1.5 w-12 text-center border-l border-white/10" style={{ borderLeftColor: 'rgba(255,255,255,0.1)' }}>م</th>
                          <th className="py-2 px-3 text-center border-l border-white/10" style={{ borderLeftColor: 'rgba(255,255,255,0.1)' }}>الصنف</th>
                          <th className="py-2 px-2 text-center border-l border-white/10" style={{ borderLeftColor: 'rgba(255,255,255,0.1)' }}>الصورة</th>
                          <th className="py-2 px-2 text-center border-l border-white/10" style={{ borderLeftColor: 'rgba(255,255,255,0.1)' }}>الوحدة</th>
                          <th className="py-2 px-3 text-center">السعر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0B6636]/10 bg-white">
                        {chunk.map((prod, idx) => {
                          const globalIdx = pageIdx * ITEMS_PER_PAGE + idx;
                          return (
                            <tr key={prod.id} className="hover:bg-gray-50/40 transition-colors" style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {/* Index */}
                              <td className="py-1.5 px-1.5 text-center text-xs font-extrabold border-l border-gray-100" style={{ color: '#0B6636', borderLeftColor: '#f3f4f6' }}>
                                {globalIdx + 1}
                              </td>

                              {/* Product Name */}
                              <td className="py-1.5 px-3 text-center border-l border-gray-100" style={{ borderLeftColor: '#f3f4f6' }}>
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-xs font-extrabold text-gray-900">{prod.name}</span>
                                  <span className="text-[8px] font-bold text-gray-400 mt-0.5">
                                    {normalizeCategory(prod.category) === 'vegetables'
                                      ? 'خضار طازجة'
                                      : normalizeCategory(prod.category) === 'fruits'
                                      ? 'فواكه طازجة'
                                      : normalizeCategory(prod.category) === 'herbs'
                                      ? 'ورقيات وأعشاب'
                                      : 'بكسات وشوالات'}
                                  </span>
                                </div>
                              </td>

                              {/* Image */}
                              <td className="py-1.5 px-2 text-center border-l border-gray-100" style={{ borderLeftColor: '#f3f4f6' }}>
                                <div
                                  className="rounded-lg overflow-hidden bg-white mx-auto flex items-center justify-center border border-gray-100/80"
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    minWidth: '36px',
                                    minHeight: '36px',
                                    maxWidth: '36px',
                                    maxHeight: '36px',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {prod.image && (prod.image.startsWith('http') || prod.image.startsWith('data:')) ? (
                                    <img
                                      src={prod.image}
                                      alt={prod.name}
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        maxWidth: '32px',
                                        maxHeight: '32px',
                                        objectFit: 'contain',
                                        display: 'block',
                                      }}
                                      loading="lazy"
                                      onError={(e) => {
                                        const imgEl = e.target as HTMLElement;
                                        imgEl.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span className="text-lg">{prod.image || '🥗'}</span>
                                  )}
                                </div>
                              </td>

                              {/* Unit */}
                              <td className="py-1.5 px-2 text-center text-xs font-bold text-gray-600 border-l border-gray-100" style={{ borderLeftColor: '#f3f4f6' }}>
                                {prod.unit}
                              </td>

                              {/* Price */}
                              <td className="py-1.5 px-3 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-xs font-black tracking-tight" style={{ color: '#0B6636', display: 'inline-block' }}>
                                    {prod.price.toFixed(3)}
                                  </span>
                                  <span className="text-[9px] font-bold text-gray-500 mt-0.5">
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

                {/* Footer Section resembling the image */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  <div
                    style={{
                      border: '1px solid rgba(229, 231, 235, 0.8)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      backgroundColor: '#F8FAF9',
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
                        gap: '10px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* 1: WhatsApp */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280' }}>للطلب عبر</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: '#0B6636' }}>واتساب</span>
                        </div>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#E6F4EA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0B6636',
                            flexShrink: 0,
                          }}
                        >
                          <MessageCircle style={{ width: '16px', height: '16px', color: '#0B6636' }} />
                        </div>
                      </div>

                      {/* 2: Delivery */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          borderRight: '1px solid #e5e7eb',
                          paddingRight: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280' }}>خدمة توصيل</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: '#0B6636' }}>سريعة</span>
                        </div>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#E6F4EA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0B6636',
                            flexShrink: 0,
                          }}
                        >
                          <Truck style={{ width: '16px', height: '16px', color: '#0B6636' }} />
                        </div>
                      </div>

                      {/* 3: Location */}
                      <div
                        style={{
                          flex: 1.2,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          borderRight: '1px solid #e5e7eb',
                          paddingRight: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', maxWidth: '140px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '900', color: '#374151', lineHeight: 1.2 }}>
                            {settings.address || 'عمان - ماركا الشمالية'}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#9ca3af' }}>
                            سوق الخضار المركزي
                          </span>
                        </div>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#E6F4EA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0B6636',
                            flexShrink: 0,
                          }}
                        >
                          <MapPin style={{ width: '16px', height: '16px', color: '#0B6636' }} />
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
                          borderRight: '1px solid #e5e7eb',
                          paddingRight: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', direction: 'ltr' }}>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: '#374151' }}>{settings.phone || '0791234567'}</span>
                          {settings.whatsapp && settings.whatsapp !== settings.phone && (
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', marginTop: '2px' }}>{settings.whatsapp}</span>
                          )}
                        </div>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#E6F4EA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0B6636',
                            flexShrink: 0,
                          }}
                        >
                          <Phone style={{ width: '16px', height: '16px', color: '#0B6636' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Green Bottom Solid Strip */}
                  <div
                    style={{
                      backgroundColor: '#0B6636',
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
                      <span>جودة عالية ... طزاجة يومية</span>
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
