import React from 'react';
import { Invoice } from '../types';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  invoice: Invoice;
  settings?: any;
  onCancel?: () => void;
  onClose?: () => void;
  onConfirm: (invoice: Invoice) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  invoice,
  settings,
  onCancel,
  onClose,
  onConfirm,
}) => {
  const handleCancel = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };
  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl border border-gray-200 text-center space-y-3.5 animate-in zoom-in-95 duration-150"
      >
        {/* Red Warning Icon */}
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Dialog Header & Text */}
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-[#1A1A1A]">
            هل أنت متأكد من حذف هذه الفاتورة؟
          </h3>
          <div className="inline-block px-2.5 py-0.5 rounded-lg bg-gray-100 text-[#1A1A1A] text-xs font-bold border border-gray-200 mt-0.5">
            {invoice.id} • {invoice.customerName}
          </div>
          <p className="text-[11px] text-red-500 font-bold pt-0.5">
            ⚠️ لا يمكن التراجع عن هذه العملية بعد إتمامها.
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={handleCancel}
            className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
          >
            إلغاء
          </button>

          <button
            id="btn-confirm-delete"
            type="button"
            onClick={() => onConfirm(invoice)}
            className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف نهائي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
