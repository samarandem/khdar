import React, { useState } from 'react';
import { Invoice, ShopSettings } from '../types';
import { PrintableInvoice } from './PrintableInvoice';
import {
  X,
  Printer,
  Edit,
  Trash2,
  Download,
  MessageCircle,
  Receipt,
  Loader2,
} from 'lucide-react';
import { generatePdfFromElement, formatInvoiceForWhatsApp, printHtmlElement } from '../services/pdfService';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  settings: ShopSettings;
  onClose: () => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  autoPrint?: boolean;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  settings,
  onClose,
  onEdit,
  onDelete,
  autoPrint = false,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printHtmlElement(
        `printable-invoice-container-${invoice.id}`,
        `فاتورة_${invoice.id}_${invoice.customerName.replace(/\s+/g, '_')}`
      );
    } finally {
      setIsPrinting(false);
    }
  };

  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement(
        `printable-invoice-container-${invoice.id}`,
        `فاتورة_${invoice.id}_${invoice.customerName.replace(/\s+/g, '_')}`
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = formatInvoiceForWhatsApp(invoice, settings);
    const url = invoice.customerPhone
      ? `https://wa.me/${invoice.customerPhone.replace(/\D/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar (High Density, No-Print) */}
        <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/90 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F0F9F4] text-[#087A35] flex items-center justify-center font-bold border border-[#087A35]/20">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1A1A1A] leading-tight">
                معاينة الطباعة وتفاصيل الفاتورة
              </h3>
              <span className="text-xs font-bold text-[#087A35]">
                {invoice.id}
              </span>
            </div>
          </div>

          <button
            id="btn-close-invoice-detail"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-gray-100/60 flex justify-center">
          <PrintableInvoice
            invoice={invoice}
            settings={settings}
            id={`printable-invoice-container-${invoice.id}`}
          />
        </div>

        {/* Action Buttons Toolbar (No-Print) */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 no-print">
          {/* Left Actions: Print & Download PDF & WhatsApp */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              id="btn-invoice-print"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold transition-all shadow-2xs disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري تجهيز الـ PDF وإرساله للطابعة...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الفاتورة</span>
                </>
              )}
            </button>

            <button
              id="btn-invoice-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-[#087A35] text-xs font-bold border border-[#087A35]/30 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'جاري التحميل...' : 'تنزيل PDF'}</span>
            </button>

            <button
              id="btn-invoice-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>
          </div>

          {/* Right Actions: Edit & Delete */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-invoice-edit"
              onClick={() => onEdit(invoice)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200/60 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>تعديل</span>
            </button>

            <button
              id="btn-invoice-delete"
              onClick={() => onDelete(invoice)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200/60 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
