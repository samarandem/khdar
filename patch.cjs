const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesListScreen.tsx', 'utf8');

// 1. Add PrintableBatchInvoices import
code = code.replace(
  "import { importInvoicesFromExcel } from '../services/excelService';",
  "import { importInvoicesFromExcel } from '../services/excelService';\nimport { PrintableBatchInvoices } from './PrintableBatchInvoices';\nimport { pdfService } from '../services/pdfService';"
);

// 2. Add 'status' to SortOption
code = code.replace(
  "type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';",
  "type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'status';"
);

// 3. Add selectedInvoiceIds state inside component
code = code.replace(
  "const [sortBy, setSortBy] = useState<SortOption>('newest');",
  `const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedInvoiceIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedInvoiceIds(newSet);
  };

  const selectAll = () => {
    if (selectedInvoiceIds.size === filteredInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(filteredInvoices.map((i) => i.id)));
    }
  };`
);

// 4. Update Sort logic for status
code = code.replace(
  "if (sortBy === 'lowest') {\n          return a.total - b.total;\n        }",
  `if (sortBy === 'lowest') {
          return a.total - b.total;
        }
        if (sortBy === 'status') {
          if (a.status !== b.status) {
            return a.status === 'paid' ? -1 : 1;
          }
          const dateCompare = (b.date || '').localeCompare(a.date || '');
          if (dateCompare !== 0) return dateCompare;
          return (b.time || '').localeCompare(a.time || '');
        }`
);

// 5. Update stats calculation
code = code.replace(
  "let pendingCount = 0;",
  `let pendingCount = 0;
    let totalItems = 0;`
);

code = code.replace(
  "filteredInvoices.forEach((inv) => {",
  `filteredInvoices.forEach((inv) => {
      totalItems += inv.items.reduce((sum, item) => sum + (item.quantity || 1), 0);`
);

code = code.replace(
  "return { totalSales, paidSales, pendingSales, paidCount, pendingCount };",
  `const avgInvoice = filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0;
    return { totalSales, paidSales, pendingSales, paidCount, pendingCount, totalItems, avgInvoice };`
);

// 6. Reset selection on filter reset
code = code.replace(
  "setSortBy('newest');\n  };",
  "setSortBy('newest');\n    setSelectedInvoiceIds(new Set());\n  };"
);

// 7. Add option to Dropdown
code = code.replace(
  '<option value="lowest">الأقل مبلغاً</option>',
  '<option value="lowest">الأقل مبلغاً</option>\n            <option value="status">حسب الحالة (الدفع ثم الذمم)</option>'
);

// 8. Add extra stats UI
code = code.replace(
  "</div>\n      </div>\n\n      {/* Invoices List Table / Cards (High Density) */}",
  `</div>
        <div className="grid grid-cols-2 gap-2 pt-1 mt-1 border-t border-gray-200/60">
          <div className="bg-blue-50/80 p-1.5 rounded-xl border border-blue-200/70 flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-800">
              متوسط الفاتورة:
            </span>
            <span className="font-extrabold text-blue-800 text-xs">
              {filteredStats.avgInvoice.toFixed(settings.decimalPlaces)} {settings.currency}
            </span>
          </div>
          <div className="bg-purple-50/80 p-1.5 rounded-xl border border-purple-200/70 flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-800">
              الأصناف المباعة:
            </span>
            <span className="font-extrabold text-purple-800 text-xs">
              {filteredStats.totalItems} صنف
            </span>
          </div>
        </div>
      </div>

      {/* Select All Row */}
      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedInvoiceIds.size === filteredInvoices.length && filteredInvoices.length > 0}
              onChange={selectAll}
              className="w-4 h-4 text-[#087A35] rounded border-gray-300 focus:ring-[#087A35]"
            />
            تحديد الكل ({filteredInvoices.length})
          </label>
        </div>
      )}

      {/* Invoices List Table / Cards (High Density) */}`
);

// 9. Add Checkbox to Row
code = code.replace(
  '<div className="w-8 h-8 rounded-lg bg-[#F0F9F4]',
  `<input
                  type="checkbox"
                  checked={selectedInvoiceIds.has(inv.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(inv.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-[#087A35] rounded border-gray-300 focus:ring-[#087A35] cursor-pointer shrink-0 mt-2"
                />
                <div className="w-8 h-8 rounded-lg bg-[#F0F9F4]`
);

// 10. Sticky bottom bar for selected invoices & Hidden print canvas
code = code.replace(
  "</div>\n  );\n};",
  `</div>

      {/* Sticky Selection Bar */}
      {selectedInvoiceIds.size > 0 && (
        <div className="fixed bottom-[72px] sm:bottom-6 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="max-w-xl mx-auto bg-[#1A1A1A] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold">
                تم تحديد {selectedInvoiceIds.size} فاتورة
              </span>
              <span className="text-sm font-black text-[#087A35]">
                المجموع:{' '}
                {invoices
                  .filter((inv) => selectedInvoiceIds.has(inv.id))
                  .reduce((sum, inv) => sum + inv.total, 0)
                  .toFixed(settings.decimalPlaces)}{' '}
                {settings.currency}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedInvoiceIds(new Set())}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  pdfService.printElement('printable-selected-invoices');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة المحددة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable container for selected invoices */}
      <div
        id="printable-selected-invoices"
        className="print:static print:w-auto print:h-auto print:opacity-100 print:pointer-events-auto"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0',
          width: '800px',
          opacity: 1,
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        <PrintableBatchInvoices
          id="printable-selected-invoices-doc"
          invoices={invoices.filter((inv) => selectedInvoiceIds.has(inv.id))}
          settings={settings}
        />
      </div>
    </div>
  );
};`
);

fs.writeFileSync('src/components/InvoicesListScreen.tsx', code);
