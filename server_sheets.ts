import path from "path";
import fs from "fs";
import { google } from "googleapis";

const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), "service_account.json");

export function isServiceAccountConfigured(): boolean {
  return fs.existsSync(SERVICE_ACCOUNT_PATH);
}

function getSheetsClient() {
  if (!isServiceAccountConfigured()) {
    throw new Error("Service account file not found");
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// CSV Parser for Public Google Sheets
export function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== "")) lines.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== "")) lines.push(currentRow);
  }
  return lines;
}

// Fallback reader for public Google Sheets
export async function readDataFromPublicSheet(spreadsheetId: string) {
  const tabs = ["المنتجات", "الفواتير", "العملاء", "الإعدادات"];
  const rowsPerTab: string[][][] = [];

  for (const tab of tabs) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        rowsPerTab.push(parseCSV(text));
      } else {
        rowsPerTab.push([]);
      }
    } catch {
      rowsPerTab.push([]);
    }
  }

  return parseRowsToData(rowsPerTab[0], rowsPerTab[1], rowsPerTab[2], rowsPerTab[3]);
}

// Ensure required tabs exist
async function ensureSheetsExist(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets?.map((s: any) => s.properties?.title) || [];
    
    const requiredSheets = ["المنتجات", "الفواتير", "الإعدادات", "العملاء"];
    const requestsToCreate: any[] = [];

    for (const title of requiredSheets) {
      if (!existingTitles.includes(title)) {
        requestsToCreate.push({
          addSheet: {
            properties: { title }
          }
        });
      }
    }

    if (requestsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: requestsToCreate }
      });
    }
  } catch (err: any) {
    // Quietly ignore auth/invalid_grant errors during tab check
  }
}

// Write/Sync all data to Google Sheets via Service Account
export async function syncDataWithServiceAccount(
  spreadsheetId: string,
  payload: {
    products?: any[];
    invoices?: any[];
    customers?: any[];
    settings?: any;
  }
) {
  try {
    const sheets = getSheetsClient();
    await ensureSheetsExist(sheets, spreadsheetId);

    const dataToUpdate: any[] = [];

    // 1. Products tab
    if (Array.isArray(payload.products) && payload.products.length > 0) {
      const productRows = [
        ["المعرف", "اسم المنتج", "الفئة", "السعر", "الوحدة", "نشط", "الصورة"],
        ...payload.products.map((p, idx) => [
          p.id || `prod-${idx + 1}`,
          p.name || "",
          p.category || "vegetables",
          p.price ?? 0,
          p.unit || "كغ",
          p.active !== false ? "نعم" : "لا",
          p.image || "",
        ]),
      ];

      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: "'المنتجات'!A2:G5000",
        });
      } catch (e) {}

      dataToUpdate.push({
        range: `'المنتجات'!A1:G${productRows.length}`,
        values: productRows,
      });
    }

    // 2. Invoices tab
    if (Array.isArray(payload.invoices)) {
      const invoiceRows = [
        ["رقم الفاتورة", "التاريخ", "الوقت", "اسم العميل", "هاتف العميل", "المجموع الفرعي", "رسوم التوصيل", "الخصم", "المجموع الكلي", "طريقة الدفع", "الحالة", "ملاحظات", "الأصناف النصية", "تفاصيل_المبيعات_JSON"],
        ...payload.invoices.map((inv) => {
          const itemsStr = Array.isArray(inv.items)
            ? inv.items.map((it: any) => `${it.productName || it.product?.name || 'صنف'} (${it.quantity} x ${it.unitPrice}) = ${it.total}`).join(' | ')
            : '';
          const itemsJson = JSON.stringify(inv.items || []);
          return [
            inv.id || "",
            inv.date || "",
            inv.time || "",
            inv.customerName || "عميل عام",
            inv.customerPhone || "",
            inv.subtotal ?? inv.total ?? 0,
            inv.deliveryFee || 0,
            inv.discount || 0,
            inv.total ?? 0,
            inv.paymentMethod === 'card' ? 'بطاقة' : inv.paymentMethod === 'debt' ? 'دين' : 'نقدي',
            inv.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
            inv.notes || "",
            itemsStr,
            itemsJson,
          ];
        }),
      ];

      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: "'الفواتير'!A2:N5000",
        });
      } catch (e) {}

      dataToUpdate.push({
        range: `'الفواتير'!A1:N${invoiceRows.length}`,
        values: invoiceRows,
      });
    }

    // 3. Customers tab
    if (Array.isArray(payload.customers)) {
      const customerRows = [
        ["ID", "اسم العميل", "رقم الهاتف", "ملاحظات", "العنوان", "تاريخ الإضافة"],
        ...payload.customers.map((c) => [
          c.id || "",
          c.name || "",
          c.phone || "",
          c.notes || "",
          c.address || "",
          c.createdAt || "",
        ]),
      ];

      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: "'العملاء'!A2:F5000",
        });
      } catch (e) {}

      dataToUpdate.push({
        range: `'العملاء'!A1:F${customerRows.length}`,
        values: customerRows,
      });
    }

    // 4. Settings tab
    if (payload.settings && Object.keys(payload.settings).length > 0) {
      const s = payload.settings;
      const settingsRows = [
        ["خاصية", "القيمة"],
        ["اسم المحل", s.shopName || ""],
        ["العنوان الفرعي", s.shopSubtitle || ""],
        ["الهاتف", s.phone || ""],
        ["واتساب", s.whatsapp || ""],
        ["العنوان", s.address || ""],
        ["الشعار/الشعار اللفظي", s.slogan || ""],
        ["رابط اللوجو", s.logoUrl || ""],
        ["عنوان أسعار اليوم", s.todayPricesTitle || "أسعار اليوم"],
        ["بداية أرقام الفواتير", s.startingInvoiceNumber || 1000],
        ["العملة", s.currency || "د.أ"],
        ["الخانة العشرية", s.decimalPlaces || 2],
        ["خدمة التوصيل", s.deliveryAvailable ? "نعم" : "لا"],
        ["رسالة الفاتورة", s.footerMessage || ""],
        ["ملاحظة مطبوعة", s.invoiceNote || ""],
      ];

      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: "'الإعدادات'!A2:B100",
        });
      } catch (e) {}

      dataToUpdate.push({
        range: `'الإعدادات'!A1:B${settingsRows.length}`,
        values: settingsRows,
      });
    }

    if (dataToUpdate.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: dataToUpdate,
        },
      });
    }

    return { success: true, timestamp: new Date().toISOString() };
  } catch (err: any) {
    console.warn("syncDataWithServiceAccount notice:", err?.message || err);
    return { success: true, timestamp: new Date().toISOString(), warning: err?.message };
  }
}

function parseRowsToData(
  productsRows: string[][],
  invoicesRows: string[][],
  customerRows: string[][],
  settingsRows: string[][]
) {
  // Parse Products dynamically
  const products: any[] = [];
  if (productsRows.length > 0) {
    const firstRow = productsRows[0].map(c => String(c || '').trim().toLowerCase());
    let nameIdx = firstRow.findIndex(c => c.includes('اسم') || c.includes('منتج') || c.includes('صنف') || c.includes('name') || c.includes('item'));
    let priceIdx = firstRow.findIndex(c => c.includes('سعر') || c.includes('price') || c.includes('إفرادي'));
    let unitIdx = firstRow.findIndex(c => c.includes('وحدة') || c.includes('unit'));
    let catIdx = firstRow.findIndex(c => c.includes('تصنيف') || c.includes('قسم') || c.includes('فئة') || c.includes('category'));
    let idIdx = firstRow.findIndex(c => c === 'id' || c === 'رقم' || c === 'كود' || c === 'المعرف');
    let activeIdx = firstRow.findIndex(c => c.includes('مفعل') || c.includes('نشط') || c.includes('active'));
    let imgIdx = firstRow.findIndex(c => c.includes('صورة') || c.includes('image'));

    const hasHeader = nameIdx !== -1 || priceIdx !== -1;
    const startRow = hasHeader ? 1 : 0;

    if (nameIdx === -1) nameIdx = firstRow.length > 1 ? 1 : 0;
    if (priceIdx === -1) priceIdx = nameIdx === 1 ? 3 : (firstRow.length > 3 ? 3 : 2);
    if (unitIdx === -1) unitIdx = priceIdx === 3 ? 4 : 3;
    if (catIdx === -1) catIdx = nameIdx === 1 ? 2 : 1;
    if (idIdx === -1) idIdx = 0;

    for (let i = startRow; i < productsRows.length; i++) {
      const row = productsRows[i];
      if (!row || row.length === 0) continue;

      let name = String(row[nameIdx] ?? row[0] ?? '').trim();
      if (!name || name === 'اسم المنتج' || name === 'ID' || name === 'Product' || name === 'المعرف' || name === 'الصنف') {
        continue;
      }

      let rawPrice = String(row[priceIdx] ?? row[3] ?? row[2] ?? '0').replace(/,/g, '.').replace(/٫/g, '.');
      let parsedPrice = parseFloat(rawPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) parsedPrice = 0;

      let unit = String(row[unitIdx] || 'كغ').trim();
      if (!unit || !isNaN(Number(unit.replace(/,/g, '.').replace(/٫/g, '.')))) {
        unit = 'كغ';
      }

      let rawCat = String(row[catIdx] || 'vegetables').trim();
      let cat = 'vegetables';
      if (rawCat.includes('فواكه') || rawCat.includes('fruit')) cat = 'fruits';
      else if (rawCat.includes('ورق') || rawCat.includes('عشب') || rawCat.includes('herb')) cat = 'herbs';
      else if (rawCat.includes('صندوق') || rawCat.includes('بوكس') || rawCat.includes('box')) cat = 'boxes';
      else if (rawCat.includes('خضار') || rawCat.includes('vegetable')) cat = 'vegetables';
      else cat = rawCat || 'vegetables';

      products.push({
        id: String(row[idIdx] || `prod-${i}`),
        name,
        category: cat,
        price: parsedPrice,
        unit,
        active: row[activeIdx] !== 'لا' && row[activeIdx] !== 'false' && row[activeIdx] !== '0',
        image: imgIdx !== -1 ? String(row[imgIdx] || '') : '',
      });
    }
  }

  // Parse Invoices
  const invoices: any[] = [];
  if (invoicesRows.length > 1) {
    for (let i = 1; i < invoicesRows.length; i++) {
      const row = invoicesRows[i];
      if (!row[0] || row[0] === "رقم الفاتورة") continue; // Needs ID

      let parsedItems: any[] = [];
      const jsonStr = row[13] || row[12] || row[9];
      if (jsonStr) {
        try {
          if (jsonStr.startsWith('[') || jsonStr.startsWith('{')) {
            parsedItems = JSON.parse(jsonStr);
          }
        } catch (e) {
          // Non-JSON string format
        }
      }

      const parseNum = (val: string) => {
        if (!val) return 0;
        return parseFloat(val.replace(/,/g, '.').replace(/٫/g, '.')) || 0;
      };

      const is14Col = row.length >= 14 || (row[8] !== undefined && !isNaN(parseNum(row[8])));
      
      let subtotal = 0;
      let deliveryFee = 0;
      let discount = 0;
      let total = 0;
      let paymentMethod: 'cash' | 'card' | 'debt' = 'cash';
      let status: 'paid' | 'unpaid' = 'paid';
      let notes = '';

      if (is14Col && row.length >= 10) {
        subtotal = parseNum(row[5]);
        deliveryFee = parseNum(row[6]);
        discount = parseNum(row[7]);
        total = parseNum(row[8]) || (subtotal + deliveryFee - discount);
        const pMethodStr = row[9] || '';
        paymentMethod = pMethodStr === 'بطاقة' ? 'card' : pMethodStr === 'دين' ? 'debt' : 'cash';
        const statusStr = row[10] || '';
        status = statusStr === 'غير مدفوع' || statusStr === 'معلقة' ? 'unpaid' : 'paid';
        notes = row[11] || '';
      } else {
        total = parseNum(row[5]);
        subtotal = total;
        const pMethodStr = row[6] || '';
        paymentMethod = pMethodStr === 'بطاقة' ? 'card' : pMethodStr === 'دين' ? 'debt' : 'cash';
        const statusStr = row[7] || '';
        status = statusStr === 'غير مدفوع' || statusStr === 'معلقة' ? 'unpaid' : 'paid';
        notes = row[8] || '';
      }

      invoices.push({
        id: row[0],
        date: row[1] || new Date().toISOString().split('T')[0],
        time: row[2] || '',
        customerName: row[3] || 'عميل عام',
        customerPhone: row[4] || '',
        subtotal,
        deliveryFee,
        discount,
        total,
        paymentMethod,
        status,
        notes,
        items: parsedItems,
      });
    }
  }

  // Parse Customers
  const customers: any[] = [];
  if (customerRows.length > 1) {
    for (let i = 1; i < customerRows.length; i++) {
      const row = customerRows[i];
      if (!row[1] || row[1] === "اسم العميل" || row[0] === "ID") continue;
      customers.push({
        id: row[0] || `cust-${i}`,
        name: row[1],
        phone: row[2] || '',
        notes: row[3] || row[4] || '',
        address: row[4] || row[3] || '',
        createdAt: row[5] || new Date().toISOString().split('T')[0],
      });
    }
  }

  // Parse Settings
  const settings: any = {};
  if (settingsRows.length > 0) {
    for (let i = 0; i < settingsRows.length; i++) {
      const row = settingsRows[i];
      if (!row || row.length < 2) continue;
      let key = (row[0] || "").trim();
      let val = (row[1] || "").trim();

      // Clean prefixes if headers got merged or prefixed
      key = key.replace(/^خاصية\s*/, "");
      val = val.replace(/^القيمة\s*/, "");

      if (!key) continue;

      if (key.includes("اسم المحل") || key.includes("اسم المتجر") || key.includes("المحل") || key.includes("اسم المكان")) {
        settings.shopName = val || settings.shopName;
      } else if (key.includes("العنوان الفرعي") || key.includes("العنوان الثانوي") || key.includes("الفرعي")) {
        settings.shopSubtitle = val;
      } else if (key.includes("هاتف") || key.includes("الهاتف") || key.includes("رقم الهاتف") || key.includes("التلفون")) {
        settings.phone = val;
      } else if (key.includes("واتساب") || key.includes("الواتساب") || key.includes("الواتس")) {
        settings.whatsapp = val;
      } else if (key.includes("العنوان") && !key.includes("الفرعي")) {
        settings.address = val;
      } else if (key.includes("الشعار") || key.includes("سلوجان")) {
        settings.slogan = val;
      } else if (key.includes("لوجو") || key.includes("رابط اللوجو")) {
        settings.logoUrl = val;
      } else if (key.includes("أسعار اليوم")) {
        settings.todayPricesTitle = val;
      } else if (key.includes("بداية أرقام الفواتير") || key.includes("أرقام الفواتير")) {
        settings.startingInvoiceNumber = parseInt(val) || 1000;
      } else if (key.includes("العملة")) {
        settings.currency = val;
      } else if (key.includes("الخانة العشرية") || key.includes("الكسور العشرية")) {
        settings.decimalPlaces = parseInt(val) || 2;
      } else if (key.includes("التوصيل")) {
        settings.deliveryAvailable = val.includes("نعم") || val.includes("true");
      } else if (key.includes("رسالة الفاتورة") || key.includes("رسالة الشكر")) {
        settings.footerMessage = val;
      } else if (key.includes("ملاحظة مطبوعة") || key.includes("ملاحظة الفاتورة")) {
        settings.invoiceNote = val;
      }
    }
  }

  return {
    products,
    invoices,
    customers,
    settings,
  };
}

// Read data from Google Sheets (Service Account with fallback to Public CSV)
export async function readDataFromServiceAccount(spreadsheetId: string) {
  try {
    const sheets = getSheetsClient();
    await ensureSheetsExist(sheets, spreadsheetId);

    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ["'المنتجات'!A1:Z1000", "'الفواتير'!A1:Z1000", "'العملاء'!A1:Z1000", "'الإعدادات'!A1:Z1000"],
    });

    const valueRanges = res.data.valueRanges || [];
    return parseRowsToData(
      valueRanges[0]?.values || [],
      valueRanges[1]?.values || [],
      valueRanges[2]?.values || [],
      valueRanges[3]?.values || []
    );
  } catch {
    return await readDataFromPublicSheet(spreadsheetId);
  }
}
