import React from 'react';
import { Invoice, ShopSettings } from '../types';
import { PrintableInvoice } from './PrintableInvoice';

interface PrintableBatchInvoicesProps {
  invoices: Invoice[];
  settings: ShopSettings;
  id?: string;
}

export const PrintableBatchInvoices: React.FC<PrintableBatchInvoicesProps> = ({
  invoices,
  settings,
  id = 'printable-batch-invoices-doc',
}) => {
  return (
    <div
      id={id}
      className="bg-white text-[#1A1A1A] p-2 max-w-[800px] mx-auto rounded-3xl select-none space-y-6 w-full"
      dir="rtl"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
      }}
    >
      {invoices.length === 0 ? (
        <div className="bg-white p-12 text-center text-gray-500 text-sm">
          لا توجد فواتير مطابقة للطباعة
        </div>
      ) : (
        invoices.map((inv, idx) => (
          <div
            key={inv.id || idx}
            style={{
              pageBreakAfter: 'always',
              breakAfter: 'page',
              marginBottom: '20px',
            }}
          >
            <PrintableInvoice
              invoice={inv}
              settings={settings}
              id={`batch-invoice-item-${inv.id || idx}`}
            />
          </div>
        ))
      )}
    </div>
  );
};
