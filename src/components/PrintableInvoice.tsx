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
      className="bg-white text-[#1A1A1A] p-1 max-w-[800px] mx-auto select-none space-y-6 overflow-x-auto w-full"
      dir="rtl"
      style={{
        width: '100%',
        maxWidth: '800px',
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
              className="pdf-page bg-white p-6 space-y-4 flex flex-col justify-between mx-auto"
              style={{
                width: '780px',
                minHeight: '1100px',
                boxSizing: 'border-box',
                pageBreakAfter: 'always',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
              }}
            >
              {/* Top part wrapper */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {/* 1. HEADER SECTION */}
                {pageIdx === 0 ? (
                  // Full Header for Page 1
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        borderBottom: '1.5px solid #d1d5db',
                        paddingBottom: '14px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Left / Right 1: Shop Branding */}
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
                            backgroundColor: '#f0f9f4',
                            border: '1.5px solid #a7f3d0',
                            borderRadius: '16px',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            width: '76px',
                            height: '76px',
                            minWidth: '76px',
                            minHeight: '76px',
                            maxWidth: '76px',
                            maxHeight: '76px',
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
                              width: '68px',
                              height: '68px',
                              maxWidth: '68px',
                              maxHeight: '68px',
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#087A35', margin: 0, lineHeight: 1.2 }}>
                            {settings.shopName || 'خضار وفواكه'}
                          </h1>
                          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', margin: 0, lineHeight: 1.2 }}>
                            {settings.shopSubtitle || 'فواكه طازجة وخضار يومية'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '900', color: '#087A35', marginTop: '2px' }}>
                            <Leaf style={{ width: '13px', height: '13px', color: '#087A35' }} />
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
                          width: '24%',
                        }}
                      >
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#087A35', margin: 0, lineHeight: 1.2 }}>
                          فاتورة بيع
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', opacity: 0.8 }}>
                          <span style={{ display: 'block', height: '2px', width: '28px', backgroundColor: '#087A35' }} />
                          <Leaf style={{ width: '14px', height: '14px', color: '#087A35' }} />
                          <span style={{ display: 'block', height: '2px', width: '28px', backgroundColor: '#087A35' }} />
                        </div>
                      </div>

                      {/* Right: Invoice Badge & Date/Status */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '6px',
                          width: '34%',
                        }}
                      >
                        <div
                          style={{
                            width: '150px',
                            backgroundColor: '#087A35',
                            border: '1px solid #087A35',
                            borderRadius: '12px',
                            padding: '4px 6px',
                            textAlign: 'center',
                            color: '#ffffff',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '2px' }}>رقم الفاتورة</div>
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#087A35',
                              borderRadius: '8px',
                              padding: '2px 8px',
                              fontWeight: '900',
                              fontSize: '14px',
                              direction: 'ltr',
                              textAlign: 'center',
                            }}
                          >
                            {invoice.id}
                          </div>
                        </div>

                        <div
                          style={{
                            width: '150px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#374151',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                              <Calendar style={{ width: '12px', height: '12px', color: '#087A35' }} />
                              <span>التاريخ</span>
                            </span>
                            <span style={{ fontWeight: '800', color: '#111827' }}>{invoice.date}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                              <Wallet style={{ width: '12px', height: '12px', color: '#087A35' }} />
                              <span>حالة الدفع</span>
                            </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '900',
                                fontSize: '10px',
                                backgroundColor: invoice.status === 'pending' ? '#fef3c7' : '#dcfce7',
                                color: invoice.status === 'pending' ? '#92400e' : '#166534',
                                border: invoice.status === 'pending' ? '1px solid #f59e0b' : '1px solid #86efac',
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
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        backgroundColor: '#f0f9f4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 'bold', color: '#4b5563' }}>اسم المشتري :</span>
                          <span style={{ fontWeight: '900', color: '#111827' }}>
                            {invoice.customerName || 'عميل عام'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone style={{ width: '13px', height: '13px', color: '#087A35' }} />
                            <span>رقم الهاتف :</span>
                          </span>
                          <span style={{ fontWeight: '900', color: '#1f2937', direction: 'ltr' }}>
                            {invoice.customerPhone || '0791234567'}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '6px 12px',
                        }}
                      >
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#f0f9f4',
                            color: '#087A35',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <User style={{ width: '16px', height: '16px', color: '#087A35' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#087A35' }}>بيانات المشتري</span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Simplified Header for Page 2+
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e5e7eb',
                      paddingBottom: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Leaf style={{ width: '16px', height: '16px', color: '#087A35' }} />
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#087A35' }}>{settings.shopName}</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>|</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#4b5563' }}>تكملة فاتورة رقم {invoice.id}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af' }}>التاريخ: {invoice.date}</span>
                  </div>
                )}

                {/* 3. PRODUCTS TABLE */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', width: '100%', boxSizing: 'border-box' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#087A35', color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}>
                        <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>م</th>
                        <th style={{ padding: '8px 12px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>المنتج</th>
                        <th style={{ padding: '8px 10px', width: '100px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>الكمية</th>
                        <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>سعر الوحدة</th>
                        <th style={{ padding: '8px 12px', width: '100px', textAlign: 'center' }}>الإجمالي</th>
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
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#4b5563', borderLeft: '1px solid #e5e7eb' }}>
                              {globalIdx + 1}
                            </td>

                            {/* Product Name + Thumbnail Image */}
                            <td style={{ padding: '6px 12px', fontWeight: 'bold', fontSize: '12px', color: '#111827', borderLeft: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontWeight: '900', fontSize: '12px', color: '#111827' }}>{item.productName}</span>
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      minWidth: '28px',
                                      minHeight: '28px',
                                      maxWidth: '28px',
                                      maxHeight: '28px',
                                      objectFit: 'cover',
                                      borderRadius: '6px',
                                      border: '1px solid #e5e7eb',
                                      display: 'block',
                                      marginInlineStart: '6px',
                                    }}
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '14px', marginInlineStart: '6px' }}>🥬</span>
                                )}
                              </div>
                            </td>

                            {/* Quantity */}
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#1f2937', borderLeft: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                              {qtyDisplay}
                            </td>

                            {/* Unit Price */}
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#374151', borderLeft: '1px solid #e5e7eb' }}>
                              {priceDisplay}
                            </td>

                            {/* Total */}
                            <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: '900', fontSize: '12px', color: '#087A35' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                {isLastPage ? (
                  // Totals section only on last page
                  <>
                    {/* 4. TOTALS SECTION */}
                    <div
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        backgroundColor: '#f0f9f4',
                        border: '2px solid #a7f3d0',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calculator style={{ width: '15px', height: '15px', color: '#087A35' }} />
                          <span>المجموع الفرعي</span>
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#111827' }}>
                          {(Number(invoice.subtotal ?? invoice.total) || 0).toFixed(2)} {settings.currency}
                        </span>
                      </div>

                      {(Boolean(invoice.deliveryFee) && (Number(invoice.deliveryFee) || 0) > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Truck style={{ width: '15px', height: '15px', color: '#087A35' }} />
                            <span>خدمة التوصيل</span>
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#087A35' }}>
                            + {(Number(invoice.deliveryFee) || 0).toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      )}

                      {(Boolean(invoice.discount) && (Number(invoice.discount) || 0) > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Tag style={{ width: '15px', height: '15px', color: '#b45309' }} />
                            <span>الخصم</span>
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#b45309' }}>
                            - {(Number(invoice.discount) || 0).toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      )}

                      <div style={{ borderTop: '1px dashed #a7f3d0', marginTop: '2px', marginBottom: '2px' }} />

                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900', color: '#087A35' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Wallet style={{ width: '18px', height: '18px', color: '#087A35' }} />
                          <span>الإجمالي الكلي المطلوب</span>
                        </span>
                        <span style={{ fontSize: '18px', fontWeight: '900', color: '#087A35' }}>
                          {(Number(invoice.total) || 0).toFixed(2)} {settings.currency}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#374151', borderTop: '1px dashed #a7f3d0', paddingTop: '4px' }}>
                        <span>طريقة / حالة السداد:</span>
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: '6px',
                            fontWeight: '900',
                            fontSize: '11px',
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
                      style={{
                        textAlign: 'center',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#f0f9f4',
                        border: '2px solid #a7f3d0',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#087A35' }}>
                        {tafqeetText}
                      </span>
                    </div>

                    {/* 6. FOOTER CONTACT CARDS */}
                    <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1.5px solid #e5e7eb', width: '100%', boxSizing: 'border-box' }}>
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
                        {/* 1: Address */}
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            minHeight: '60px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <MapPin style={{ width: '15px', height: '15px', color: '#ef4444', flexShrink: 0 }} />
                          <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>العنوان</span>
                          <span style={{ fontWeight: '900', fontSize: '10px', color: '#0f172a', lineHeight: 1.2 }}>
                            {settings.address || 'عمان - الأردن'}
                          </span>
                        </div>

                        {/* 2: Delivery */}
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            minHeight: '60px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <Truck style={{ width: '15px', height: '15px', color: '#087A35', flexShrink: 0 }} />
                          <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>خدمة توصيل</span>
                          <span style={{ fontWeight: '900', fontSize: '10px', color: '#087A35', lineHeight: 1.2 }}>
                            سريعة خلال ٢٤ ساعة
                          </span>
                        </div>

                        {/* 3: Whatsapp */}
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            minHeight: '60px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <MessageCircle style={{ width: '15px', height: '15px', color: '#059669', flexShrink: 0 }} />
                          <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>واتساب</span>
                          <span style={{ fontWeight: '900', fontSize: '10px', color: '#0f172a', direction: 'ltr' }}>
                            {settings.whatsapp || '0791234567'}
                          </span>
                        </div>

                        {/* 4: Phone */}
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            minHeight: '60px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <Phone style={{ width: '15px', height: '15px', color: '#087A35', flexShrink: 0 }} />
                          <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>للطلب</span>
                          <span style={{ fontWeight: '900', fontSize: '10px', color: '#0f172a', direction: 'ltr' }}>
                            {settings.phone || '0791234567'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom green slogan banner */}
                      <div
                        style={{
                          borderRadius: '12px',
                          padding: '6px 16px',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: '#087A35',
                          color: '#ffffff',
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
                  </>
                ) : (
                  // "Continued" note on intermediate pages
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#9ca3af',
                        border: '1px dashed #e5e7eb',
                        borderRadius: '12px',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      يتبع في الصفحة التالية... (صفحة {pageIdx + 1} من {chunksToRender.length})
                    </div>

                    <div
                      style={{
                        borderRadius: '12px',
                        padding: '6px 16px',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: '#087A35',
                        color: '#ffffff',
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
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
};

