import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import {
  isServiceAccountConfigured,
  syncDataWithServiceAccount,
  readDataFromServiceAccount,
  readDataFromPublicSheet,
} from "./server_sheets";

const DEFAULT_SHEET_ID = "14qjdmnsG-ThVt5FCeKn36GFBtJWThNernl7qX7CZbVY";
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/14qjdmnsG-ThVt5FCeKn36GFBtJWThNernl7qX7CZbVY/edit?usp=sharing";
const SERVICE_ACCOUNT_EMAIL = "khdar-345@gen-lang-client-0480470455.iam.gserviceaccount.com";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  const CONFIG_FILE_PATH = path.join(process.cwd(), "sheets_config.json");
  const DATA_STORE_PATH = path.join(process.cwd(), "data_store.json");

  function getStoredServerData() {
    try {
      if (fs.existsSync(DATA_STORE_PATH)) {
        const content = fs.readFileSync(DATA_STORE_PATH, "utf8");
        return JSON.parse(content);
      }
    } catch (err) {
      console.error("Error reading data_store.json", err);
    }
    return { products: [], invoices: [], customers: [], settings: {} };
  }

  function saveStoredServerData(newData: any) {
    try {
      const current = getStoredServerData();
      const updated = {
        products: newData.products !== undefined ? newData.products : (current.products || []),
        invoices: newData.invoices !== undefined ? newData.invoices : (current.invoices || []),
        customers: newData.customers !== undefined ? newData.customers : (current.customers || []),
        settings: { ...(current.settings || {}), ...(newData.settings || {}) },
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(updated, null, 2), "utf8");
      return updated;
    } catch (err) {
      console.error("Error writing data_store.json", err);
    }
  }

  // API Route to GET Google Sheets Config (Loaded by any device on startup)
  app.get("/api/sheets-config", (req, res) => {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const data = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
        const parsed = JSON.parse(data);
        return res.json({
          webhookUrl: parsed.webhookUrl || "",
          sheetId: parsed.sheetId || DEFAULT_SHEET_ID,
          sheetUrl: parsed.sheetUrl || DEFAULT_SHEET_URL,
          serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
          isServiceAccountActive: isServiceAccountConfigured(),
        });
      }
    } catch (err) {
      console.error("Error reading sheets_config.json", err);
    }
    return res.json({
      webhookUrl: "",
      sheetId: DEFAULT_SHEET_ID,
      sheetUrl: DEFAULT_SHEET_URL,
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
      isServiceAccountActive: isServiceAccountConfigured(),
    });
  });

  // API Route to SAVE Google Sheets Config
  app.post("/api/sheets-config", (req, res) => {
    try {
      const { webhookUrl, sheetId, sheetUrl } = req.body;
      const config = {
        webhookUrl: webhookUrl || "",
        sheetId: sheetId || DEFAULT_SHEET_ID,
        sheetUrl: sheetUrl || DEFAULT_SHEET_URL,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf8");
      return res.json({ status: "success", config });
    } catch (err: any) {
      console.error("Error saving sheets_config.json", err);
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Service Account Status Check
  app.get("/api/service-account/status", (req, res) => {
    return res.json({
      configured: isServiceAccountConfigured(),
      email: SERVICE_ACCOUNT_EMAIL,
      defaultSheetId: DEFAULT_SHEET_ID,
    });
  });

  // Service Account Auto-Sync (Backend connects to Google Sheets directly with Service Account token or Webhook)
  app.post("/api/service-account/sync", async (req, res) => {
    try {
      const { sheetId, products, invoices, customers, settings } = req.body;
      const targetSheetId = sheetId || DEFAULT_SHEET_ID;

      // 1. Persist data into server memory/JSON
      const existing = getStoredServerData();
      saveStoredServerData({
        products: Array.isArray(products) ? products : existing.products,
        invoices: Array.isArray(invoices) ? invoices : existing.invoices,
        customers: Array.isArray(customers) ? customers : existing.customers,
        settings: settings && Object.keys(settings).length > 0 ? { ...existing.settings, ...settings } : existing.settings,
      });

      // 2. Attempt Google Sheets direct write via Service Account
      let saResult = null;
      try {
        saResult = await syncDataWithServiceAccount(targetSheetId, {
          products,
          invoices,
          customers,
          settings,
        });
      } catch (saErr: any) {
        console.warn("Service Account sync warning:", saErr?.message || saErr);
      }

      // 3. Attempt Google Sheets write via Webhook if configured in sheets_config.json
      let webhookSynced = false;
      try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
          const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
          if (cfg.webhookUrl && cfg.webhookUrl.trim()) {
            const whRes = await fetch(cfg.webhookUrl.trim(), {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                action: "sync_all",
                data: { products, invoices, customers, settings },
              }),
            });
            webhookSynced = whRes.ok;
          }
        }
      } catch (whErr: any) {
        console.warn("Server webhook sync notice:", whErr?.message || whErr);
      }

      const saSynced = saResult !== null && (saResult as any)?.success === true;

      return res.json({
        status: "success",
        saSynced,
        webhookSynced,
        saResult,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        message: err?.message || "Failed to sync",
      });
    }
  });

  // Service Account / Public Sheet Fetch Data
  app.get("/api/service-account/read", async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || DEFAULT_SHEET_ID;
      
      let sheetData: any = { products: [], invoices: [], customers: [], settings: {} };
      
      // 1. Try public CSV reader (works for public sheets without API keys)
      try {
        const publicData = await readDataFromPublicSheet(sheetId);
        if (publicData) {
          if (publicData.products?.length) sheetData.products = publicData.products;
          if (publicData.invoices?.length) sheetData.invoices = publicData.invoices;
          if (publicData.customers?.length) sheetData.customers = publicData.customers;
          if (publicData.settings && Object.keys(publicData.settings).length) sheetData.settings = publicData.settings;
        }
      } catch (pubErr) {
        console.warn("Public sheet read notice:", pubErr);
      }

      // 2. Try service account if configured
      try {
        const saData = await readDataFromServiceAccount(sheetId);
        if (saData) {
          if (saData.products?.length) sheetData.products = saData.products;
          if (saData.invoices?.length) sheetData.invoices = saData.invoices;
          if (saData.customers?.length) sheetData.customers = saData.customers;
          if (saData.settings && Object.keys(saData.settings).length) sheetData.settings = saData.settings;
        }
      } catch (saErr) {
        console.warn("Service account read notice:", saErr);
      }

      const serverData = getStoredServerData();
      const forceSheet = req.query.forceSheet === 'true';

      const finalProducts = forceSheet
        ? ((sheetData.products && sheetData.products.length > 0) ? sheetData.products : (serverData.products || []))
        : ((serverData.products && serverData.products.length > 0) ? serverData.products : (sheetData.products || []));

      const finalInvoices = forceSheet
        ? ((sheetData.invoices && sheetData.invoices.length > 0) ? sheetData.invoices : (serverData.invoices || []))
        : ((serverData.invoices && serverData.invoices.length > 0) ? serverData.invoices : (sheetData.invoices || []));

      const finalCustomers = forceSheet
        ? ((sheetData.customers && sheetData.customers.length > 0) ? sheetData.customers : (serverData.customers || []))
        : ((serverData.customers && serverData.customers.length > 0) ? serverData.customers : (sheetData.customers || []));

      const finalSettings = {
        ...(serverData.settings || {}),
        ...(sheetData.settings || {}),
      };

      // Seed server data if it was blank
      if (!serverData.products?.length && finalProducts.length) {
        saveStoredServerData({
          products: finalProducts,
          invoices: finalInvoices,
          customers: finalCustomers,
          settings: finalSettings,
        });
      }

      return res.json({
        status: "success",
        data: {
          products: finalProducts,
          invoices: finalInvoices,
          customers: finalCustomers,
          settings: finalSettings,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        message: err?.message || "Failed to read data",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
