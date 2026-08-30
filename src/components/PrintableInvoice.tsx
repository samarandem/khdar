import React from 'react';
import { Invoice, ShopSettings } from '../types';
import { numberToArabicWords } from '../utils/arabicNumbers';
import { formatImageUrl, DEFAULT_SHOP_LOGO } from '../utils/imageUtils';
import {
  Phone,
  MessageCircle,
  Truck,
  MapPin,
  Calculator,
  Tag,
  Wallet,
  User,
  Calendar,
  Clock,
  Leaf,
} from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: Invoice;
  settings: ShopSettings;
  id?: string;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
  settings,
  id = 'printable-invoice-template',
}) => {
  const tafqeetText = numberToArabicWords(invoice.total, settings.currency);

  return (
    <div
      id={id}
      className="bg-white text-[#1A1A1A] p-1 max-w-[800px] mx-auto rounded-3xl select-none space-y-6 overflow-x-auto w-full"
      dir="rtl"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        letterSpacing: 'normal',
      }}
    >
      {(() => {
        const ITEMS_PER_PAGE = 8;
        const chunks = [];
        for (let i = 0; i < invoice.items.length; i += ITEMS_PER_PAGE) {
          chunks.push(invoice.items.slice(i, i + ITEMS_PER_PAGE));
        }
        const chunksToRender = chunks.length > 0 ? chunks : [[]];

        return chunksToRender.map((chunk, pageIdx) => {
          const isLastPage = pageIdx === chunksToRender.length - 1;

          return (
            <div
              key={pageIdx}
              className="pdf-page bg-white p-6 sm:p-8 space-y-5.5 flex flex-col justify-between mx-auto"
              style={{
                width: '780px',
                minHeight: '1100px',
                boxSizing: 'border-box',
                pageBreakAfter: 'always',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Top part wrapper */}
              <div className="space-y-4">
                {/* 1. HEADER SECTION */}
                {pageIdx === 0 ? (
                  // Full Header for Page 1
                  <>
                    <div className="grid grid-cols-12 gap-3 items-center border-b pb-3.5" style={{ borderColor: '#d1d5db' }}>
                      {/* Left: Shop Branding */}
                      <div className="col-span-5 flex items-center gap-3">
                        <div
                          className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center shrink-0 p-1.5 overflow-hidden"
                          style={{
                            backgroundColor: '#f0f9f4',
                            border: '1.5px solid #a7f3d0',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
                            alt="شعار المحل"
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
                        <div className="min-w-0">
                          <h1 className="text-xl sm:text-2xl font-black leading-tight mb-1" style={{ color: '#087A35' }}>
                            {settings.shopName || 'خضار وفواكه'}
                          </h1>
                          <p className="text-xs font-bold leading-tight" style={{ color: '#4b5563' }}>
                            {settings.shopSubtitle || 'فواكه طازجة وخضار يومية'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-black mt-1" style={{ color: '#087A35' }}>
                            <Leaf className="w-3.5 h-3.5 text-[#087A35]" />
                            <span>جودة عالية وطازجة</span>
                          </div>
                        </div>
                      </div>

                      {/* Center: Main Title */}
                      <div className="col-span-3 text-center space-y-1">
                        <h2 className="text-2xl sm:text-3xl font-black" style={{ color: '#087A35', letterSpacing: '0px' }}>
                          فاتورة بيع
                        </h2>
                        <div className="flex items-center justify-center gap-1.5 pt-0.5 opacity-80">
                          <span className="h-[2px] w-7" style={{ backgroundColor: '#087A35' }} />
                          <Leaf className="w-4 h-4 text-[#087A35]" />
                          <span className="h-[2px] w-7" style={{ backgroundColor: '#087A35' }} />
                        </div>
                      </div>

                      {/* Right: Invoice Badge & Date/Time */}
                      <div className="col-span-4 flex flex-col items-end space-y-1.5">
                        <div
                          className="w-full max-w-[160px] rounded-xl p-1 text-center text-white"
                          style={{ backgroundColor: '#087A35', border: '1px solid #087A35' }}
                        >
                          <div className="text-[10px] font-bold pb-0.5">رقم الفاتورة</div>
                          <div
                            className="rounded-lg py-0.5 px-2 font-black text-sm sm:text-base dir-ltr"
                            style={{ backgroundColor: '#ffffff', color: '#087A35' }}
                          >
                            {invoice.id}
                          </div>
                        </div>

                        <div className="text-[10px] font-bold space-y-1 text-left w-full max-w-[160px] pr-1" style={{ color: '#374151' }}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1" style={{ color: '#6b7280' }}>
                              <Calendar className="w-3 h-3 text-[#087A35]" />
                              <span>التاريخ</span>
                            </span>
                            <span className="font-extrabold" style={{ color: '#111827' }}>{invoice.date}</span>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <span className="flex items-center gap-1" style={{ color: '#6b7280' }}>
                              <Wallet className="w-3 h-3 text-[#087A35]" />
                              <span>حالة الدفع</span>
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-md font-black text-[11px]"
                              style={{
                                backgroundColor: invoice.status === 'pending' ? '#fef3c7' : '#dcfce7',
                                color: invoice.status === 'pending' ? '#92400e' : '#166534',
                                border: invoice.status === 'pending' ? '1.5px solid #f59e0b' : '1.5px solid #86efac',
                              }}
                            >
                              {invoice.status === 'pending' ? 'ذمم (آجل)' : 'نقداً (مدفوعة)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. CUSTOMER INFO BAR */}
                    <div
                      className="rounded-2xl p-3.5 flex items-center justify-between"
                      style={{ backgroundColor: '#f0f9f4', border: '1px solid #bbf7d0' }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold" style={{ color: '#4b5563' }}>اسم المشتري :</span>
                          <span className="font-black" style={{ color: '#111827' }}>
                            {invoice.customerName || 'عميل عام'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold flex items-center gap-1" style={{ color: '#4b5563' }}>
                            <Phone className="w-3.5 h-3.5 text-[#087A35]" />
                            <span>رقم الهاتف :</span>
                          </span>
                          <span className="font-black" style={{ color: '#1f2937' }} dir="ltr">
                            {invoice.customerPhone || '0791234567'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                        style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                          style={{ backgroundColor: '#f0f9f4', color: '#087A35' }}
                        >
                          <User className="w-4.5 h-4.5 text-[#087A35]" />
                        </div>
                        <span className="text-xs font-black" style={{ color: '#087A35' }}>بيانات المشتري</span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Simplified Header for Page 2+
                  <div className="flex items-center justify-between border-b pb-3 mb-2" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-[#087A35]" />
                      <span className="text-xs font-black text-[#087A35]">{settings.shopName}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs font-extrabold text-gray-600">تكملة فاتورة رقم {invoice.id}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">التاريخ: {invoice.date}</span>
                  </div>
                )}

                {/* 3. PRODUCTS TABLE */}
                <div className="rounded-xl overflow-hidden shadow-2xs" style={{ border: '1px solid #e5e7eb' }}>
                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="font-bold text-xs" style={{ backgroundColor: '#087A35', color: '#ffffff' }}>
                        <th className="py-2 px-2.5 w-10 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)' }}>م</th>
                        <th className="py-2 px-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)' }}>المنتج</th>
                        <th className="py-2 px-2.5 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)' }}>الكمية</th>
                        <th className="py-2 px-2.5 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)' }}>سعر الوحدة</th>
                        <th className="py-2 px-3 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: '#ffffff' }}>
                      {chunk.map((item, index) => {
                        const globalIdx = pageIdx * ITEMS_PER_PAGE + index;
                        const qtyVal = Number(item.quantity) || 0;
                        const priceVal = Number(item.unitPrice) || 0;
                        const totalVal = Number(item.total) || 0;
                        const qtyDisplay = `${qtyVal.toFixed(3).replace(/\.?0+$/, '')} ${item.unit || ''}`;
                        const priceDisplay = `${priceVal.toFixed(3)} ${settings.currency}`;
                        const totalDisplay = `${totalVal.toFixed(2)} ${settings.currency}`;

                        return (
                          <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            {/* Item Index */}
                            <td className="py-1.5 px-2.5 text-center font-bold text-xs" style={{ color: '#4b5563', borderLeft: '1px solid #e5e7eb' }}>
                              {globalIdx + 1}
                            </td>

                            {/* Product Name + Image */}
                            <td className="py-1.5 px-3 font-bold text-xs" style={{ color: '#111827', borderLeft: '1px solid #e5e7eb' }}>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-black text-xs" style={{ color: '#111827' }}>{item.productName}</span>
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    className="w-7 h-7 rounded-md object-cover shrink-0 ml-1.5"
                                    style={{ border: '1px solid #e5e7eb' }}
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-sm ml-1.5">🥬</span>
                                )}
                              </div>
                            </td>

                            {/* Quantity */}
                            <td className="py-1.5 px-2.5 text-center font-bold text-xs" style={{ color: '#1f2937', borderLeft: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                              {qtyDisplay}
                            </td>

                            {/* Unit Price */}
                            <td className="py-1.5 px-2.5 text-center font-bold text-xs" style={{ color: '#374151', borderLeft: '1px solid #e5e7eb' }}>
                              {priceDisplay}
                            </td>

                            {/* Total */}
                            <td className="py-1.5 px-3 text-center font-extrabold text-xs" style={{ color: '#087A35' }}>
                              {totalDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom part wrapper */}
              <div className="space-y-4">
                {isLastPage ? (
                  // Totals section only on last page
                  <>
                    {/* 4. TOTALS SECTION */}
                    <div
                      className="w-full rounded-xl p-3.5 space-y-2"
                      style={{ backgroundColor: '#f0f9f4', border: '2px solid #a7f3d0' }}
                    >
                      <div className="flex items-center justify-between text-xs font-bold" style={{ color: '#374151' }}>
                        <span className="flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-[#087A35]" />
                          <span>المجموع الفرعي</span>
                        </span>
                        <span className="text-sm font-black" style={{ color: '#111827' }}>
                          {(Number(invoice.subtotal ?? invoice.total) || 0).toFixed(2)} {settings.currency}
                        </span>
                      </div>

                      {(Boolean(invoice.deliveryFee) && (Number(invoice.deliveryFee) || 0) > 0) && (
                        <div className="flex items-center justify-between text-xs font-bold" style={{ color: '#374151' }}>
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-[#087A35]" />
                            <span>خدمة التوصيل</span>
                          </span>
                          <span className="text-sm font-black" style={{ color: '#087A35' }}>
                            + {(Number(invoice.deliveryFee) || 0).toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      )}

                      {(Boolean(invoice.discount) && (Number(invoice.discount) || 0) > 0) && (
                        <div className="flex items-center justify-between text-xs font-bold" style={{ color: '#374151' }}>
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-amber-600" />
                            <span>الخصم</span>
                          </span>
                          <span className="text-sm font-black" style={{ color: '#b45309' }}>
                            - {(Number(invoice.discount) || 0).toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      )}

                      <div style={{ borderTop: '1px dashed #a7f3d0', marginTop: '4px', marginBottom: '4px' }} />

                      <div className="flex items-center justify-between text-sm font-black" style={{ color: '#087A35' }}>
                        <span className="flex items-center gap-1.5 text-sm font-black">
                          <Wallet className="w-4.5 h-4.5 text-[#087A35]" />
                          <span>الإجمالي الكلي المطلوب</span>
                        </span>
                        <span className="text-lg sm:text-xl font-black" style={{ color: '#087A35' }}>
                          {(Number(invoice.total) || 0).toFixed(2)} {settings.currency}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold pt-1" style={{ color: '#374151', borderTop: '1px dashed #a7f3d0' }}>
                        <span>طريقة / حالة السداد:</span>
                        <span
                          className="px-2.5 py-0.5 rounded-md font-black text-xs"
                          style={{
                            backgroundColor: invoice.status === 'pending' ? '#fef3c7' : '#dcfce7',
                            color: invoice.status === 'pending' ? '#92400e' : '#166534',
                            border: invoice.status === 'pending' ? '1px solid #f59e0b' : '1px solid #86efac',
                          }}
                        >
                          {invoice.status === 'pending' ? 'ذمم (آجل - على الحساب)' : 'نقداً (مدفوعة بالكامل)'}
                        </span>
                      </div>
                    </div>

                    {/* 5. TAFQEET ARABIC WRITTEN TOTAL */}
                    <div
                      className="text-center rounded-xl py-2 px-3"
                      style={{ backgroundColor: '#f0f9f4', border: '2px solid #a7f3d0' }}
                    >
                      <span className="text-xs sm:text-sm font-black" style={{ color: '#087A35' }}>
                        {tafqeetText}
                      </span>
                    </div>

                    {/* 6. FOOTER CONTACT CARDS */}
                    <div className="pt-2 space-y-2.5" style={{ borderTop: '2px solid #e5e7eb' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-center">
                        <div
                          className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5 min-h-[60px]"
                          style={{ backgroundColor: '#f8fafc', border: '2px solid #cbd5e1' }}
                        >
                          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="font-bold text-[10px]" style={{ color: '#64748b' }}>العنوان</span>
                          <span className="font-black leading-tight text-center break-words max-w-full" style={{ color: '#0f172a' }}>
                            {settings.address || 'عمان - الأردن / سوق الخضار المركزي'}
                          </span>
                        </div>

                        <div
                          className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5 min-h-[60px]"
                          style={{ backgroundColor: '#f8fafc', border: '2px solid #cbd5e1' }}
                        >
                          <Truck className="w-4 h-4 text-[#087A35] shrink-0" />
                          <span className="font-bold text-[10px]" style={{ color: '#64748b' }}>خدمة توصيل</span>
                          <span className="font-black text-center text-[10px] leading-tight" style={{ color: '#087A35' }}>سريعة خلال ٢٤ ساعة</span>
                        </div>

                        <div
                          className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5 min-h-[60px]"
                          style={{ backgroundColor: '#f8fafc', border: '2px solid #cbd5e1' }}
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-[10px]" style={{ color: '#64748b' }}>واتساب</span>
                          <span dir="ltr" className="font-black" style={{ color: '#0f172a' }}>{settings.whatsapp || '0791234567'}</span>
                        </div>

                        <div
                          className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5 min-h-[60px]"
                          style={{ backgroundColor: '#f8fafc', border: '2px solid #cbd5e1' }}
                        >
                          <Phone className="w-4 h-4 text-[#087A35] shrink-0" />
                          <span className="font-bold text-[10px]" style={{ color: '#64748b' }}>للطلب</span>
                          <span dir="ltr" className="font-black" style={{ color: '#0f172a' }}>{settings.phone || '0791234567'}</span>
                        </div>
                      </div>

                      {/* Bottom green slogan banner */}
                      <div
                        className="rounded-xl py-1.5 px-4 text-center flex items-center justify-between text-xs font-bold"
                        style={{ backgroundColor: '#087A35', color: '#ffffff' }}
                      >
                        <div className="flex items-center gap-2">
                          <Leaf className="w-3.5 h-3.5 shrink-0 text-white" />
                          <span>{settings.slogan || 'جودة عالية ... طازجة يومية'}</span>
                        </div>
                        <span className="text-[10px] font-bold opacity-85">
                          صفحة {pageIdx + 1} من {chunksToRender.length}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  // "Continued" note on intermediate pages
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="text-center py-4 text-xs font-bold text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      يتبع في الصفحة التالية... (صفحة {pageIdx + 1} من {chunksToRender.length})
                    </div>

                    <div
                      className="rounded-xl py-1.5 px-4 text-center flex items-center justify-between text-xs font-bold"
                      style={{ backgroundColor: '#087A35', color: '#ffffff' }}
                    >
                      <div className="flex items-center gap-2">
                        <Leaf className="w-3.5 h-3.5 shrink-0 text-white" />
                        <span>{settings.slogan || 'جودة عالية ... طازجة يومية'}</span>
                      </div>
                      <span className="text-[10px] font-bold opacity-85">
                        صفحة {pageIdx + 1} من {chunksToRender.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
};
