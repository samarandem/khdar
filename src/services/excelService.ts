import * as XLSX from 'xlsx';
import { Invoice, Product, Customer, ShopSettings } from '../types';

/**
 * Universal safe file downloader that works seamlessly on mobile (Android/iOS) and desktop browsers
 */
export const downloadBlobFile = (data: ArrayBuffer | Blob, filename: string, mimeType: string) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });

  // 1. Try modern Web Share API for files on mobile if supported
  if (
    navigator.canShare &&
    typeof File !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
  ) {
    try {
      const fileObj = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [fileObj] })) {
        navigator.share({
          files: [fileObj],
          title: filename,
        }).catch((err) => {
          // If share cancelled or failed, fallback to download link
          console.log('Share dismissed, triggering standard download fallback', err);
          fallbackDownloadLink(blob, filename);
        });
        return;
      }
    } catch (e) {
      console.warn('Web share file error, falling back:', e);
    }
  }

  // 2. Standard Blob Object URL download fallback
  fallbackDownloadLink(blob, filename);
};

const fallbackDownloadLink = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {}
  }, 3000);
};

export const exportInvoicesToExcel = (
  invoices: Invoice[],
  customers: Customer[] = [],
  fileNamePrefix = 'فواتير_خضار_وفواكه',
  settings?: ShopSettings
) => {
  // 1. Prepare Invoices Sheet
  const invoicesData = invoices.map((inv) => ({
    'رقم الفاتورة': inv.id,
    'التاريخ': inv.date,
    'اسم المشتري': inv.customerName,
    'رقم الهاتف': inv.customerPhone || '',
    'المجموع الفرعي (د.أ)': Number((Number(inv.subtotal ?? inv.total) || 0).toFixed(3)),
    'رسوم التوصيل (د.أ)': Number((Number(inv.deliveryFee) || 0).toFixed(3)),
    'الخصم (د.أ)': Number((Number(inv.discount) || 0).toFixed(3)),
    'الإجمالي الكلي (د.أ)': Number((Number(inv.total) || 0).toFixed(3)),
    'الحالة': inv.status === 'paid' ? 'مدفوعة' : 'معلقة',
    'ملاحظات': inv.notes || '',
  }));

  // 2. Prepare Invoice Items Sheet
  const invoiceItemsData: any[] = [];
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      invoiceItemsData.push({
        'رقم الفاتورة': inv.id,
        'التاريخ': inv.date,
        'اسم المشتري': inv.customerName,
        'معرف المنتج': item.productId,
        'اسم الصنف': item.productName,
        'التصنيف':
          item.category === 'vegetables'
            ? 'خضار'
            : item.category === 'fruits'
            ? 'فواكه'
            : item.category === 'herbs'
            ? 'ورقيات وأعشاب'
            : 'بكسات وشوالات',
        'الكمية (الوزن)': Number(item.quantity.toFixed(3)),
        'الوحدة': item.unit || 'كغ',
        'سعر الوحدة (د.أ)': Number(item.unitPrice.toFixed(3)),
        'الإجمالي (د.أ)': Number(item.total.toFixed(3)),
        'رابط الصورة': item.image || '',
      });
    });
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
  const wsItems = XLSX.utils.json_to_sheet(invoiceItemsData);

  // Set column widths for readability
  wsInvoices['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
  ];

  wsItems['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices');
  XLSX.utils.book_append_sheet(wb, wsItems, 'Invoice Items');

  if (customers && customers.length > 0) {
    const customersData = customers.map((c, idx) => {
      const custInvoices = invoices.filter(
        (inv) =>
          (inv.customerId && inv.customerId === c.id) ||
          (inv.customerName && inv.customerName.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
          (inv.customerPhone && c.phone && inv.customerPhone.trim() === c.phone.trim())
      );
      const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      return {
        'م': idx + 1,
        'ID': c.id,
        'اسم العميل': c.name,
        'رقم الهاتف': c.phone || '',
        'العنوان': c.address || '',
        'عدد الفواتير': custInvoices.length,
        'إجمالي المشتريات (د.أ)': Number(totalSpent.toFixed(3)),
        'ملاحظات': c.notes || '',
        'تاريخ التسجيل': c.createdAt || '',
      };
    });
    const wsCustomers = XLSX.utils.json_to_sheet(customersData);
    wsCustomers['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
      { wch: 20 },
      { wch: 25 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'العملاء');
  }

  if (settings) {
    const settingsData = [
      { 'المفتاح': 'اسم المحل', 'القيمة': settings.shopName },
      { 'المفتاح': 'العنوان الفرعي', 'القيمة': settings.shopSubtitle || '' },
      { 'المفتاح': 'الهاتف', 'القيمة': settings.phone || '' },
      { 'المفتاح': 'واتساب', 'القيمة': settings.whatsapp || '' },
      { 'المفتاح': 'العنوان', 'القيمة': settings.address || '' },
      { 'المفتاح': 'الشعار/الشعار اللفظي', 'القيمة': settings.slogan || '' },
      { 'المفتاح': 'رابط اللوجو', 'القيمة': settings.logoUrl || '' },
      { 'المفتاح': 'عنوان أسعار اليوم', 'القيمة': settings.todayPricesTitle || 'أسعار اليوم' },
      { 'المفتاح': 'بداية أرقام الفواتير', 'القيمة': settings.startingInvoiceNumber },
      { 'المفتاح': 'العملة', 'القيمة': settings.currency },
      { 'المفتاح': 'الخانة العشرية', 'القيمة': settings.decimalPlaces },
      { 'المفتاح': 'خدمة التوصيل', 'القيمة': settings.deliveryAvailable ? 'نعم' : 'لا' },
    ];
    const wsSettings = XLSX.utils.json_to_sheet(settingsData);
    wsSettings['!cols'] = [{ wch: 22 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSettings, 'الإعدادات');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_${todayStr}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlobFile(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportSettingsToExcel = (settings: ShopSettings, fileNamePrefix = 'إعدادات_المحل') => {
  const wb = XLSX.utils.book_new();
  const settingsData = [
    { 'المفتاح': 'اسم المحل', 'القيمة': settings.shopName },
    { 'المفتاح': 'العنوان الفرعي', 'القيمة': settings.shopSubtitle || '' },
    { 'المفتاح': 'الهاتف', 'القيمة': settings.phone || '' },
    { 'المفتاح': 'واتساب', 'القيمة': settings.whatsapp || '' },
    { 'المفتاح': 'العنوان', 'القيمة': settings.address || '' },
    { 'المفتاح': 'الشعار/الشعار اللفظي', 'القيمة': settings.slogan || '' },
    { 'المفتاح': 'رابط اللوجو', 'القيمة': settings.logoUrl || '' },
    { 'المفتاح': 'عنوان أسعار اليوم', 'القيمة': settings.todayPricesTitle || 'أسعار اليوم' },
    { 'المفتاح': 'بداية أرقام الفواتير', 'القيمة': settings.startingInvoiceNumber },
    { 'المفتاح': 'العملة', 'القيمة': settings.currency },
    { 'المفتاح': 'الخانة العشرية', 'القيمة': settings.decimalPlaces },
    { 'المفتاح': 'خدمة التوصيل', 'القيمة': settings.deliveryAvailable ? 'نعم' : 'لا' },
  ];
  const wsSettings = XLSX.utils.json_to_sheet(settingsData);
  wsSettings['!cols'] = [{ wch: 22 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSettings, 'الإعدادات');
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_${todayStr}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlobFile(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportCustomersToExcel = (customers: Customer[], invoices: Invoice[] = [], fileNamePrefix = 'قائمة_العملاء') => {
  const data = customers.map((c, idx) => {
    const custInvoices = invoices.filter(
      (inv) =>
        (inv.customerId && inv.customerId === c.id) ||
        (inv.customerName && inv.customerName.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
        (inv.customerPhone && c.phone && inv.customerPhone.trim() === c.phone.trim())
    );
    const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return {
      'م': idx + 1,
      'ID': c.id,
      'اسم العميل': c.name,
      'رقم الهاتف': c.phone || '',
      'العنوان': c.address || '',
      'عدد الفواتير': custInvoices.length,
      'إجمالي المشتريات (د.أ)': Number(totalSpent.toFixed(3)),
      'ملاحظات': c.notes || '',
      'تاريخ التسجيل': c.createdAt || '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 25 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_${todayStr}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlobFile(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportProductsToExcel = (products: Product[], fileNamePrefix = 'قائمة_أسعار_المنتجات') => {
  const data = products.map((p, idx) => ({
    'م': idx + 1,
    'ID': p.id,
    'اسم المنتج': p.name,
    'التصنيف':
      p.category === 'vegetables'
        ? 'خضار'
        : p.category === 'fruits'
        ? 'فواكه'
        : p.category === 'herbs'
        ? 'ورقيات وأعشاب'
        : 'بكسات وشوالات',
    'الوحدة': p.unit,
    'السعر الحالي (د.أ)': Number(p.price.toFixed(3)),
    'الحالة': p.active ? 'نشط' : 'متوقف',
    'رابط الصورة': p.image || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
    { wch: 12 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات والأسعار');
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_${todayStr}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlobFile(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

/**
 * Safely parse any price representation from Excel, CSV, Google Sheets, or inputs.
 * Handles:
 * - "0,39" -> 0.39 (Arabic / European comma separator)
 * - "0،39" -> 0.39 (Arabic comma)
 * - "0٫39" -> 0.39 (Arabic decimal separator)
 * - "٠٫٣٩" -> 0.39 (Arabic-Indic numerals)
 * - "0.39" -> 0.39
 * - Integers like 39 for kg/items -> converts 39 to 0.39
 */
export const parsePriceValue = (val: any, unit = 'كغ'): number | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    let num = val;
    // If integer like 39, 49, 59, 69, 79, 89, 99 for kg/bundle items
    if (num >= 10 && num < 100 && (unit === 'كغ' || unit === 'ضمة' || unit === 'حبة')) {
      num = num / 100;
    }
    return Number(num.toFixed(3));
  }

  let str = String(val).trim();
  if (!str) return null;

  // 1. Convert Arabic-Indic numerals (٠-٩) to standard numerals (0-9)
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  arabicDigits.forEach((d, i) => {
    str = str.split(d).join(String(i));
  });

  // 2. Remove currency labels or text
  str = str.replace(/[د\.أ|JD|JOD|دينار|قرش|فلس]/gi, '').trim();

  // 3. Handle decimal separators:
  // If string contains both comma and dot (e.g., "1,234.50" or "1.234,50")
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 -> European style
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> US style
      str = str.replace(/,/g, '');
    }
  } else {
    // If only comma(s) or Arabic comma '،' or '٫'
    str = str.replace(/[،,٫]/g, '.');
  }

  // 4. Clean any leftover characters except digits and dot
  const cleanStr = str.replace(/[^0-9.]/g, '');
  if (!cleanStr) return null;

  let num = parseFloat(cleanStr);
  if (isNaN(num)) return null;

  // If parsed as integer >= 10 and < 100 for standard produce unit (e.g. 39 -> 0.39)
  if (num >= 10 && num < 100 && (unit === 'كغ' || unit === 'ضمة' || unit === 'حبة')) {
    num = num / 100;
  }

  return Number(num.toFixed(3));
};

/**
 * Helper to normalize Arabic strings for fuzzy matching
 */
const normalizeText = (text: string): string => {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove arabic tashkeel diacritics
    .replace(/\s+/g, ' ');
};

export interface ExcelImportResult {
  updatedProducts: Product[];
  matchedCount: number;
  addedCount: number;
  totalRows: number;
  errors: string[];
}

/**
 * Import and update products/prices from an uploaded Excel (.xlsx, .xls, .csv) file
 */
export const importProductsFromExcel = async (
  file: File,
  currentProducts: Product[]
): Promise<ExcelImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('الملف لا يحتوي على أوراق عمل (Sheets).');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('ورقة العمل فارغة أو لا تحتوي على صفوف صالحة.');
        }

        const updatedProducts = [...currentProducts];
        let matchedCount = 0;
        let addedCount = 0;
        const errors: string[] = [];

        rawRows.forEach((row, rowIndex) => {
          // Identify columns dynamically
          let nameVal = '';
          let priceVal: number | null = null;
          let unitVal = '';
          let categoryVal = '';
          let imageVal = '';

          for (const key of Object.keys(row)) {
            const cleanKey = normalizeText(key);
            const val = row[key];

            // Product Name Match
            if (
              cleanKey.includes('اسم المنتج') ||
              cleanKey.includes('اسم الصنف') ||
              cleanKey.includes('المنتج') ||
              cleanKey.includes('الصنف') ||
              cleanKey.includes('product') ||
              cleanKey.includes('item') ||
              cleanKey.includes('name')
            ) {
              if (val && !nameVal) nameVal = String(val).trim();
            }

            // Price Match
            if (
              cleanKey.includes('سعر') ||
              cleanKey.includes('السعر') ||
              cleanKey.includes('price') ||
              cleanKey.includes('unit price') ||
              cleanKey.includes('قيمه') ||
              cleanKey.includes('القيمة')
            ) {
              const parsedNum = parsePriceValue(val, unitVal || 'كغ');
              if (parsedNum !== null && priceVal === null) {
                priceVal = parsedNum;
              }
            }

            // Unit Match
            if (
              cleanKey.includes('وحده') ||
              cleanKey.includes('الوحده') ||
              cleanKey.includes('unit')
            ) {
              if (val && !unitVal) unitVal = String(val).trim();
            }

            // Category Match
            if (
              cleanKey.includes('تصنيف') ||
              cleanKey.includes('التصنيف') ||
              cleanKey.includes('قسم') ||
              cleanKey.includes('category')
            ) {
              if (val && !categoryVal) categoryVal = String(val).trim();
            }

            // Image URL Match
            if (
              cleanKey.includes('صورة') ||
              cleanKey.includes('صوره') ||
              cleanKey.includes('image') ||
              cleanKey.includes('photo') ||
              cleanKey.includes('picture') ||
              cleanKey.includes('img') ||
              cleanKey.includes('url')
            ) {
              if (val && !imageVal) imageVal = String(val).trim();
            }
          }

          // If headers weren't named, fallback by column position if row has values
          if (!nameVal && row['__EMPTY']) {
            nameVal = String(row['__EMPTY']).trim();
          }
          if (priceVal === null && row['__EMPTY_1']) {
            priceVal = parsePriceValue(row['__EMPTY_1'], unitVal || 'كغ');
          }

          if (!nameVal) {
            return; // Skip empty row
          }

          const normName = normalizeText(nameVal);

          // Find matching product in existing catalog
          const existingIdx = updatedProducts.findIndex((p) => {
            const pNorm = normalizeText(p.name);
            return pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm);
          });

          if (existingIdx !== -1) {
            // Update existing product price & unit (& image if provided)
            if (priceVal !== null) {
              updatedProducts[existingIdx] = {
                ...updatedProducts[existingIdx],
                price: Number(priceVal.toFixed(3)),
                unit: unitVal || updatedProducts[existingIdx].unit,
                ...(imageVal ? { image: imageVal } : {}),
              };
              matchedCount++;
            }
          } else {
            // Add as a new product if price is valid
            if (priceVal !== null) {
              let detectedCategory: any = 'vegetables';
              const normCat = normalizeText(categoryVal);
              if (normCat.includes('فواكه') || normCat.includes('fruit')) {
                detectedCategory = 'fruits';
              } else if (normCat.includes('عشب') || normCat.includes('ورق') || normCat.includes('herb')) {
                detectedCategory = 'herbs';
              } else if (normCat.includes('بكس') || normCat.includes('شوال') || normCat.includes('box')) {
                detectedCategory = 'boxes';
              }

              updatedProducts.push({
                id: `prod-excel-${Date.now()}-${rowIndex}`,
                name: nameVal,
                category: detectedCategory,
                unit: unitVal || 'كغ',
                price: Number(priceVal.toFixed(3)),
                active: true,
                image:
                  imageVal ||
                  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80',
              });
              addedCount++;
            } else {
              errors.push(`الصنف "${nameVal}" لم يتم العثور على سعر صالح له في السطر ${rowIndex + 1}`);
            }
          }
        });

        resolve({
          updatedProducts,
          matchedCount,
          addedCount,
          totalRows: rawRows.length,
          errors,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'حدث خطأ أثناء قراءة ملف الإكسل'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف من الجهاز'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export interface ExcelCustomerImportResult {
  updatedCustomers: Customer[];
  matchedCount: number;
  addedCount: number;
  totalRows: number;
  errors: string[];
}

/**
 * Import and update customers from an uploaded Excel (.xlsx, .xls, .csv) file
 */
export const importCustomersFromExcel = async (
  file: File,
  currentCustomers: Customer[]
): Promise<ExcelCustomerImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Find customer sheet if available, or use first sheet
        let targetSheetName = workbook.SheetNames.find((s) => {
          const norm = normalizeText(s);
          return (
            norm.includes('عملاء') ||
            norm.includes('العملاء') ||
            norm.includes('زبائن') ||
            norm.includes('customer') ||
            norm.includes('clients')
          );
        });

        if (!targetSheetName) {
          targetSheetName = workbook.SheetNames[0];
        }

        if (!targetSheetName) {
          throw new Error('الملف لا يحتوي على أوراق عمل (Sheets).');
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('ورقة العمل فارغة أو لا تحتوي على صفوف صالحة.');
        }

        const updatedCustomers = [...currentCustomers];
        let matchedCount = 0;
        let addedCount = 0;
        const errors: string[] = [];

        rawRows.forEach((row, rowIndex) => {
          let idVal = '';
          let nameVal = '';
          let phoneVal = '';
          let addressVal = '';
          let notesVal = '';
          let createdAtVal = '';

          for (const key of Object.keys(row)) {
            const cleanKey = normalizeText(key);
            const val = row[key];
            if (val === undefined || val === null || val === '') continue;
            const strVal = String(val).trim();

            // Name
            if (
              cleanKey.includes('اسم العميل') ||
              cleanKey.includes('اسم الزبون') ||
              cleanKey.includes('الاسم') ||
              cleanKey.includes('العميل') ||
              cleanKey.includes('الزبون') ||
              cleanKey.includes('المشتري') ||
              cleanKey === 'name' ||
              cleanKey.includes('customer name') ||
              cleanKey.includes('client')
            ) {
              if (!nameVal) nameVal = strVal;
            }

            // Phone
            else if (
              cleanKey.includes('هاتف') ||
              cleanKey.includes('موبايل') ||
              cleanKey.includes('جوال') ||
              cleanKey.includes('تلفون') ||
              cleanKey.includes('phone') ||
              cleanKey.includes('mobile') ||
              cleanKey.includes('tel') ||
              cleanKey.includes('whatsapp')
            ) {
              if (!phoneVal) phoneVal = strVal;
            }

            // Address
            else if (
              cleanKey.includes('عنوان') ||
              cleanKey.includes('العنوان') ||
              cleanKey.includes('المنطقة') ||
              cleanKey.includes('السكن') ||
              cleanKey.includes('الموقع') ||
              cleanKey.includes('address') ||
              cleanKey.includes('location') ||
              cleanKey.includes('city')
            ) {
              if (!addressVal) addressVal = strVal;
            }

            // Notes
            else if (
              cleanKey.includes('ملاحظ') ||
              cleanKey.includes('الملاحظات') ||
              cleanKey.includes('تفاصيل') ||
              cleanKey.includes('notes') ||
              cleanKey.includes('note') ||
              cleanKey.includes('comment')
            ) {
              if (!notesVal) notesVal = strVal;
            }

            // ID
            else if (
              cleanKey === 'id' ||
              cleanKey === 'المعرف' ||
              cleanKey === 'كود' ||
              cleanKey === 'رقم العميل' ||
              cleanKey === 'كود العميل'
            ) {
              if (!idVal) idVal = strVal;
            }

            // CreatedAt
            else if (
              cleanKey.includes('تاريخ') ||
              cleanKey.includes('تسجيل') ||
              cleanKey.includes('date') ||
              cleanKey.includes('created')
            ) {
              if (!createdAtVal) {
                // If Excel serial number date
                if (typeof val === 'number' && val > 30000 && val < 60000) {
                  try {
                    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
                    createdAtVal = jsDate.toISOString().split('T')[0];
                  } catch {
                    createdAtVal = strVal;
                  }
                } else {
                  createdAtVal = strVal;
                }
              }
            }
          }

          // Fallback if headers weren't standard
          if (!nameVal && row['__EMPTY_1']) {
            nameVal = String(row['__EMPTY_1']).trim();
          } else if (!nameVal && row['__EMPTY']) {
            nameVal = String(row['__EMPTY']).trim();
          }

          if (!nameVal || nameVal === 'اسم العميل' || nameVal === 'ID' || nameVal === 'Name' || nameVal === 'م') {
            return; // Skip invalid or header row
          }

          const normName = normalizeText(nameVal);
          const cleanPhone = phoneVal.replace(/[^0-9]/g, '');

          // Check if customer already exists by ID, name, or phone
          const existingIdx = updatedCustomers.findIndex((c) => {
            if (idVal && c.id === idVal) return true;
            if (normalizeText(c.name) === normName) return true;
            if (cleanPhone && cleanPhone.length >= 7 && c.phone) {
              const cClean = c.phone.replace(/[^0-9]/g, '');
              if (cClean === cleanPhone) return true;
            }
            return false;
          });

          if (existingIdx !== -1) {
            // Update existing customer
            updatedCustomers[existingIdx] = {
              ...updatedCustomers[existingIdx],
              name: nameVal || updatedCustomers[existingIdx].name,
              phone: phoneVal || updatedCustomers[existingIdx].phone,
              address: addressVal !== undefined && addressVal !== '' ? addressVal : updatedCustomers[existingIdx].address,
              notes: notesVal !== undefined && notesVal !== '' ? notesVal : updatedCustomers[existingIdx].notes,
              createdAt: createdAtVal || updatedCustomers[existingIdx].createdAt,
            };
            matchedCount++;
          } else {
            // Add new customer
            updatedCustomers.push({
              id: idVal || `cust-excel-${Date.now()}-${rowIndex}`,
              name: nameVal,
              phone: phoneVal || '',
              address: addressVal || undefined,
              notes: notesVal || undefined,
              createdAt: createdAtVal || new Date().toISOString().split('T')[0],
            });
            addedCount++;
          }
        });

        resolve({
          updatedCustomers,
          matchedCount,
          addedCount,
          totalRows: rawRows.length,
          errors,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'حدث خطأ أثناء قراءة ملف عملاء الإكسل'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف من الجهاز'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export interface ExcelInvoiceImportResult {
  updatedInvoices: Invoice[];
  matchedCount: number;
  addedCount: number;
  totalRows: number;
  errors: string[];
}

/**
 * Helper to parse dates from various Excel formats
 */
const parseExcelDate = (val: any): string => {
  if (val === undefined || val === null || val === '') {
    return new Date().toISOString().split('T')[0];
  }
  if (typeof val === 'number' && val > 30000 && val < 70000) {
    try {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    } catch {}
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  // Try DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[/\-.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (p0 > 1000) {
      // YYYY-MM-DD
      const mm = String(p1).padStart(2, '0');
      const dd = String(p2).padStart(2, '0');
      return `${p0}-${mm}-${dd}`;
    } else if (p2 > 1000) {
      // DD-MM-YYYY or MM-DD-YYYY
      const yyyy = p2;
      const mm = String(p1 <= 12 ? p1 : p0).padStart(2, '0');
      const dd = String(p1 <= 12 ? p0 : p1).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return str || new Date().toISOString().split('T')[0];
};

/**
 * Import and update invoices from an uploaded Excel (.xlsx, .xls, .csv) file
 */
export const importInvoicesFromExcel = async (
  file: File,
  currentInvoices: Invoice[],
  catalogProducts: Product[] = []
): Promise<ExcelInvoiceImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('الملف لا يحتوي على أوراق عمل (Sheets).');
        }

        // 1. Check if there is a separate Invoice Items sheet
        const itemsByInvoiceId: Record<string, any[]> = {};
        const itemsSheetName = workbook.SheetNames.find((s) => {
          const norm = normalizeText(s);
          return (
            norm.includes('تفاصيل الاصناف') ||
            norm.includes('اصناف الفواتير') ||
            norm.includes('invoice items') ||
            norm.includes('items detail') ||
            norm === 'items' ||
            norm === 'الاصناف'
          );
        });

        if (itemsSheetName && workbook.Sheets[itemsSheetName]) {
          const rawItemRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[itemsSheetName], { defval: '' });
          rawItemRows.forEach((iRow) => {
            let invId = '';
            let prodName = '';
            let prodId = '';
            let qty = 1;
            let unitPrice = 0;
            let total = 0;
            let unit = 'كغ';
            let category: any = 'vegetables';
            let img = '';

            for (const k of Object.keys(iRow)) {
              const ck = normalizeText(k);
              const v = iRow[k];
              if (v === undefined || v === null || v === '') continue;

              if (ck.includes('رقم الفاتورة') || ck.includes('invoice') || ck === 'id' || ck.includes('فاتورة')) {
                invId = String(v).trim();
              } else if (ck.includes('اسم الصنف') || ck.includes('اسم المنتج') || ck.includes('المنتج') || ck.includes('صنف') || ck.includes('item') || ck.includes('product')) {
                prodName = String(v).trim();
              } else if (ck.includes('معرف') || ck.includes('كود')) {
                prodId = String(v).trim();
              } else if (ck.includes('كمية') || ck.includes('وزن') || ck.includes('qty') || ck.includes('quantity')) {
                qty = parsePriceValue(v, 'كغ') || 1;
              } else if (ck.includes('سعر الوحدة') || ck.includes('سعر') || ck.includes('unit price') || ck.includes('price')) {
                unitPrice = parsePriceValue(v, 'كغ') || 0;
              } else if (ck.includes('إجمالي') || ck.includes('اجمالي') || ck.includes('total')) {
                total = parsePriceValue(v, 'كغ') || 0;
              } else if (ck.includes('وحدة') || ck.includes('unit')) {
                unit = String(v).trim();
              } else if (ck.includes('تصنيف') || ck.includes('category')) {
                const ncat = normalizeText(String(v));
                if (ncat.includes('فواكه') || ncat.includes('fruit')) category = 'fruits';
                else if (ncat.includes('عشب') || ncat.includes('ورق') || ncat.includes('herb')) category = 'herbs';
                else if (ncat.includes('بكس') || ncat.includes('شوال') || ncat.includes('box')) category = 'boxes';
                else category = 'vegetables';
              } else if (ck.includes('صورة') || ck.includes('image')) {
                img = String(v).trim();
              }
            }

            if (invId && (prodName || prodId)) {
              if (!itemsByInvoiceId[invId]) {
                itemsByInvoiceId[invId] = [];
              }
              const calcTotal = total > 0 ? total : Number((qty * unitPrice).toFixed(3));
              itemsByInvoiceId[invId].push({
                productId: prodId || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                productName: prodName || 'صنف',
                category,
                quantity: qty,
                unitPrice,
                total: calcTotal,
                unit: unit || 'كغ',
                image: img || undefined,
              });
            }
          });
        }

        // 2. Identify candidate sheets for invoices
        // If there are sheets explicitly named "فواتير" or "invoices", prioritize those.
        // Otherwise, if multiple sheets exist (e.g. "فاتورة 1", "فاتورة 2"), we will scan each sheet!
        let sheetsToProcess: string[] = [];

        const explicitInvoiceSheets = workbook.SheetNames.filter((s) => {
          const norm = normalizeText(s);
          return (
            norm.includes('فواتير') ||
            norm.includes('الفواتير') ||
            norm.includes('المبيعات') ||
            norm.includes('مبيعات') ||
            norm.includes('فاتورة') ||
            norm.includes('فاتوره') ||
            norm.includes('invoice') ||
            norm.includes('sales')
          );
        });

        if (explicitInvoiceSheets.length > 0) {
          sheetsToProcess = explicitInvoiceSheets;
        } else {
          // Exclude helper/customer sheets if obvious
          sheetsToProcess = workbook.SheetNames.filter((s) => {
            const norm = normalizeText(s);
            if (norm === itemsSheetName?.toLowerCase()) return false;
            if (norm === 'العملاء' || norm === 'customers' || norm === 'الإعدادات' || norm === 'settings') return false;
            return true;
          });
          if (sheetsToProcess.length === 0) {
            sheetsToProcess = [workbook.SheetNames[0]];
          }
        }

        const importedInvoicesMap = new Map<string, Invoice>();
        let processedRowsCount = 0;
        const errors: string[] = [];

        // 3. Process each selected sheet
        for (const sheetName of sheetsToProcess) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          // Convert sheet to 2D Array to handle any header offset
          const rawGrid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawGrid || rawGrid.length === 0) continue;

          // Find the header row by searching for key words in the first 10 rows
          let headerRowIdx = -1;
          let colMap: {
            id: number;
            date: number;
            time: number;
            customerName: number;
            customerPhone: number;
            subtotal: number;
            deliveryFee: number;
            discount: number;
            total: number;
            paymentMethod: number;
            status: number;
            notes: number;
            items: number;
            itemName: number;
            itemQty: number;
            itemPrice: number;
            itemTotal: number;
            itemUnit: number;
          } = {
            id: -1,
            date: -1,
            time: -1,
            customerName: -1,
            customerPhone: -1,
            subtotal: -1,
            deliveryFee: -1,
            discount: -1,
            total: -1,
            paymentMethod: -1,
            status: -1,
            notes: -1,
            items: -1,
            itemName: -1,
            itemQty: -1,
            itemPrice: -1,
            itemTotal: -1,
            itemUnit: -1,
          };

          for (let r = 0; r < Math.min(rawGrid.length, 12); r++) {
            const row = rawGrid[r];
            if (!row || !Array.isArray(row)) continue;

            let score = 0;
            const tempMap = { ...colMap };

            row.forEach((cellVal, colIdx) => {
              if (cellVal === undefined || cellVal === null || cellVal === '') return;
              const ck = normalizeText(String(cellVal));

              if (ck.includes('رقم الفاتورة') || ck.includes('رقم الفاتوره') || ck === 'id' || ck === 'فاتورة' || ck === 'فاتوره' || ck.includes('invoice #') || ck.includes('invoice id') || ck.includes('رقم')) {
                tempMap.id = colIdx;
                score += 3;
              } else if (ck.includes('تاريخ') || ck.includes('date')) {
                tempMap.date = colIdx;
                score += 2;
              } else if (ck.includes('وقت') || ck.includes('time') || ck.includes('ساعة')) {
                tempMap.time = colIdx;
                score += 1;
              } else if (ck.includes('اسم المشتري') || ck.includes('اسم العميل') || ck.includes('اسم الزبون') || ck.includes('العميل') || ck.includes('الزبون') || ck.includes('المشتري') || ck.includes('customer') || ck.includes('client')) {
                tempMap.customerName = colIdx;
                score += 3;
              } else if (ck.includes('هاتف') || ck.includes('موبايل') || ck.includes('جوال') || ck.includes('تلفون') || ck.includes('phone') || ck.includes('mobile')) {
                tempMap.customerPhone = colIdx;
                score += 2;
              } else if (ck.includes('المجموع الفرعي') || ck.includes('فرعي') || ck.includes('subtotal') || ck.includes('الصافي')) {
                tempMap.subtotal = colIdx;
                score += 2;
              } else if (ck.includes('توصيل') || ck.includes('delivery') || ck.includes('اجور')) {
                tempMap.deliveryFee = colIdx;
                score += 1;
              } else if (ck.includes('خصم') || ck.includes('discount')) {
                tempMap.discount = colIdx;
                score += 1;
              } else if (ck.includes('الإجمالي الكلي') || ck.includes('المجموع الكلي') || ck.includes('الاجمالي الكلي') || ck.includes('الإجمالي') || ck.includes('الاجمالي') || ck.includes('المجموع') || ck.includes('المبلغ') || ck.includes('total') || ck.includes('amount') || ck.includes('grand total')) {
                tempMap.total = colIdx;
                score += 3;
              } else if (ck.includes('طريقة الدفع') || ck.includes('طريقة') || ck.includes('دفع') || ck.includes('payment')) {
                tempMap.paymentMethod = colIdx;
                score += 2;
              } else if (ck.includes('حالة الدفع') || ck.includes('الحالة') || ck.includes('حالة') || ck.includes('status')) {
                tempMap.status = colIdx;
                score += 2;
              } else if (ck.includes('ملاحظ') || ck.includes('notes') || ck.includes('note') || ck.includes('بيان')) {
                tempMap.notes = colIdx;
                score += 1;
              } else if (ck.includes('أصناف') || ck.includes('اصناف') || ck.includes('items') || ck.includes('تفاصيل') || ck.includes('json')) {
                tempMap.items = colIdx;
                score += 2;
              } else if (ck.includes('اسم الصنف') || ck.includes('اسم المنتج') || ck.includes('المنتج') || ck.includes('الصنف') || ck.includes('item') || ck.includes('product')) {
                tempMap.itemName = colIdx;
                score += 2;
              } else if (ck.includes('كمية') || ck.includes('وزن') || ck.includes('qty') || ck.includes('quantity')) {
                tempMap.itemQty = colIdx;
                score += 2;
              } else if (ck.includes('سعر الوحدة') || ck.includes('سعر الصنف') || ck.includes('unit price') || (ck.includes('سعر') && tempMap.total !== colIdx)) {
                tempMap.itemPrice = colIdx;
                score += 2;
              } else if (ck.includes('وحدة') || ck.includes('unit')) {
                tempMap.itemUnit = colIdx;
                score += 1;
              }
            });

            if (score >= 3) {
              headerRowIdx = r;
              colMap = tempMap;
              break;
            }
          }

          const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
          let currentInvoiceId = '';
          let autoInvoiceCounter = 1;

          for (let r = startRow; r < rawGrid.length; r++) {
            const row = rawGrid[r];
            if (!row || row.length === 0) continue;

            // Check if entire row is empty
            const isAllEmpty = row.every((c) => c === undefined || c === null || String(c).trim() === '');
            if (isAllEmpty) continue;

            processedRowsCount++;

            // Extract cells based on header mapping or fallback positions
            let idVal = colMap.id !== -1 && row[colMap.id] !== undefined ? String(row[colMap.id]).trim() : '';
            let dateVal = colMap.date !== -1 && row[colMap.date] !== undefined ? parseExcelDate(row[colMap.date]) : '';
            let timeVal = colMap.time !== -1 && row[colMap.time] !== undefined ? String(row[colMap.time]).trim() : '';
            let custNameVal = colMap.customerName !== -1 && row[colMap.customerName] !== undefined ? String(row[colMap.customerName]).trim() : '';
            let custPhoneVal = colMap.customerPhone !== -1 && row[colMap.customerPhone] !== undefined ? String(row[colMap.customerPhone]).trim() : '';
            let subtotalVal = colMap.subtotal !== -1 && row[colMap.subtotal] !== undefined ? parsePriceValue(row[colMap.subtotal], 'كغ') : null;
            let deliveryVal = colMap.deliveryFee !== -1 && row[colMap.deliveryFee] !== undefined ? parsePriceValue(row[colMap.deliveryFee], 'كغ') || 0 : 0;
            let discountVal = colMap.discount !== -1 && row[colMap.discount] !== undefined ? parsePriceValue(row[colMap.discount], 'كغ') || 0 : 0;
            let totalVal = colMap.total !== -1 && row[colMap.total] !== undefined ? parsePriceValue(row[colMap.total], 'كغ') : null;
            let payMethodVal = colMap.paymentMethod !== -1 && row[colMap.paymentMethod] !== undefined ? String(row[colMap.paymentMethod]).trim() : '';
            let statusVal = colMap.status !== -1 && row[colMap.status] !== undefined ? String(row[colMap.status]).trim() : '';
            let notesVal = colMap.notes !== -1 && row[colMap.notes] !== undefined ? String(row[colMap.notes]).trim() : '';
            let itemsColVal = colMap.items !== -1 && row[colMap.items] !== undefined ? String(row[colMap.items]).trim() : '';

            // Extract Item info if line-item columns exist
            const lineItemName = colMap.itemName !== -1 && row[colMap.itemName] !== undefined ? String(row[colMap.itemName]).trim() : '';
            const lineItemQty = colMap.itemQty !== -1 && row[colMap.itemQty] !== undefined ? parsePriceValue(row[colMap.itemQty], 'كغ') || 1 : 1;
            const lineItemPrice = colMap.itemPrice !== -1 && row[colMap.itemPrice] !== undefined ? parsePriceValue(row[colMap.itemPrice], 'كغ') || 0 : 0;
            const lineItemUnit = colMap.itemUnit !== -1 && row[colMap.itemUnit] !== undefined ? String(row[colMap.itemUnit]).trim() : 'كغ';

            // Fallback heuristics if column mapping didn't find specific headers
            if (headerRowIdx === -1) {
              // Positional heuristics
              if (!idVal && row[0] !== undefined) idVal = String(row[0]).trim();
              if (!dateVal && row[1] !== undefined) dateVal = parseExcelDate(row[1]);
              if (!custNameVal && row[2] !== undefined) custNameVal = String(row[2]).trim();
              if (totalVal === null && row[3] !== undefined) totalVal = parsePriceValue(row[3], 'كغ');
            }

            // Skip header repetitions or title text
            if (
              idVal === 'رقم الفاتورة' ||
              idVal === 'ID' ||
              idVal === 'م' ||
              idVal === '#' ||
              idVal === 'رقم' ||
              custNameVal === 'اسم العميل' ||
              custNameVal === 'العميل' ||
              custNameVal === 'Customer Name'
            ) {
              continue;
            }

            // If ID is missing on this row, decide if it belongs to current active invoice or is a new invoice
            if (!idVal) {
              if (currentInvoiceId && lineItemName && !custNameVal && totalVal === null) {
                // Continuation line-item of current invoice!
                idVal = currentInvoiceId;
              } else {
                // Generate unique invoice ID
                const cleanSheet = sheetName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
                idVal = `INV-${cleanSheet ? cleanSheet + '-' : ''}${Date.now().toString().slice(-4)}-${autoInvoiceCounter++}`;
              }
            }

            currentInvoiceId = idVal;

            // Normalize Payment Method
            let normPayMethod: 'cash' | 'card' | 'debt' = 'cash';
            const cleanPay = normalizeText(payMethodVal);
            if (cleanPay.includes('بطاق') || cleanPay.includes('فيزا') || cleanPay.includes('card') || cleanPay.includes('visa')) {
              normPayMethod = 'card';
            } else if (cleanPay.includes('دين') || cleanPay.includes('آجل') || cleanPay.includes('debt')) {
              normPayMethod = 'debt';
            }

            // Normalize Status
            let normStatus: 'paid' | 'pending' = 'paid';
            const cleanStatus = normalizeText(statusVal);
            if (
              cleanStatus.includes('معلق') ||
              cleanStatus.includes('دين') ||
              cleanStatus.includes('غير مدفوع') ||
              cleanStatus.includes('pending') ||
              cleanStatus.includes('unpaid')
            ) {
              normStatus = 'pending';
            }

            // Parse Items for this row
            let parsedRowItems: any[] = [];

            // Case A: Items column contains JSON or Text
            if (itemsColVal) {
              if (itemsColVal.startsWith('[') || itemsColVal.startsWith('{')) {
                try {
                  const p = JSON.parse(itemsColVal);
                  if (Array.isArray(p)) parsedRowItems = p;
                } catch {}
              } else {
                const parts = itemsColVal.split(/[|;]/);
                parts.forEach((p) => {
                  const pTrim = p.trim();
                  if (!pTrim) return;
                  const match = pTrim.match(/^(.+?)\s*\(([\d.]+)\s*x\s*([\d.]+)\)/i);
                  if (match) {
                    const name = match[1].trim();
                    const q = parseFloat(match[2]) || 1;
                    const pr = parseFloat(match[3]) || 0;
                    parsedRowItems.push({
                      productId: `prod-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                      productName: name,
                      category: 'vegetables',
                      quantity: q,
                      unitPrice: pr,
                      total: Number((q * pr).toFixed(3)),
                      unit: 'كغ',
                    });
                  } else {
                    parsedRowItems.push({
                      productId: `prod-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                      productName: pTrim,
                      category: 'vegetables',
                      quantity: 1,
                      unitPrice: 0,
                      total: 0,
                      unit: 'كغ',
                    });
                  }
                });
              }
            }

            // Case B: External items sheet linked by invoice ID
            if (itemsByInvoiceId[idVal] && itemsByInvoiceId[idVal].length > 0) {
              parsedRowItems = itemsByInvoiceId[idVal];
            }

            // Case C: Single line item per row
            if (lineItemName && lineItemName !== 'اسم الصنف' && lineItemName !== 'الصنف') {
              parsedRowItems.push({
                productId: `prod-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                productName: lineItemName,
                category: 'vegetables',
                quantity: lineItemQty,
                unitPrice: lineItemPrice,
                total: Number((lineItemQty * lineItemPrice).toFixed(3)),
                unit: lineItemUnit || 'كغ',
              });
            }

            // Check if this invoice was already created in our map (grouping multi-row items!)
            const existingInvInMap = importedInvoicesMap.get(idVal);

            if (existingInvInMap) {
              // Append items
              if (parsedRowItems.length > 0) {
                existingInvInMap.items = [...existingInvInMap.items, ...parsedRowItems];
              }
              // Update totals if not set
              if (totalVal !== null && totalVal > 0) {
                existingInvInMap.total = totalVal;
              } else {
                const reCalcSubtotal = existingInvInMap.items.reduce(
                  (sum, it) => sum + (it.total || it.quantity * it.unitPrice || 0),
                  0
                );
                existingInvInMap.subtotal = Number(reCalcSubtotal.toFixed(3));
                existingInvInMap.total = Number(
                  (reCalcSubtotal + existingInvInMap.deliveryFee - existingInvInMap.discount).toFixed(3)
                );
              }
              if (custNameVal && existingInvInMap.customerName === 'زبون عام') {
                existingInvInMap.customerName = custNameVal;
              }
              if (custPhoneVal && !existingInvInMap.customerPhone) {
                existingInvInMap.customerPhone = custPhoneVal;
              }
            } else {
              // Calculate Subtotal & Total
              const calculatedSubtotal =
                subtotalVal !== null
                  ? subtotalVal
                  : parsedRowItems.length > 0
                  ? parsedRowItems.reduce((sum, it) => sum + (it.total || it.quantity * it.unitPrice || 0), 0)
                  : totalVal !== null
                  ? totalVal
                  : 0;

              const calculatedTotal =
                totalVal !== null
                  ? totalVal
                  : Number((calculatedSubtotal + deliveryVal - discountVal).toFixed(3));

              const newInvoice: Invoice = {
                id: idVal,
                date: dateVal || new Date().toISOString().split('T')[0],
                time: timeVal || new Date().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' }),
                customerName: custNameVal || 'زبون عام',
                customerPhone: custPhoneVal || '',
                subtotal: Number(calculatedSubtotal.toFixed(3)),
                deliveryFee: Number(deliveryVal.toFixed(3)),
                discount: Number(discountVal.toFixed(3)),
                total: Number(calculatedTotal.toFixed(3)),
                paymentMethod: normPayMethod,
                status: normStatus,
                notes: notesVal || '',
                items: parsedRowItems,
              };

              importedInvoicesMap.set(idVal, newInvoice);
            }
          }
        }

        if (importedInvoicesMap.size === 0) {
          throw new Error('لم يتم العثور على أي فواتير صالحة في ملف الإكسل.');
        }

        // Merge imported invoices with current invoices
        const updatedInvoices = [...currentInvoices];
        let matchedCount = 0;
        let addedCount = 0;

        importedInvoicesMap.forEach((importedInv, invId) => {
          const existingIdx = updatedInvoices.findIndex((inv) => inv.id === invId);
          if (existingIdx !== -1) {
            updatedInvoices[existingIdx] = importedInv;
            matchedCount++;
          } else {
            updatedInvoices.push(importedInv);
            addedCount++;
          }
        });

        resolve({
          updatedInvoices,
          matchedCount,
          addedCount,
          totalRows: processedRowsCount,
          errors,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'حدث خطأ أثناء قراءة ملف الفواتير من Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف من الجهاز'));
    };

    reader.readAsArrayBuffer(file);
  });
};

