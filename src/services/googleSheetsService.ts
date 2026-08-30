import { Product, Invoice, ShopSettings, GoogleSheetsSyncStatus, Customer } from '../types';
import { sanitizeInvoice } from './storage';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { parsePriceValue } from './excelService';
import { parseArabicFloat } from '../utils/arabicNumbers';
import { normalizeCategory } from '../utils/categoryUtils';

const STORAGE_KEYS = {
  TOKEN: 'khudar_fruits_gs_token',
  SHEET_ID: 'khudar_fruits_gs_sheet_id',
  SHEET_URL: 'khudar_fruits_gs_sheet_url',
  WEBHOOK_URL: 'khudar_fruits_gs_webhook_url',
  LAST_SYNC: 'khudar_fruits_gs_last_sync',
  AUTO_SYNC: 'khudar_fruits_gs_auto_sync',
  SYNC_MODE: 'khudar_fruits_gs_sync_mode',
};

// Global type augmentation for GIS google script
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id?: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export const getStoredAccessToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const saveAccessToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.SYNC_MODE, 'oauth');
};

export const getStoredWebhookUrl = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL);
};

/**
 * Save the shared Sheet configuration to the backend server
 */
export const saveSharedSheetConfigToServer = async (config: {
  webhookUrl?: string;
  sheetId?: string;
  sheetUrl?: string;
}): Promise<boolean> => {
  try {
    const res = await fetch('/api/sheets-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (err) {
    console.warn('Notice: Could not save shared sheets config to server:', err);
    return false;
  }
};

/**
 * Fetch the shared Sheet configuration from the backend server
 */
export const fetchSharedSheetConfigFromServer = async (): Promise<{
  webhookUrl?: string;
  sheetId?: string;
  sheetUrl?: string;
} | null> => {
  try {
    const res = await fetch('/api/sheets-config');
    if (res.ok) {
      const data = await res.json();
      if (data.webhookUrl) {
        localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, data.webhookUrl);
        localStorage.setItem(STORAGE_KEYS.SYNC_MODE, 'webhook');
      }
      if (data.sheetId) {
        localStorage.setItem(STORAGE_KEYS.SHEET_ID, data.sheetId);
      }
      if (data.sheetUrl) {
        localStorage.setItem(STORAGE_KEYS.SHEET_URL, data.sheetUrl);
      }
      return data;
    }
  } catch (err) {
    console.warn('Notice: Could not reach shared sheets config server, using local fallback');
  }
  const local = getStoredSheetConfig();
  return {
    webhookUrl: local.webhookUrl || undefined,
    sheetId: local.id || undefined,
    sheetUrl: local.url || undefined,
  };
};

export const saveWebhookUrl = (url: string): void => {
  const cleanUrl = url.trim();
  localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, cleanUrl);
  localStorage.setItem(STORAGE_KEYS.SYNC_MODE, 'webhook');
  saveSharedSheetConfigToServer({ webhookUrl: cleanUrl });
};

export const DEFAULT_SHEET_ID = '14qjdmnsG-ThVt5FCeKn36GFBtJWThNernl7qX7CZbVY';
export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/14qjdmnsG-ThVt5FCeKn36GFBtJWThNernl7qX7CZbVY/edit?usp=sharing';

export const getStoredSheetConfig = (): {
  id: string | null;
  url: string | null;
  webhookUrl: string | null;
  lastSync: string | null;
  autoSync: boolean;
  syncMode: 'oauth' | 'webhook';
} => {
  const autoSyncVal = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
  const webhookUrl = localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL);
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const mode = (localStorage.getItem(STORAGE_KEYS.SYNC_MODE) as 'oauth' | 'webhook') || (webhookUrl ? 'webhook' : 'oauth');

  return {
    id: localStorage.getItem(STORAGE_KEYS.SHEET_ID) || DEFAULT_SHEET_ID,
    url: localStorage.getItem(STORAGE_KEYS.SHEET_URL) || DEFAULT_SHEET_URL,
    webhookUrl,
    lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC),
    autoSync: autoSyncVal !== 'false', // Enabled by default
    syncMode: mode,
  };
};

export const saveSheetConfig = (id: string, url: string): void => {
  localStorage.setItem(STORAGE_KEYS.SHEET_ID, id);
  localStorage.setItem(STORAGE_KEYS.SHEET_URL, url);
  saveSharedSheetConfigToServer({ sheetId: id, sheetUrl: url });
};

export const setAutoSyncEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled ? 'true' : 'false');
};

export const updateLastSyncTime = (): string => {
  const now = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
  return now;
};

export const clearGoogleSheetsAuth = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.SHEET_ID);
  localStorage.removeItem(STORAGE_KEYS.SHEET_URL);
  localStorage.removeItem(STORAGE_KEYS.WEBHOOK_URL);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  localStorage.removeItem(STORAGE_KEYS.SYNC_MODE);
  saveSharedSheetConfigToServer({ webhookUrl: '', sheetId: '', sheetUrl: '' });
};

export const clearGoogleSheetsTokenOnly = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
};

export const fetchPublicSheetData = async (spreadsheetId: string): Promise<any[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch public sheet data');
    }
    const csvText = await response.text();
    // Simple CSV parser
    const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '')));
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  } catch (error) {
    console.error('Error fetching public sheet:', error);
    throw error;
  }
};

export const isCloudConnected = (): boolean => {
  return true; // Service Account khdar-345@gen-lang-client-0480470455.iam.gserviceaccount.com is always connected
};

export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
};

/**
 * Initialize or search for the Google Sheets database in Google Drive
 */
export const findOrCreateSpreadsheet = async (
  accessToken: string,
  preferredSheetIdOrUrl?: string
): Promise<{ id: string; url: string; isNew: boolean }> => {
  const existingConfig = getStoredSheetConfig();
  const targetId = extractSpreadsheetId(preferredSheetIdOrUrl || existingConfig.id || '');

  // 1. If target ID provided or already stored, verify access directly
  if (targetId) {
    try {
      const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (checkRes.ok) {
        const sheetData = await checkRes.json();
        const url = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${targetId}/edit`;
        saveSheetConfig(targetId, url);
        return { id: targetId, url, isNew: false };
      }
    } catch {
      // Failed to verify direct ID, continue to search in Drive
    }
  }

  // 2. Search in Google Drive for existing spreadsheet files
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&orderBy=modifiedTime desc&pageSize=10`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        // Look for file named 'قاعدة بيانات محل الخضار والفواكه' first, or fallback to the most recent spreadsheet
        const exactMatch = searchData.files.find(
          (f: any) => f.name && (f.name.includes('خضار') || f.name.includes('فواكه') || f.name.includes('أسعار') || f.name.includes('فواتير'))
        );
        const file = exactMatch || searchData.files[0];
        const url = `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
        saveSheetConfig(file.id, url);
        return { id: file.id, url, isNew: false };
      }
    }
  } catch (e) {
    console.warn('Drive search failed, creating new spreadsheet...', e);
  }

  // 3. Create new Spreadsheet if not found
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'قاعدة بيانات محل الخضار والفواكه',
      },
      sheets: [
        { properties: { title: 'المنتجات' } },
        { properties: { title: 'الفواتير' } },
        { properties: { title: 'الإعدادات' } },
        { properties: { title: 'العملاء' } },
      ],
    }),
  });

  if (!createRes.ok) {
    if (createRes.status === 401) {
      clearGoogleSheetsTokenOnly();
      throw new Error('انتهت صلاحية جلسة حساب Google. يرجى تسجيل الدخول مجدداً لتجديد المزامنة.');
    }
    const errText = await createRes.text();
    throw new Error(`فشل إنشاء جدول Google Sheets: ${errText}`);
  }

  const spreadsheetData = await createRes.json();
  const id = spreadsheetData.spreadsheetId;
  const url = spreadsheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`;

  saveSheetConfig(id, url);
  return { id, url, isNew: true };
};

/**
 * Push full data using Webhook / Google Apps Script
 */
export const syncViaWebhook = async (
  webhookUrl: string,
  payload: {
    action: 'sync_all' | 'save_invoice' | 'save_invoices' | 'delete_invoice' | 'save_products' | 'save_settings' | 'save_customers' | 'fetch_all';
    data?: any;
  }
): Promise<any> => {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`خطأ في خادم Google Apps Script: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.status === 'error') {
      throw new Error(json.message || 'فشلت العملية في جدول البيانات');
    }
    return json;
  } catch (err: any) {
    // If CORS preflight fails with fetch, fallback to query parameter GET or catch
    console.error('Webhook sync failed:', err);
    throw err;
  }
};

/**
 * Fetch all data via Webhook
 */
export const fetchViaWebhook = async (webhookUrl: string): Promise<{
  products?: Product[];
  invoices?: Invoice[];
  settings?: Partial<ShopSettings>;
  customers?: Customer[];
}> => {
  try {
    const res = await fetch(`${webhookUrl}?action=fetch_all`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`فشل الاتصال برابط الإكسل: ${res.statusText}`);
    }
    const json = await res.json();

    let parsedCustomers: Customer[] | undefined = undefined;
    if (Array.isArray(json.customers)) {
      parsedCustomers = json.customers
        .map((c: any) => ({
          id: String(c.id || `cust-${Date.now()}`),
          name: String(c.name || '').trim(),
          phone: String(c.phone || ''),
          notes: c.notes ? String(c.notes) : undefined,
          address: c.address ? String(c.address) : undefined,
          createdAt: String(c.createdAt || new Date().toISOString().split('T')[0]),
        }))
        .filter((c: Customer) => c.name);
    }

    return {
      products: json.products,
      invoices: Array.isArray(json.invoices) ? json.invoices.map(sanitizeInvoice) : undefined,
      settings: json.settings,
      customers: parsedCustomers,
    };
  } catch (err: any) {
    console.error('Webhook fetch failed:', err);
    throw err;
  }
};

/**
 * Ensures all required sheets ('المنتجات', 'الفواتير', 'الإعدادات', 'العملاء') exist in the spreadsheet.
 * If any sheets are missing, they will be created automatically.
 */
export const ensureRequiredSheetsExist = async (accessToken: string, spreadsheetId: string): Promise<void> => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn('Failed to fetch spreadsheet metadata to check sheets', await res.text());
      return;
    }
    const data = await res.json();
    const existingTitles = new Set<string>();
    if (data.sheets) {
      for (const s of data.sheets) {
        if (s.properties && s.properties.title) {
          existingTitles.add(s.properties.title);
        }
      }
    }

    const required = ['المنتجات', 'الفواتير', 'الإعدادات', 'العملاء'];
    const missing = required.filter(t => !existingTitles.has(t));

    if (missing.length > 0) {
      const requests = missing.map(title => ({
        addSheet: {
          properties: { title }
        }
      }));
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      if (!updateRes.ok) {
        console.warn('Failed to add missing sheets:', await updateRes.text());
      } else {
        console.log('Successfully created missing sheets:', missing);
      }
    }
  } catch (e) {
    console.warn('Error inside ensureRequiredSheetsExist:', e);
  }
};

/**
 * Sync (Push) Products, Invoices, and Settings to Google Sheets
 */
export const syncAllDataToGoogleSheets = async (
  accessToken: string | null,
  spreadsheetId: string | null,
  products: Product[],
  invoices: Invoice[],
  settings: ShopSettings,
  customers: Customer[] = []
): Promise<string> => {
  const config = getStoredSheetConfig();
  const targetSheetId = spreadsheetId || config.id || DEFAULT_SHEET_ID;

  // Primary Mode: Service Account direct backend sync
  try {
    const saRes = await fetch('/api/service-account/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetId: targetSheetId,
        products,
        invoices,
        settings,
        customers,
      }),
    });
    if (saRes.ok) {
      const saJson = await saRes.json();
      if (saJson.status === 'success') {
        return updateLastSyncTime();
      }
    }
  } catch (saErr) {
    console.warn('Service Account backend sync notice:', saErr);
  }

  // Mode 1: Webhook
  if (config.webhookUrl) {
    await syncViaWebhook(config.webhookUrl, {
      action: 'sync_all',
      data: {
        products,
        invoices,
        settings,
        customers,
      },
    });
    return updateLastSyncTime();
  }

  // Mode 2: Google Sheets API (OAuth)
  if (!accessToken || !spreadsheetId) {
    throw new Error('لم يتم العثور على صلاحيات الاتصال بـ Google Sheets');
  }

  // Ensure all required sheets exist in the spreadsheet (creates missing sheet "العملاء" etc.)
  await ensureRequiredSheetsExist(accessToken, spreadsheetId);

  // Build Product Rows
  const productRows = [
    ['المعرف', 'اسم المنتج', 'الفئة', 'السعر', 'الوحدة', 'نشط', 'الصورة'],
    ...products.map((p) => [
      p.id,
      p.name,
      p.category,
      p.price,
      p.unit || 'كغ',
      p.active ? 'نعم' : 'لا',
      p.image || '',
    ]),
  ];

  // Build Invoice Rows
  const invoiceRows = [
    [
      'رقم الفاتورة',
      'التاريخ',
      'الوقت',
      'اسم العميل',
      'هاتف العميل',
      'المجموع الفرعي',
      'رسوم التوصيل',
      'الخصم',
      'المجموع الكلي',
      'طريقة الدفع',
      'الحالة',
      'ملاحظات',
      'الأصناف النصية',
      'تفاصيل_المبيعات_JSON',
    ],
    ...invoices.map((inv) => {
      const itemsStr = Array.isArray(inv.items)
        ? inv.items.map((it: any) => `${it.productName || it.product?.name || 'صنف'} (${it.quantity} x ${it.unitPrice}) = ${it.total}`).join(' | ')
        : '';
      const itemsJson = JSON.stringify(inv.items || []);
      return [
        inv.id,
        inv.date,
        inv.time,
        inv.customerName || 'عميل عام',
        inv.customerPhone || '',
        inv.subtotal,
        inv.deliveryFee || 0,
        inv.discount || 0,
        inv.total,
        inv.paymentMethod === 'card' ? 'بطاقة' : inv.paymentMethod === 'debt' ? 'دين' : 'نقدي',
        inv.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
        inv.notes || '',
        itemsStr,
        itemsJson,
      ];
    }),
  ];

  // Build Settings Rows
  const settingsRows = [
    ['خاصية', 'القيمة'],
    ['اسم المحل', settings.shopName || ''],
    ['العنوان الفرعي', settings.shopSubtitle || ''],
    ['الهاتف', settings.phone || ''],
    ['واتساب', settings.whatsapp || ''],
    ['العنوان', settings.address || ''],
    ['الشعار/الشعار اللفظي', settings.slogan || ''],
    ['رابط اللوجو', settings.logoUrl || ''],
    ['عنوان أسعار اليوم', settings.todayPricesTitle || 'أسعار اليوم'],
    ['بداية أرقام الفواتير', settings.startingInvoiceNumber || 1000],
    ['العملة', settings.currency || 'د.أ'],
    ['الخانة العشرية', settings.decimalPlaces || 2],
    ['خدمة التوصيل', settings.deliveryAvailable ? 'نعم' : 'لا'],
    ['رسالة الفاتورة', settings.footerMessage || ''],
    ['ملاحظة مطبوعة', settings.invoiceNote || ''],
  ];

  // Build Customer Rows
  const customerRows = [
    ['ID', 'اسم العميل', 'رقم الهاتف', 'ملاحظات', 'العنوان', 'تاريخ الإضافة'],
    ...customers.map((c) => [
      c.id,
      c.name,
      c.phone || '',
      c.notes || '',
      c.address || '',
      c.createdAt || '',
    ]),
  ];

  // Clear old data first to remove deleted rows/invoices
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          "'المنتجات'!A2:G5000",
          "'الفواتير'!A2:M5000",
          "'الإعدادات'!A2:B100",
          "'العملاء'!A2:F5000",
        ],
      }),
    });
  } catch (clearErr) {
    console.warn('Batch clear notice:', clearErr);
  }

  const body = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'المنتجات'!A1:G" + Math.max(1, productRows.length),
        values: productRows,
      },
      {
        range: "'الفواتير'!A1:N" + Math.max(1, invoiceRows.length),
        values: invoiceRows,
      },
      {
        range: "'الإعدادات'!A1:B" + Math.max(1, settingsRows.length),
        values: settingsRows,
      },
      {
        range: "'العملاء'!A1:F" + Math.max(1, customerRows.length),
        values: customerRows,
      },
    ],
  };

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearGoogleSheetsTokenOnly();
      throw new Error('انتهت صلاحية جلسة حساب Google. يرجى إعادة تسجيل الدخول في قسم الإعدادات لتجديد الاتصال.');
    }
    const errText = await res.text();
    throw new Error(`خطأ أثناء مزامنة البيانات مع Google Sheets: ${errText}`);
  }

  return updateLastSyncTime();
};

// Helper for Service Account Sync
const syncPayloadToServiceAccount = async (payload: {
  products?: Product[];
  invoices?: Invoice[];
  customers?: Customer[];
  settings?: ShopSettings;
}): Promise<boolean> => {
  try {
    const config = getStoredSheetConfig();
    const sheetId = config.id || DEFAULT_SHEET_ID;
    const res = await fetch('/api/service-account/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, ...payload }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.saSynced || json.webhookSynced) {
        updateLastSyncTime();
        return true;
      }
    }
  } catch (err) {
    console.warn('Service account auto-sync notice:', err);
  }
  return false;
};

/**
 * Real-time Auto-Sync: Append Single Invoice
 */
export const autoSyncNewInvoice = async (
  invoice?: Invoice,
  allInvoices?: Invoice[],
  products?: Product[],
  settings?: ShopSettings
): Promise<boolean> => {
  const synced = await syncPayloadToServiceAccount({
    invoices: allInvoices || (invoice ? [invoice] : undefined),
    products,
    settings,
  });
  updateLastSyncTime();
  return synced;
};

export const autoSyncInvoices = async (
  invoices?: Invoice[],
  products?: Product[],
  settings?: ShopSettings
): Promise<boolean> => {
  const synced = await syncPayloadToServiceAccount({
    invoices,
    products,
    settings,
  });
  updateLastSyncTime();
  return synced;
};

export const autoSyncProducts = async (
  products?: Product[],
  invoices?: Invoice[],
  settings?: ShopSettings
): Promise<boolean> => {
  const synced = await syncPayloadToServiceAccount({
    products,
    invoices,
    settings,
  });
  updateLastSyncTime();
  return synced;
};

export const autoSyncCustomers = async (
  customers?: Customer[]
): Promise<boolean> => {
  const synced = await syncPayloadToServiceAccount({
    customers,
  });
  updateLastSyncTime();
  return synced;
};

export const autoSyncSettings = async (
  settings?: ShopSettings
): Promise<boolean> => {
  const synced = await syncPayloadToServiceAccount({
    settings,
  });
  updateLastSyncTime();
  return synced;
};

/**
 * Pull Data from Google Sheets to Local App
 */
export const fetchAllDataFromGoogleSheets = async (
  accessToken: string | null,
  spreadsheetId: string | null
): Promise<{
  products?: Product[];
  invoices?: Invoice[];
  settings?: Partial<ShopSettings>;
  customers?: Customer[];
  stats?: { productsCount: number; invoicesCount: number; customersCount: number };
}> => {
  const config = getStoredSheetConfig();
  const targetSheetId = spreadsheetId || config.id || DEFAULT_SHEET_ID;

  // Primary Mode: Service Account direct backend read
  try {
    const saRes = await fetch(`/api/service-account/read?sheetId=${targetSheetId}`);
    if (saRes.ok) {
      const saJson = await saRes.json();
      if (saJson.status === 'success' && saJson.data) {
        return {
          products: saJson.data.products,
          invoices: saJson.data.invoices,
          customers: saJson.data.customers,
          settings: saJson.data.settings,
          stats: {
            productsCount: saJson.data.products?.length || 0,
            invoicesCount: saJson.data.invoices?.length || 0,
            customersCount: saJson.data.customers?.length || 0,
          },
        };
      }
    }
  } catch (saErr) {
    console.warn('Service Account backend read notice:', saErr);
  }

  // Mode 1: Webhook
  if (config.webhookUrl) {
    const res = await fetchViaWebhook(config.webhookUrl);
    return {
      ...res,
      stats: {
        productsCount: res.products?.length || 0,
        invoicesCount: res.invoices?.length || 0,
        customersCount: res.customers?.length || 0,
      },
    };
  }

  // Mode 2: Google API
  if (!accessToken || !spreadsheetId) {
    throw new Error('يرجى تسجيل الدخول أو إدخال رابط الاتصال بـ Google Sheets أولاً');
  }

  // 1. Fetch spreadsheet metadata to discover existing sheet names
  let availableSheets: string[] = [];
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      if (metaData.sheets) {
        availableSheets = metaData.sheets
          .map((s: any) => s.properties?.title)
          .filter(Boolean);
      }
    }
  } catch (metaErr) {
    console.warn('Failed to query sheet titles:', metaErr);
  }

  // Ensure standard sheets exist if starting fresh
  await ensureRequiredSheetsExist(accessToken, spreadsheetId);

  // Identify sheet names to query
  const prodSheetName =
    availableSheets.find((s) => s === 'المنتجات' || s === 'Products' || s === 'الأسعار' || s === 'الأصناف' || s === 'Sheet1' || s === 'ورقة1') ||
    availableSheets[0] ||
    'المنتجات';

  const invSheetName =
    availableSheets.find((s) => s === 'الفواتير' || s === 'Invoices' || s === 'المبيعات') ||
    'الفواتير';

  const setSheetName =
    availableSheets.find((s) => s === 'الإعدادات' || s === 'Settings' || s === 'الاعدادات') ||
    'الإعدادات';

  const custSheetName =
    availableSheets.find((s) => s === 'العملاء' || s === 'Customers' || s === 'الزبائن') ||
    'العملاء';

  const ranges = [
    `'${prodSheetName}'!A1:Z1500`,
    `'${invSheetName}'!A1:Z2000`,
    `'${setSheetName}'!A1:Z100`,
    `'${custSheetName}'!A1:Z1500`,
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges
    .map(encodeURIComponent)
    .join('&ranges=')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearGoogleSheetsTokenOnly();
      throw new Error('انتهت صلاحية جلسة حساب Google. يرجى تسجيل الدخول مجدداً لتجديد المزامنة.');
    }
    const errText = await res.text();
    throw new Error(`فشل جلب البيانات من Google Sheets: ${errText}`);
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const parsedProducts: Product[] = [];
  const parsedInvoices: Invoice[] = [];
  const parsedSettings: Partial<ShopSettings> = {};
  const parsedCustomers: Customer[] = [];

  // 1. Parse Products
  const prodRows = valueRanges[0]?.values || [];
  if (prodRows.length > 0) {
    // Check if first row is a header
    const firstRow = prodRows[0].map((c: any) => String(c || '').trim().toLowerCase());
    let nameIdx = firstRow.findIndex((c: string) => c.includes('اسم') || c.includes('منتج') || c.includes('صنف') || c.includes('name') || c.includes('item'));
    let priceIdx = firstRow.findIndex((c: string) => c.includes('سعر') || c.includes('price') || c.includes('إفرادي'));
    let unitIdx = firstRow.findIndex((c: string) => c.includes('وحدة') || c.includes('unit'));
    let catIdx = firstRow.findIndex((c: string) => c.includes('تصنيف') || c.includes('قسم') || c.includes('فئة') || c.includes('category'));
    let idIdx = firstRow.findIndex((c: string) => c === 'id' || c === 'رقم' || c === 'كود');
    let imgIdx = firstRow.findIndex((c: string) => c.includes('صورة') || c.includes('image') || c.includes('رابط'));
    let activeIdx = firstRow.findIndex((c: string) => c.includes('مفعل') || c.includes('نشط') || c.includes('active'));

    const hasHeader = nameIdx !== -1 || priceIdx !== -1;
    const startRowIdx = hasHeader ? 1 : 0;

    // Default column mappings if headers were not explicitly matched
    if (nameIdx === -1) nameIdx = 1;
    if (priceIdx === -1) priceIdx = 4;
    if (unitIdx === -1) unitIdx = 3;
    if (catIdx === -1) catIdx = 2;
    if (idIdx === -1) idIdx = 0;
    if (imgIdx === -1) imgIdx = 6;
    if (activeIdx === -1) activeIdx = 5;

    for (let r = startRowIdx; r < prodRows.length; r++) {
      const row = prodRows[r];
      if (!row || row.length === 0) continue;

      let name = String(row[nameIdx] || row[0] || '').trim();
      // If name cell was empty, check adjacent columns
      if (!name || name === 'اسم المنتج' || name === 'ID' || name === 'Product' || name === 'الصنف') {
        continue;
      }

      const unit = String(row[unitIdx] || 'كغ').trim();
      let rawPrice = row[priceIdx] ?? row[3] ?? row[2] ?? '0';
      const parsedNum = parsePriceValue(rawPrice, unit);
      let finalPrice = parsedNum !== null ? parsedNum : 0;

      // If price was 0 or unparsed, try to match default price from catalog
      if (finalPrice <= 0) {
        const catalogMatch = INITIAL_PRODUCTS.find(
          (ip) => ip.name.trim().toLowerCase() === name.toLowerCase()
        );
        if (catalogMatch && catalogMatch.price > 0) {
          finalPrice = catalogMatch.price;
        }
      }

      parsedProducts.push({
        id: String(row[idIdx] || `prod-${Date.now()}-${r}`),
        name: name,
        category: normalizeCategory(row[catIdx]),
        unit: unit || 'كغ',
        price: finalPrice,
        active: row[activeIdx] !== 'لا' && row[activeIdx] !== 'false' && row[activeIdx] !== '0',
        image: String(row[imgIdx] || ''),
      });
    }
  }

  // 2. Parse Invoices
  const invRows = valueRanges[1]?.values || [];
  if (invRows.length > 0) {
    const firstInvRow = invRows[0].map((c: any) => String(c || '').trim().toLowerCase());
    let invIdIdx = firstInvRow.findIndex((c: string) => c.includes('فاتورة') || c === 'id' || c.includes('invoice') || c.includes('رقم'));
    let invDateIdx = firstInvRow.findIndex((c: string) => c.includes('تاريخ') || c.includes('date'));
    let invTimeIdx = firstInvRow.findIndex((c: string) => c.includes('وقت') || c.includes('time'));
    let invCustIdx = firstInvRow.findIndex((c: string) => c.includes('عميل') || c.includes('زبون') || c.includes('مشتري') || c.includes('customer'));
    let invPhoneIdx = firstInvRow.findIndex((c: string) => c.includes('هاتف') || c.includes('موبايل') || c.includes('جوال') || c.includes('phone'));
    let invSubtotalIdx = firstInvRow.findIndex((c: string) => c.includes('فرعي') || c.includes('subtotal') || c.includes('صافي'));
    let invDelIdx = firstInvRow.findIndex((c: string) => c.includes('توصيل') || c.includes('delivery'));
    let invDiscIdx = firstInvRow.findIndex((c: string) => c.includes('خصم') || c.includes('discount'));
    let invTotalIdx = firstInvRow.findIndex((c: string) => c.includes('إجمالي') || c.includes('اجمالي') || c.includes('مجموع') || c.includes('total') || c.includes('مبلغ'));
    let invStatusIdx = firstInvRow.findIndex((c: string) => c.includes('حالة') || c.includes('status'));
    let invNotesIdx = firstInvRow.findIndex((c: string) => c.includes('ملاحظ') || c.includes('note'));
    let invItemsIdx = firstInvRow.findIndex((c: string) => c.includes('أصناف') || c.includes('اصناف') || c.includes('items') || c.includes('تفاصيل'));

    const hasInvHeader = invIdIdx !== -1 || invCustIdx !== -1 || invTotalIdx !== -1 || invDateIdx !== -1;
    const startInvRow = hasInvHeader ? 1 : 0;

    if (invIdIdx === -1) invIdIdx = 0;
    if (invDateIdx === -1) invDateIdx = 1;
    if (invTimeIdx === -1) invTimeIdx = 2;
    if (invCustIdx === -1) invCustIdx = 3;
    if (invPhoneIdx === -1) invPhoneIdx = 4;
    if (invSubtotalIdx === -1) invSubtotalIdx = 5;
    if (invDelIdx === -1) invDelIdx = 6;
    if (invDiscIdx === -1) invDiscIdx = 7;
    if (invTotalIdx === -1) invTotalIdx = 8;
    if (invStatusIdx === -1) invStatusIdx = 9;
    if (invNotesIdx === -1) invNotesIdx = 10;
    if (invItemsIdx === -1) invItemsIdx = 11;

    const parseSheetDate = (val: any): string => {
      if (val === undefined || val === null || val === '') {
        return new Date().toISOString().split('T')[0];
      }
      const num = Number(val);
      if (!isNaN(num) && num > 30000 && num < 70000) {
        try {
          const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
          if (!isNaN(jsDate.getTime())) {
            return jsDate.toISOString().split('T')[0];
          }
        } catch {}
      }
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.slice(0, 10);
      }
      const parts = str.split(/[/\-.]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 1000) {
          const mm = String(p1).padStart(2, '0');
          const dd = String(p2).padStart(2, '0');
          return `${p0}-${mm}-${dd}`;
        } else if (p2 > 1000) {
          const yyyy = p2;
          const mm = String(p1 <= 12 ? p1 : p0).padStart(2, '0');
          const dd = String(p1 <= 12 ? p0 : p1).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }
      return str || new Date().toISOString().split('T')[0];
    };

    const parseSheetTime = (val: any): string => {
      if (val === undefined || val === null || val === '') {
        return new Date().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      const num = Number(val);
      if (!isNaN(num) && num >= 0 && num < 1) {
        try {
          const totalSeconds = Math.round(num * 24 * 3600);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } catch {}
      }
      return String(val).trim();
    };

    for (let i = startInvRow; i < invRows.length; i++) {
      const row = invRows[i];
      if (!row || row.length === 0) continue;

      const rawId = String(row[invIdIdx] || '').trim();
      const rawCust = String(row[invCustIdx] || '').trim();
      const rawTotal = row[invTotalIdx];

      if (rawId === 'رقم الفاتورة' || rawId === 'ID' || rawCust === 'اسم العميل') continue;
      if (!rawId && !rawCust && (rawTotal === undefined || rawTotal === null || rawTotal === '')) continue;

      let items: any[] = [];
      try {
        let foundItems = false;
        // Check designated items column first
        if (invItemsIdx !== -1 && row[invItemsIdx]) {
          const itCell = String(row[invItemsIdx]).trim();
          if (itCell.startsWith('[')) {
            const parsed = JSON.parse(itCell);
            if (Array.isArray(parsed)) {
              items = parsed;
              foundItems = true;
            }
          }
        }
        if (!foundItems) {
          // Scan backwards for JSON array of items
          for (let k = row.length - 1; k >= 0; k--) {
            const cell = row[k];
            if (typeof cell === 'string' && cell.trim().startsWith('[')) {
              try {
                const parsed = JSON.parse(cell);
                if (Array.isArray(parsed)) {
                  items = parsed;
                  foundItems = true;
                  break;
                }
              } catch {}
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse items JSON:', e);
      }

      const generatedId = rawId || `INV-${Date.now().toString().slice(-4)}-${i}`;
      const parsedSub = parseArabicFloat(row[invSubtotalIdx]) || 0;
      const parsedDel = parseArabicFloat(row[invDelIdx]) || 0;
      const parsedDisc = parseArabicFloat(row[invDiscIdx]) || 0;
      const parsedTot = parseArabicFloat(rawTotal) || (parsedSub + parsedDel - parsedDisc) || 0;

      parsedInvoices.push(
        sanitizeInvoice({
          id: generatedId,
          date: parseSheetDate(row[invDateIdx]),
          time: parseSheetTime(row[invTimeIdx]),
          customerName: rawCust || 'زبون عام',
          customerPhone: String(row[invPhoneIdx] || ''),
          subtotal: parsedSub,
          deliveryFee: parsedDel,
          discount: parsedDisc,
          total: parsedTot,
          status: (String(row[invStatusIdx] || '').includes('معلق') || String(row[invStatusIdx] || '') === 'pending') ? 'pending' : 'paid',
          notes: String(row[invNotesIdx] || ''),
          items: items,
        })
      );
    }
  }

  // 3. Parse Customers
  const custRows = valueRanges[3]?.values || [];
  if (custRows.length > 0) {
    const startCustRow = (custRows[0]?.[0] === 'ID' || custRows[0]?.[0] === 'اسم العميل') ? 1 : 0;
    for (let c = startCustRow; c < custRows.length; c++) {
      const row = custRows[c];
      if (row && (row[0] || row[1])) {
        const name = String(row[1] || row[0] || '').trim();
        if (!name || name === 'اسم العميل' || name === 'ID' || name === 'Name') continue;
        parsedCustomers.push({
          id: String(row[0] || `cust-${Date.now()}-${c}`),
          name: name,
          phone: String(row[2] || ''),
          notes: row[3] ? String(row[3]) : undefined,
          address: row[4] ? String(row[4]) : undefined,
          createdAt: String(row[5] || new Date().toISOString().split('T')[0]),
        });
      }
    }
  }

  // 4. Parse Settings
  const setRows = valueRanges[2]?.values || [];
  if (setRows.length > 0) {
    setRows.forEach((row: string[]) => {
      if (row && row[0]) {
        const key = String(row[0]).trim();
        const val = row[1] !== undefined ? String(row[1]).trim() : '';
        if (key === 'اسم المحل' || key === 'shopName') parsedSettings.shopName = val;
        else if (key === 'العنوان الفرعي' || key === 'shopSubtitle') parsedSettings.shopSubtitle = val;
        else if (key === 'الهاتف' || key === 'phone') parsedSettings.phone = val;
        else if (key === 'واتساب' || key === 'whatsapp') parsedSettings.whatsapp = val;
        else if (key === 'العنوان' || key === 'address') parsedSettings.address = val;
        else if (key === 'الشعار/الشعار اللفظي' || key === 'slogan') parsedSettings.slogan = val;
        else if (key === 'رابط اللوجو' || key === 'اللوجو' || key === 'لوجو' || key === 'logoUrl' || key === 'logo' || key === 'صورة اللوجو') parsedSettings.logoUrl = val;
        else if (key === 'عنوان أسعار اليوم' || key === 'todayPricesTitle' || key === 'عنوان نشرة الأسعار' || key === 'نشرة الأسعار') parsedSettings.todayPricesTitle = val;
        else if (key === 'بداية أرقام الفواتير' || key === 'startingInvoiceNumber') parsedSettings.startingInvoiceNumber = parseInt(val, 10) || 1;
        else if (key === 'العملة' || key === 'currency') parsedSettings.currency = val;
        else if (key === 'الخانة العشرية' || key === 'decimalPlaces') parsedSettings.decimalPlaces = parseInt(val, 10) || 2;
        else if (key === 'خدمة التوصيل' || key === 'deliveryAvailable') parsedSettings.deliveryAvailable = val === 'نعم' || val === 'true';
      }
    });
  }

  return {
    products: parsedProducts.length > 0 ? parsedProducts : undefined,
    invoices: parsedInvoices.length > 0 ? parsedInvoices : undefined,
    settings: Object.keys(parsedSettings).length > 0 ? parsedSettings : undefined,
    customers: parsedCustomers.length > 0 ? parsedCustomers : undefined,
    stats: {
      productsCount: parsedProducts.length,
      invoicesCount: parsedInvoices.length,
      customersCount: parsedCustomers.length,
    },
  };
};

/**
 * Standard Apps Script Template code for 1-click deployment
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ----------------------------------------------------
// كود تشغيل ومزامنة قاعدة بيانات محل الخضار والفواكه على Google Sheets
// ----------------------------------------------------
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var data = postData.data;

    var prodSheet = ss.getSheetByName("المنتجات") || ss.insertSheet("المنتجات");
    var invSheet = ss.getSheetByName("الفواتير") || ss.insertSheet("الفواتير");
    var setSheet = ss.getSheetByName("الإعدادات") || ss.insertSheet("الإعدادات");
    var custSheet = ss.getSheetByName("العملاء") || ss.insertSheet("العملاء");

    if (action === "save_invoice") {
      var itemsStr = Array.isArray(data.items)
        ? data.items.map(function(it) { return (it.productName || (it.product && it.product.name) || 'صنف') + ' (' + it.quantity + ' x ' + it.unitPrice + ') = ' + it.total; }).join(' | ')
        : '';
      var row = [
        data.id, data.date, data.time, data.customerName || "عميل عام",
        data.customerPhone || "", data.subtotal, data.deliveryFee || 0, data.discount || 0, data.total,
        data.paymentMethod === "card" ? "بطاقة" : data.paymentMethod === "debt" ? "دين" : "نقدي",
        data.status === "paid" ? "مدفوع" : "غير مدفوع", data.notes || "",
        itemsStr, JSON.stringify(data.items || [])
      ];

      var values = invSheet.getDataRange().getValues();
      var foundRowIndex = -1;
      for (var r = 1; r < values.length; r++) {
        if (String(values[r][0]) === String(data.id)) {
          foundRowIndex = r + 1;
          break;
        }
      }

      if (foundRowIndex > -1) {
        invSheet.getRange(foundRowIndex, 1, 1, row.length).setValues([row]);
      } else {
        invSheet.appendRow(row);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_invoices") {
      invSheet.clear();
      invSheet.appendRow(["رقم الفاتورة", "التاريخ", "الوقت", "اسم العميل", "هاتف العميل", "المجموع الفرعي", "رسوم التوصيل", "الخصم", "المجموع الكلي", "طريقة الدفع", "الحالة", "ملاحظات", "الأصناف النصية", "تفاصيل_المبيعات_JSON"]);
      var invList = Array.isArray(data) ? data : (data.invoices || []);
      var iRows = invList.map(function(inv) {
        var itemsStr = Array.isArray(inv.items)
          ? inv.items.map(function(it) { return (it.productName || (it.product && it.product.name) || 'صنف') + ' (' + it.quantity + ' x ' + it.unitPrice + ') = ' + it.total; }).join(' | ')
          : '';
        return [
          inv.id, inv.date, inv.time, inv.customerName || "عميل عام", inv.customerPhone || "",
          inv.subtotal, inv.deliveryFee || 0, inv.discount || 0, inv.total,
          inv.paymentMethod === "card" ? "بطاقة" : inv.paymentMethod === "debt" ? "دين" : "نقدي",
          inv.status === "paid" ? "مدفوع" : "غير مدفوع", inv.notes || "",
          itemsStr, JSON.stringify(inv.items || [])
        ];
      });
      if (iRows.length > 0) {
        invSheet.getRange(2, 1, iRows.length, 14).setValues(iRows);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_customers") {
      custSheet.clear();
      custSheet.appendRow(["ID", "اسم العميل", "رقم الهاتف", "ملاحظات", "العنوان", "تاريخ الإضافة"]);
      var cList = Array.isArray(data) ? data : (data.customers || []);
      var cRows = cList.map(function(c) {
        return [c.id, c.name, c.phone || "", c.notes || "", c.address || "", c.createdAt || ""];
      });
      if (cRows.length > 0) {
        custSheet.getRange(2, 1, cRows.length, 6).setValues(cRows);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_settings") {
      setSheet.clear();
      setSheet.appendRow(["خاصية", "القيمة"]);
      var sRows = [
        ["اسم المحل", data.shopName || ""],
        ["العنوان الفرعي", data.shopSubtitle || ""],
        ["الهاتف", data.phone || ""],
        ["واتساب", data.whatsapp || ""],
        ["العنوان", data.address || ""],
        ["الشعار/الشعار اللفظي", data.slogan || ""],
        ["رابط اللوجو", data.logoUrl || ""],
        ["عنوان أسعار اليوم", data.todayPricesTitle || "أسعار اليوم"],
        ["بداية أرقام الفواتير", data.startingInvoiceNumber || 1000],
        ["العملة", data.currency || "د.أ"],
        ["الخانة العشرية", data.decimalPlaces || 2],
        ["خدمة التوصيل", data.deliveryAvailable ? "نعم" : "لا"],
        ["رسالة الفاتورة", data.footerMessage || ""],
        ["ملاحظة مطبوعة", data.invoiceNote || ""]
      ];
      setSheet.getRange(2, 1, sRows.length, 2).setValues(sRows);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "delete_invoice") {
      var invId = String(data.id || data);
      var values = invSheet.getDataRange().getValues();
      for (var r = values.length - 1; r >= 1; r--) {
        if (String(values[r][0]) === invId) {
          invSheet.deleteRow(r + 1);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_products" || action === "sync_all") {
      var prodList = Array.isArray(data) ? data : (data.products || []);
      if (prodList.length > 0 || (data && data.products)) {
        prodSheet.clear();
        prodSheet.appendRow(["المعرف", "اسم المنتج", "الفئة", "السعر", "الوحدة", "نشط", "الصورة"]);
        var pRows = prodList.map(function(p) {
          return [p.id, p.name, p.category, p.price, p.unit || "كغ", p.active ? "نعم" : "لا", p.image || ""];
        });
        if (pRows.length > 0) {
          prodSheet.getRange(2, 1, pRows.length, 7).setValues(pRows);
        }
      }

      if (action === "sync_all" && data.invoices) {
        invSheet.clear();
        invSheet.appendRow(["رقم الفاتورة", "التاريخ", "الوقت", "اسم العميل", "هاتف العميل", "المجموع الفرعي", "رسوم التوصيل", "الخصم", "المجموع الكلي", "طريقة الدفع", "الحالة", "ملاحظات", "الأصناف النصية", "تفاصيل_المبيعات_JSON"]);
        var iAllRows = data.invoices.map(function(inv) {
          var itemsStr = Array.isArray(inv.items)
            ? inv.items.map(function(it) { return (it.productName || (it.product && it.product.name) || 'صنف') + ' (' + it.quantity + ' x ' + it.unitPrice + ') = ' + it.total; }).join(' | ')
            : '';
          return [
            inv.id, inv.date, inv.time, inv.customerName || "عميل عام", inv.customerPhone || "",
            inv.subtotal, inv.deliveryFee || 0, inv.discount || 0, inv.total,
            inv.paymentMethod === "card" ? "بطاقة" : inv.paymentMethod === "debt" ? "دين" : "نقدي",
            inv.status === "paid" ? "مدفوع" : "غير مدفوع", inv.notes || "",
            itemsStr, JSON.stringify(inv.items || [])
          ];
        });
        if (iAllRows.length > 0) {
          invSheet.getRange(2, 1, iAllRows.length, 14).setValues(iAllRows);
        }
      }

      if (action === "sync_all" && data.customers) {
        custSheet.clear();
        custSheet.appendRow(["ID", "اسم العميل", "رقم الهاتف", "ملاحظات", "العنوان", "تاريخ الإضافة"]);
        var cAllRows = data.customers.map(function(c) {
          return [c.id, c.name, c.phone || "", c.notes || "", c.address || "", c.createdAt || ""];
        });
        if (cAllRows.length > 0) {
          custSheet.getRange(2, 1, cAllRows.length, 6).setValues(cAllRows);
        }
      }

      if (action === "sync_all" && data.settings) {
        setSheet.clear();
        setSheet.appendRow(["خاصية", "القيمة"]);
        var sRows = [
          ["اسم المحل", data.settings.shopName || ""],
          ["العنوان الفرعي", data.settings.shopSubtitle || ""],
          ["الهاتف", data.settings.phone || ""],
          ["واتساب", data.settings.whatsapp || ""],
          ["العنوان", data.settings.address || ""],
          ["الشعار/الشعار اللفظي", data.settings.slogan || ""],
          ["رابط اللوجو", data.settings.logoUrl || ""],
          ["عنوان أسعار اليوم", data.settings.todayPricesTitle || "أسعار اليوم"],
          ["بداية أرقام الفواتير", data.settings.startingInvoiceNumber || 1000],
          ["العملة", data.settings.currency || "د.أ"],
          ["الخانة العشرية", data.settings.decimalPlaces || 2],
          ["خدمة التوصيل", data.settings.deliveryAvailable ? "نعم" : "لا"],
          ["رسالة الفاتورة", data.settings.footerMessage || ""],
          ["ملاحظة مطبوعة", data.settings.invoiceNote || ""]
        ];
        setSheet.getRange(2, 1, sRows.length, 2).setValues(sRows);
      }

      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({status: "ok"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var prodSheet = ss.getSheetByName("المنتجات");
    var invSheet = ss.getSheetByName("الفواتير");
    var custSheet = ss.getSheetByName("العملاء");
    var setSheet = ss.getSheetByName("الإعدادات");

    var products = [];
    var invoices = [];
    var customers = [];
    var settings = {};

    function asCleanDate(val) {
      if (!val) return "";
      if (val instanceof Date) {
        var y = val.getFullYear();
        var m = ("0" + (val.getMonth() + 1)).slice(-2);
        var d = ("0" + val.getDate()).slice(-2);
        return y + "-" + m + "-" + d;
      }
      var s = String(val).trim();
      if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s;
      try {
        var parsed = new Date(s);
        if (!isNaN(parsed.getTime())) {
          var y2 = parsed.getFullYear();
          var m2 = ("0" + (parsed.getMonth() + 1)).slice(-2);
          var d2 = ("0" + parsed.getDate()).slice(-2);
          return y2 + "-" + m2 + "-" + d2;
        }
      } catch(e) {}
      return s;
    }

    if (prodSheet && prodSheet.getLastRow() > 1) {
      var pData = prodSheet.getRange(2, 1, prodSheet.getLastRow() - 1, 7).getValues();
      for (var i = 0; i < pData.length; i++) {
        var r = pData[i];
        if (r[0] && r[1]) {
          var priceVal = Number(String(r[3]).replace(/,/g, '.').replace(/٫/g, '.')) || 0;
          products.push({
            id: String(r[0]), name: String(r[1]), category: String(r[2] || "vegetables"),
            price: priceVal, unit: String(r[4] || "كغ"),
            active: r[5] !== "لا" && r[5] !== false && r[5] !== "false", image: String(r[6] || "")
          });
        }
      }
    }

    if (invSheet && invSheet.getLastRow() > 1) {
      var iData = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, 14).getValues();
      for (var j = 0; j < iData.length; j++) {
        var row = iData[j];
        if (row[0] && row[1]) {
          var items = [];
          try {
            var jsonCol = row[13] || row[12];
            if (jsonCol) {
              var rawItems = JSON.parse(jsonCol);
              if (Array.isArray(rawItems)) {
                items = rawItems.map(function(it) {
                  var q = Number(it.quantity) || 0;
                  var p = Number(it.unitPrice || it.price) || 0;
                  return {
                    productId: String(it.productId || it.id || ""),
                    productName: String(it.productName || it.name || ""),
                    category: it.category || "vegetables",
                    image: it.image || "",
                    unit: String(it.unit || "كغ"),
                    quantity: q,
                    unitPrice: p,
                    total: Number(it.total) || Math.round(q * p * 100) / 100
                  };
                });
              }
            }
          } catch(e){}
          var sub = Number(row[5]) || 0;
          var del = Number(row[6]) || 0;
          var disc = Number(row[7]) || 0;
          var tot = Number(row[8]) || (sub + del - disc);
          var pMethStr = String(row[9] || '');
          var pMeth = pMethStr === 'بطاقة' ? 'card' : pMethStr === 'دين' ? 'debt' : 'cash';
          var stStr = String(row[10] || '');
          var st = stStr.includes('غير') ? 'unpaid' : stStr.includes('مدفوع') ? 'paid' : 'pending';

          invoices.push({
            id: String(row[0]), date: asCleanDate(row[1]), time: String(row[2]),
            customerName: String(row[3] || 'عميل عام'), customerPhone: String(row[4] || ''),
            subtotal: sub, deliveryFee: del, discount: disc, total: tot,
            paymentMethod: pMeth, status: st, notes: String(row[11] || ''),
            items: items
          });
        }
      }
    }

    if (custSheet && custSheet.getLastRow() > 1) {
      var cData = custSheet.getRange(2, 1, custSheet.getLastRow() - 1, 6).getValues();
      for (var k = 0; k < cData.length; k++) {
        var cr = cData[k];
        if (cr[1] && cr[1] !== "اسم العميل") {
          customers.push({
            id: String(cr[0] || ("cust-" + k)), name: String(cr[1]),
            phone: String(cr[2] || ""), notes: String(cr[3] || ""),
            address: String(cr[4] || ""), createdAt: String(cr[5] || "")
          });
        }
      }
    }

    if (setSheet && setSheet.getLastRow() > 0) {
      var sData = setSheet.getRange(1, 1, setSheet.getLastRow(), 2).getValues();
      for (var s = 0; s < sData.length; s++) {
        var sr = sData[s];
        if (!sr || sr.length < 2) continue;
        var kStr = String(sr[0]).trim();
        var vStr = String(sr[1]).trim();
        if (kStr.includes("اسم المحل")) settings.shopName = vStr;
        else if (kStr.includes("العنوان الفرعي")) settings.shopSubtitle = vStr;
        else if (kStr.includes("الهاتف")) settings.phone = vStr;
        else if (kStr.includes("واتساب")) settings.whatsapp = vStr;
        else if (kStr.includes("العنوان") && !kStr.includes("الفرعي")) settings.address = vStr;
        else if (kStr.includes("الشعار")) settings.slogan = vStr;
        else if (kStr.includes("لوجو")) settings.logoUrl = vStr;
        else if (kStr.includes("أسعار اليوم")) settings.todayPricesTitle = vStr;
        else if (kStr.includes("بداية أرقام الفواتير")) settings.startingInvoiceNumber = parseInt(vStr) || 1000;
        else if (kStr.includes("العملة")) settings.currency = vStr;
        else if (kStr.includes("الخانة العشرية")) settings.decimalPlaces = parseInt(vStr) || 2;
        else if (kStr.includes("التوصيل")) settings.deliveryAvailable = vStr.includes("نعم") || vStr.includes("true");
        else if (kStr.includes("رسالة الفاتورة")) settings.footerMessage = vStr;
        else if (kStr.includes("ملاحظة مطبوعة")) settings.invoiceNote = vStr;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      products: products,
      invoices: invoices,
      customers: customers,
      settings: settings
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
