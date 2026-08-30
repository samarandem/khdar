import * as XLSX from 'xlsx';
import { Invoice, Product, Customer, ShopSettings } from '../types';

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
  XLSX.writeFile(wb, `${fileNamePrefix}_${todayStr}.xlsx`);
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
  XLSX.writeFile(wb, `${fileNamePrefix}_${todayStr}.xlsx`);
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
  XLSX.writeFile(wb, `${fileNamePrefix}_${todayStr}.xlsx`);
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
  XLSX.writeFile(wb, `${fileNamePrefix}_${todayStr}.xlsx`);
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

