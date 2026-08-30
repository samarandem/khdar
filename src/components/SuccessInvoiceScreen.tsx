import React, { useEffect } from 'react';
import { Invoice, ShopSettings } from '../types';
import { Check, Receipt, Printer, Share2, Plus, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatInvoiceForWhatsApp } from '../services/pdfService';

interface SuccessInvoiceScreenProps {
  invoice: Invoice;
  settings: ShopSettings;
  onViewInvoice: () => void;
  onPrintInvoice: () => void;
  onNewInvoice: () => void;
}

export const SuccessInvoiceScreen: React.FC<SuccessInvoiceScreenProps> = ({
  invoice,
  settings,
  onViewInvoice,
  onPrintInvoice,
  onNewInvoice,
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#087A35', '#0A8F3D', '#34D399', '#F59E0B'],
      });
    } catch {
      // ignore
    }
  }, []);

  const handleShareWhatsApp = () => {
    const encoded = formatInvoiceForWhatsApp(invoice, settings);
    const url = invoice.customerPhone
      ? `https://wa.me/${invoice.customerPhone.replace(/\D/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `فاتورة ${invoice.id} - ${settings.shopName}`,
          text: `فاتورة بيع رقم ${invoice.id} بقيمة ${invoice.total.toFixed(2)} ${settings.currency} للمشتري ${invoice.customerName}`,
        });
      } catch {
        handleShareWhatsApp();
      }
    } else {
      handleShareWhatsApp();
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
      {/* Animated Success Checkmark (High Density) */}
      <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#087A35]/15 animate-ping opacity-30" />
        <div className="w-16 h-16 rounded-full bg-[#087A35] text-white flex items-center justify-center shadow-xs">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>
      </div>

      {/* Texts */}
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-[#1A1A1A]">
          تم إنشاء الفاتورة بنجاح
        </h2>
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F0F9F4] text-[#087A35] text-xs font-bold border border-[#087A35]/20">
          <Receipt className="w-3.5 h-3.5 text-[#087A35]" />
          <span>{invoice.id}</span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium pt-0.5">
          تم حفظ بيانات الفاتورة في السجلات وقاعدة البيانات
        </p>
      </div>

      {/* Mini Customer & Total Card */}
      <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-2xs space-y-1.5 text-right">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>المشتري:</span>
          <span className="font-bold text-[#1A1A1A]">{invoice.customerName}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>عدد الأصناف:</span>
          <span className="font-bold text-[#1A1A1A]">{invoice.items.length} أصناف</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-100">
          <span className="font-bold text-gray-800">الإجمالي المدفوع:</span>
          <span className="font-black text-sm text-[#087A35]">
            {invoice.total.toFixed(2)} {settings.currency}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        {/* View Invoice */}
        <button
          id="btn-success-view-invoice"
          onClick={onViewInvoice}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs border border-gray-200 shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <Receipt className="w-4 h-4 text-[#087A35]" />
          <span>عرض الفاتورة</span>
        </button>

        {/* Print Invoice */}
        <button
          id="btn-success-print-invoice"
          onClick={onPrintInvoice}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs border border-gray-200 shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4 text-gray-600" />
          <span>طباعة الفاتورة</span>
        </button>

        {/* WhatsApp & Share */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-success-share-whatsapp"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-[#F0F9F4] hover:bg-[#E2F4EB] text-[#087A35] font-bold text-xs border border-[#087A35]/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#087A35]" />
            <span>مشاركة WhatsApp</span>
          </button>

          <button
            id="btn-success-share-native"
            onClick={handleNativeShare}
            className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-600" />
            <span>مشاركة</span>
          </button>
        </div>

        {/* Start New Invoice */}
        <button
          id="btn-success-new-invoice"
          onClick={onNewInvoice}
          className="w-full py-3 px-5 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white font-black text-sm shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-3"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>فاتورة جديدة</span>
        </button>
      </div>
    </div>
  );
};
