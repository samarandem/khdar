import { Product, Invoice, InvoiceItem, ShopSettings, Customer } from '../types';
import { INITIAL_PRODUCTS, INITIAL_INVOICES, DEFAULT_SETTINGS } from '../data/initialData';
import { parseArabicFloat } from '../utils/arabicNumbers';
import { normalizeCategory } from '../utils/categoryUtils';

export const ensureLeadingZero = (phone: any): string => {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  // If it's a 9-digit number starting with 7, 8, or 9, prepend '0'
  if (/^[789]\d{8}$/.test(trimmed)) {
    return '0' + trimmed;
  }
  return trimmed;
};

const STORAGE_KEYS = {
  PRODUCTS: 'khudar_fruits_products_v5',
  INVOICES: 'khudar_fruits_invoices_v1',
  SETTINGS: 'khudar_fruits_settings_v1',
  CUSTOMERS: 'khudar_fruits_customers_v1',
  EXPENSES: 'khudar_fruits_expenses_v1',
  DAILY_REPORTS: 'khudar_fruits_daily_reports_v1',
};

export const getStoredExpenses = (): Expense[] => {
// ... existing code ...
  return [];
};

export const saveStoredExpenses = (expenses: Expense[]): void => {
// ... existing code ...
};

export const getStoredDailyReports = (): DailyReport[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_REPORTS);
    if (data) {
      const parsed: DailyReport[] = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load daily reports', err);
  }
  return [];
};

export const saveStoredDailyReports = (reports: DailyReport[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_REPORTS, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save daily reports', err);
  }
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'أبو أحمد الربيع',
    phone: '0791234567',
    notes: 'عميل مميز - يفضل الخضار الطازجة صباحاً',
    address: 'عمان - خلدا',
    createdAt: '2026-01-10',
  },
  {
    id: 'cust-2',
    name: 'مطعم الياسمين',
    phone: '0788765432',
    notes: 'طلب أسبوعي جملة من الفواكه والورقيات',
    address: 'عمان - شارع الجاردنز',
    createdAt: '2026-01-15',
  },
  {
    id: 'cust-3',
    name: 'أم محمد العبدالله',
    phone: '0775551234',
    notes: 'طلب منزلي مع توصيل',
    address: 'عمان - الجبيهة',
    createdAt: '2026-02-01',
  },
];

export const sanitizeProductPrices = (products: Product[]): Product[] => {
  return products.map((p) => {
    let price = typeof p.price === 'number' && !isNaN(p.price) ? p.price : 0;
    const unit = p.unit || 'كغ';

    // Heal prices corrupted by comma stripping (e.g. 39 -> 0.39, 49 -> 0.49, 59 -> 0.59)
    if (price >= 10 && price < 100 && (unit === 'كغ' || unit === 'ضمة' || unit === 'حبة')) {
      price = price / 100;
    }

    // If price is 0 or negative, try matching initial catalog
    if (price <= 0) {
      const match = INITIAL_PRODUCTS.find(
        (ip) => ip.id === p.id || ip.name.trim().toLowerCase() === p.name.trim().toLowerCase()
      );
      if (match) price = match.price;
    }

    return {
      ...p,
      category: normalizeCategory(p.category),
      active: p.active !== false && (p.active as any) !== 'false' && (p.active as any) !== 'لا' && (p.active as any) !== '0',
      price: Number(price.toFixed(3)),
    };
  });
};

export const getStoredProducts = (): Product[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (data) {
      const parsed: Product[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const catalogMap = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
        const catalogNameMap = new Map(
          INITIAL_PRODUCTS.map((p) => [p.name.trim().toLowerCase(), p])
        );

        // Verify and heal prices
        const verified: Product[] = INITIAL_PRODUCTS.map((initial) => {
          const stored = parsed.find(
            (p) =>
              p.id === initial.id ||
              p.name.trim().toLowerCase() === initial.name.trim().toLowerCase()
          );

          if (
            stored &&
            typeof stored.price === 'number' &&
            !isNaN(stored.price) &&
            stored.price > 0
          ) {
            let price = stored.price;
            // Fix any corrupted 39 -> 0.39
            if (price >= 10 && price < 100 && (initial.unit === 'كغ' || initial.unit === 'ضمة' || initial.unit === 'حبة')) {
              price = price / 100;
            } else if (price >= 100 && (initial.unit === 'كغ' || initial.unit === 'ضمة' || initial.unit === 'حبة')) {
              price = initial.price;
            }

            return {
              ...initial,
              ...stored,
              price: Number(price.toFixed(3)),
            };
          }
          // If stored price is 0, NaN, or corrupted, restore original official price
          return initial;
        });

        // Keep any custom products created by the user with valid positive prices
        const customProducts = parsed.filter(
          (p) =>
            !catalogMap.has(p.id) &&
            !catalogNameMap.has(p.name.trim().toLowerCase()) &&
            typeof p.price === 'number' &&
            !isNaN(p.price) &&
            p.price > 0
        ).map((cp) => {
          let price = cp.price;
          if (price >= 10 && price < 100 && (cp.unit === 'كغ' || cp.unit === 'ضمة' || cp.unit === 'حبة')) {
            price = price / 100;
          }
          return {
            ...cp,
            price: Number(price.toFixed(3)),
          };
        });

        const allProducts = sanitizeProductPrices([...verified, ...customProducts]);
        saveStoredProducts(allProducts);
        return allProducts;
      }
    }
  } catch (err) {
    console.error('Failed to load products from storage', err);
  }
  saveStoredProducts(INITIAL_PRODUCTS);
  return INITIAL_PRODUCTS;
};

export const resetProductsToOfficialCatalog = (): Product[] => {
  saveStoredProducts(INITIAL_PRODUCTS);
  return INITIAL_PRODUCTS;
};

export const saveStoredProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products', err);
  }
};

export const cleanDateString = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let dateStr = String(dateVal).trim();

  // Handle dd/mm/yyyy or d/m/yyyy or dd-mm-yyyy formats
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = dateStr.match(dmyRegex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // If it is already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Fallback to standard JS parsing
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}

  return dateStr;
};

export const sanitizeInvoice = (inv: any): Invoice => {
  const items: InvoiceItem[] = Array.isArray(inv?.items)
    ? inv.items.map((it: any) => {
        const q = Math.round((parseArabicFloat(it.quantity) || 0) * 1000) / 1000;
        const p = Math.round((parseArabicFloat(it.unitPrice ?? it.price) || 0) * 1000) / 1000;
        return {
          productId: String(it.productId || it.id || ''),
          productName: String(it.productName || it.name || ''),
          category: it.category || 'vegetables',
          image: it.image || '',
          unit: String(it.unit || 'كغ'),
          quantity: q,
          unitPrice: p,
          total: parseArabicFloat(it.total) || Math.round(q * p * 100) / 100,
        };
      })
    : [];
  const rawSub = parseArabicFloat(inv.subtotal);
  const calculatedSub = items.reduce((s, i) => s + i.total, 0);
  const rawTotal = parseArabicFloat(inv.total);
  const subtotal =
    Math.round(
      ((rawSub > 0 ? rawSub : calculatedSub > 0 ? calculatedSub : rawTotal) || 0) * 100
    ) / 100;
  const deliveryFee = Math.round((parseArabicFloat(inv.deliveryFee) || 0) * 100) / 100;
  const discount = Math.round((parseArabicFloat(inv.discount) || 0) * 100) / 100;
  const total =
    Math.round((parseArabicFloat(inv.total) || Math.max(0, subtotal + deliveryFee - discount)) * 100) /
    100;

  return {
    id: String(inv.id),
    date: cleanDateString(inv.date),
    time: String(inv.time || '12:00'),
    customerName: String(inv.customerName || 'زبون عام'),
    customerPhone: inv.customerPhone ? ensureLeadingZero(inv.customerPhone) : undefined,
    subtotal,
    deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
    discount,
    total,
    status: inv.status === 'pending' ? 'pending' : 'paid',
    notes: inv.notes ? String(inv.notes) : undefined,
    items,
  };
};

export const getStoredInvoices = (): Invoice[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (data) {
      const parsed: any[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Filter duplicate invoice IDs if any exist from previous sync or tests
        const seen = new Set<string>();
        return parsed
          .filter((inv) => {
            if (!inv || !inv.id) return false;
            if (seen.has(inv.id)) return false;
            seen.add(inv.id);
            return true;
          })
          .map(sanitizeInvoice);
      }
    }
  } catch (err) {
    console.error('Failed to load invoices from storage', err);
  }
  return INITIAL_INVOICES.map(sanitizeInvoice);
};

export const saveStoredInvoices = (invoices: Invoice[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (err) {
    console.error('Failed to save invoices', err);
  }
};

export const getStoredSettings = (): ShopSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        phone: ensureLeadingZero(parsed.phone || DEFAULT_SETTINGS.phone),
        whatsapp: ensureLeadingZero(parsed.whatsapp || DEFAULT_SETTINGS.whatsapp),
      };
    }
  } catch (err) {
    console.error('Failed to load settings from storage', err);
  }
  return {
    ...DEFAULT_SETTINGS,
    phone: ensureLeadingZero(DEFAULT_SETTINGS.phone),
    whatsapp: ensureLeadingZero(DEFAULT_SETTINGS.whatsapp),
  };
};

export const saveStoredSettings = (settings: ShopSettings): void => {
  try {
    const cleaned = {
      ...settings,
      phone: ensureLeadingZero(settings.phone),
      whatsapp: ensureLeadingZero(settings.whatsapp),
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleaned));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
};

export const generateNextInvoiceId = (invoices: Invoice[], settings: ShopSettings): string => {
  let highestNum = settings.startingInvoiceNumber || 1001;
  invoices.forEach((inv) => {
    const match = inv.id.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= highestNum) {
        highestNum = num + 1;
      }
    }
  });
  return `INV-${highestNum}`;
};

export const getStoredCustomers = (): Customer[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (data) {
      const parsed: Customer[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(c => ({ ...c, phone: ensureLeadingZero(c.phone) }));
      }
    }
  } catch (err) {
    console.error('Failed to load customers from storage', err);
  }
  return INITIAL_CUSTOMERS.map(c => ({ ...c, phone: ensureLeadingZero(c.phone) }));
};

export const saveStoredCustomers = (customers: Customer[]): void => {
  try {
    const cleaned = customers.map(c => ({ ...c, phone: ensureLeadingZero(c.phone) }));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleaned));
  } catch (err) {
    console.error('Failed to save customers', err);
  }
};

export const resetAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(STORAGE_KEYS.INVOICES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
};

export const migrateAllProducts = (): Product[] => {
  const products = getStoredProducts();
  const migrated = products.map((p) => {
    let price: any = p.price;
    // If price is string, try to parse
    if (typeof price === 'string') {
      price = parseFloat((price as string).replace(/[,،]/g, '.'));
    }
    // Fix corrupted 39 -> 0.39
    if (price >= 10 && price < 100 && (p.unit === 'كغ' || p.unit === 'ضمة' || p.unit === 'حبة')) {
      price = price / 100;
    }
    return {
      ...p,
      price: isNaN(price) ? 0 : Number(price.toFixed(3)),
    };
  });
  saveStoredProducts(migrated);
  return migrated;
};
