import React, { useState, useEffect, useCallback } from 'react';
import { Product, Invoice, ShopSettings, ActiveTab, GoogleSheetsSyncStatus, Customer } from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredInvoices,
  saveStoredInvoices,
  getStoredSettings,
  saveStoredSettings,
  getStoredCustomers,
  saveStoredCustomers,
  generateNextInvoiceId,
  resetAllData,
  resetProductsToOfficialCatalog,
  sanitizeProductPrices,
} from './services/storage';
import { exportInvoicesToExcel } from './services/excelService';
import { INITIAL_PRODUCTS } from './data/initialData';
import {
  isCloudConnected,
  getStoredSheetConfig,
  getStoredAccessToken,
  saveAccessToken,
  findOrCreateSpreadsheet,
  fetchAllDataFromGoogleSheets,
  syncAllDataToGoogleSheets,
  autoSyncNewInvoice,
  autoSyncInvoices,
  autoSyncProducts,
  autoSyncCustomers,
  autoSyncSettings,
  fetchSharedSheetConfigFromServer,
  DEFAULT_SHEET_ID,
} from './services/googleSheetsService';
import { initAuthListener } from './services/googleAuthService';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { NewInvoiceWizard } from './components/NewInvoiceWizard';
import { SuccessInvoiceScreen } from './components/SuccessInvoiceScreen';
import { InvoicesListScreen } from './components/InvoicesListScreen';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { EditInvoiceModal } from './components/EditInvoiceModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ProductsScreen } from './components/ProductsScreen';
import { CustomersScreen } from './components/CustomersScreen';
import { EditPricesScreen } from './components/EditPricesScreen';
import { TodayPricesScreen } from './components/TodayPricesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginScreen } from './components/LoginScreen';
import { getAuthSession, logoutSession } from './services/authService';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getAuthSession().isLoggedIn;
  });

  // Application Data States
  const [products, setProducts] = useState<Product[]>(getStoredProducts);
  const [invoices, setInvoices] = useState<Invoice[]>(getStoredInvoices);
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers);
  const [settings, setSettings] = useState<ShopSettings>(getStoredSettings);

  // Cloud Sync State
  const [cloudStatus, setCloudStatus] = useState<GoogleSheetsSyncStatus>({
    isConnected: isCloudConnected(),
    isSyncing: false,
    lastSyncedAt: getStoredSheetConfig().lastSync || undefined,
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const activeTabRef = React.useRef<ActiveTab>('home');

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Modal & Flow States
  const [createdInvoiceForSuccess, setCreatedInvoiceForSuccess] = useState<Invoice | null>(null);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<Invoice | null>(null);
  const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState<Invoice | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState<boolean>(false);

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoiceForDetail(invoice);
    setAutoPrintInvoice(true);
  };

  // Sync to localStorage on updates
  useEffect(() => {
    saveStoredProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredCustomers(customers);
  }, [customers]);

  // Customer Management Handlers
  const handleAddCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveStoredCustomers(updated);
    if (isCloudConnected()) {
      autoSyncCustomers(updated);
    }
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    const updated = customers.map((c) => (c.id === updatedCust.id ? updatedCust : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
    if (isCloudConnected()) {
      autoSyncCustomers(updated);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    saveStoredCustomers(updated);
    if (isCloudConnected()) {
      autoSyncCustomers(updated);
    }
  };

  // Toast notification state
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Initial cloud fetch & Passive Google Auth listener for automatic seamless linking
  useEffect(() => {
    let isMounted = true;

    const initCloudPull = async () => {
      if (activeTabRef.current === 'settings') {
        // Skip background sync entirely while user is on the settings tab to prevent overwriting edits
        return;
      }
      try {
        // Fetch shared Google Sheets config and pull from Google Sheets if connected
        const sharedConfig = await fetchSharedSheetConfigFromServer();
        
        if (isCloudConnected()) {
          setCloudStatus((prev) => ({ 
            ...prev, 
            isConnected: true,
            isSyncing: true,
            webhookUrl: sharedConfig?.webhookUrl || prev.webhookUrl || undefined
          }));
          const config = getStoredSheetConfig();
          const token = getStoredAccessToken();
          const targetSheetId = sharedConfig?.sheetId || config.id;
          const result = await fetchAllDataFromGoogleSheets(token, targetSheetId);

          if (!isMounted) return;

          if (Array.isArray(result.products) && result.products.length > 0) {
            const cleaned = result.products.map((p) => {
              let price = p.price;
              if (price === undefined || price === null || isNaN(price)) {
                const match = INITIAL_PRODUCTS.find(
                  (ip) => ip.name.trim().toLowerCase() === p.name.trim().toLowerCase()
                );
                if (match) price = match.price;
              }
              return {
                ...p,
                price: price || 0,
              };
            });
            const sanitized = sanitizeProductPrices(cleaned);
            setProducts(sanitized);
          } else if (Array.isArray(result.products) && result.products.length === 0) {
            setProducts([]);
          }

          if (Array.isArray(result.invoices)) {
            setInvoices(result.invoices);
          }
          if (Array.isArray(result.customers)) {
            setCustomers(result.customers);
          }
          if (result.settings && Object.keys(result.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...result.settings }));
          }

          setCloudStatus((prev) => ({
            ...prev,
            isConnected: true,
            isSyncing: false,
            lastSyncedAt: new Date().toISOString(),
            error: undefined,
          }));
        }
      } catch (e: any) {
        console.warn('Initial cloud sync notice:', e);
        if (isMounted) {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
          }));
        }
      }
    };

    initCloudPull();

    // Periodic auto-sync every 15 seconds & window focus listener for multi-device sync
    const intervalId = setInterval(initCloudPull, 15000);
    const handleFocus = () => { initCloudPull(); };
    window.addEventListener('focus', handleFocus);

    // Passive Google Auth listener for seamless auto-linking
    const unsubscribeAuth = initAuthListener(
      async (user, validToken) => {
        if (!isMounted) return;
        try {
          saveAccessToken(validToken);
          const config = getStoredSheetConfig();
          
          setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
          const sheetInfo = await findOrCreateSpreadsheet(validToken, config.id || undefined);
          
          const result = await fetchAllDataFromGoogleSheets(validToken, sheetInfo.id);
          if (!isMounted) return;

          if (Array.isArray(result.products) && result.products.length > 0) {
            const cleaned = result.products.map((p) => {
              let price = p.price;
              if (price === undefined || price === null || isNaN(price)) {
                const match = INITIAL_PRODUCTS.find(
                  (ip) => ip.name.trim().toLowerCase() === p.name.trim().toLowerCase()
                );
                if (match) price = match.price;
              }
              return { ...p, price: price || 0 };
            });
            setProducts(sanitizeProductPrices(cleaned));
          } else if (Array.isArray(result.products) && result.products.length === 0) {
            setProducts([]);
          }
          if (Array.isArray(result.invoices)) {
            setInvoices(result.invoices);
          }
          if (Array.isArray(result.customers)) {
            setCustomers(result.customers);
          }
          if (result.settings && Object.keys(result.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...result.settings }));
          }

          setCloudStatus({
            isConnected: true,
            syncMode: 'oauth',
            spreadsheetId: sheetInfo.id,
            spreadsheetUrl: sheetInfo.url,
            lastSyncedAt: new Date().toISOString(),
            isSyncing: false,
            userEmail: user.email || undefined,
            autoSyncEnabled: true,
          });
        } catch (err: any) {
          console.warn('Auto Google Sheets link notice:', err);
          if (isMounted) {
            setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
          }
        }
      },
      () => {
        // Unauthenticated or Token Expired
      }
    );

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Quick 1-touch Cloud Sync from Header to Google Sheets (Exclusively Fetch/Pull from Google Sheets)
  const handleHeaderSyncNow = async () => {
    setCloudStatus((prev) => ({ ...prev, isSyncing: true, error: undefined }));
    setSyncToast('جاري جلب أحدث البيانات من Google Sheets...');
    try {
      const config = getStoredSheetConfig();
      const token = getStoredAccessToken();
      const targetSheetId = config.id || DEFAULT_SHEET_ID;
      const result = await fetchAllDataFromGoogleSheets(token, targetSheetId);

      if (Array.isArray(result.products) && result.products.length > 0) {
        const cleaned = result.products.map((p) => {
          let price = p.price;
          if (price === undefined || price === null || isNaN(price)) {
            const match = INITIAL_PRODUCTS.find(
              (ip) => ip.name.trim().toLowerCase() === p.name.trim().toLowerCase()
            );
            if (match) price = match.price;
          }
          return {
            ...p,
            price: price || 0,
          };
        });
        const sanitized = sanitizeProductPrices(cleaned);
        setProducts(sanitized);
        saveStoredProducts(sanitized);
      } else if (Array.isArray(result.products) && result.products.length === 0) {
        setProducts([]);
        saveStoredProducts([]);
      }

      if (Array.isArray(result.invoices)) {
        setInvoices(result.invoices);
        saveStoredInvoices(result.invoices);
      }
      if (Array.isArray(result.customers)) {
        setCustomers(result.customers);
        saveStoredCustomers(result.customers);
      }
      if (result.settings && Object.keys(result.settings).length > 0) {
        setSettings((prev) => {
          const merged = { ...prev, ...result.settings };
          saveStoredSettings(merged);
          return merged;
        });
      }

      const now = new Date().toISOString();
      setCloudStatus((prev) => ({
        ...prev,
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: now,
        error: undefined,
      }));
      setSyncToast('تم جلب وتحديث كافة البيانات من Google Sheets بنجاح! 🟢');
      setTimeout(() => setSyncToast(null), 3500);
    } catch (e: any) {
      console.warn('Header sync fetch notice:', e?.message || e);
      setCloudStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: undefined,
      }));
      setSyncToast('تعذر جلب البيانات من Google Sheets، يرجى التحقق من الاتصال');
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  // Handler: Start New Invoice
  const handleStartNewInvoice = () => {
    setCreatedInvoiceForSuccess(null);
    setActiveTab('new-invoice');
  };

  // Handler: Invoice Created Successfully
  const handleInvoiceCreated = (newInvoice: Invoice) => {
    // Auto-add customer to Customers table if not present
    if (newInvoice.customerName && newInvoice.customerName.trim()) {
      const existing = customers.find(
        (c) => c.name.trim().toLowerCase() === newInvoice.customerName.trim().toLowerCase()
      );
      if (!existing) {
        const autoCust: Customer = {
          id: newInvoice.customerId || `cust-${Date.now()}`,
          name: newInvoice.customerName.trim(),
          phone: newInvoice.customerPhone || '',
          notes: 'تمت إضافته تلقائياً عند إنشاء فاتورة',
          createdAt: new Date().toISOString().split('T')[0],
        };
        const updatedCusts = [autoCust, ...customers];
        setCustomers(updatedCusts);
        saveStoredCustomers(updatedCusts);
        if (isCloudConnected()) {
          autoSyncCustomers(updatedCusts);
        }
      } else if (newInvoice.customerPhone && !existing.phone) {
        const updatedCusts = customers.map((c) =>
          c.id === existing.id ? { ...c, phone: newInvoice.customerPhone! } : c
        );
        setCustomers(updatedCusts);
        saveStoredCustomers(updatedCusts);
        if (isCloudConnected()) {
          autoSyncCustomers(updatedCusts);
        }
      }
    }

    const filteredInvoices = invoices.filter((inv) => inv.id !== newInvoice.id);
    const updatedInvoices = [newInvoice, ...filteredInvoices];
    
    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);

    // Real-time Background Auto-Sync to Google Sheets (executed safely outside state setter)
    if (isCloudConnected()) {
      autoSyncNewInvoice(newInvoice, updatedInvoices, products, settings).then((synced) => {
        if (synced) {
          setCloudStatus((s) => ({
            ...s,
            lastSyncedAt: new Date().toISOString(),
          }));
        }
      });
    }

    setCreatedInvoiceForSuccess(newInvoice);
  };

  // Handler: Update Existing Invoice
  const handleSaveInvoiceEdit = (updatedInvoice: Invoice) => {
    const updatedList = invoices.map((inv) =>
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    );
    setInvoices(updatedList);
    saveStoredInvoices(updatedList);
    setSelectedInvoiceForEdit(null);
    if (selectedInvoiceForDetail && selectedInvoiceForDetail.id === updatedInvoice.id) {
      setSelectedInvoiceForDetail(updatedInvoice);
    }

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncInvoices(updatedList, products, settings)
        .then((synced) => {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
          }));
        })
        .catch((err) => {
          console.warn('Auto sync invoices update error:', err);
          setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
        });
    }
  };

  // Handler: Confirm Delete Invoice
  const handleConfirmDeleteInvoice = (invoiceToDelete: Invoice) => {
    const updatedList = invoices.filter((inv) => inv.id !== invoiceToDelete.id);
    setInvoices(updatedList);
    saveStoredInvoices(updatedList);
    setSelectedInvoiceForDelete(null);
    setSelectedInvoiceForDetail(null);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncInvoices(updatedList, products, settings)
        .then((synced) => {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
          }));
        })
        .catch((err) => {
          console.warn('Auto sync invoice deletion error:', err);
          setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
        });
    }
  };

  // Handler: Save Daily Prices
  const handleSaveDailyPrices = (updatedProducts: Product[]) => {
    const cleaned = sanitizeProductPrices(updatedProducts);
    setProducts(cleaned);
    saveStoredProducts(cleaned);

    // Auto-sync products to Google Sheets
    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncProducts(cleaned, invoices, settings).then((synced) => {
        setCloudStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
        }));
      }).catch((err) => {
        console.warn('Auto sync products error:', err);
        setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
      });
    }
  };

  // Handler: Add or Update Single Product
  const handleUpdateProduct = (prod: Product) => {
    const [cleaned] = sanitizeProductPrices([prod]);
    const exists = products.some((p) => p.id === cleaned.id);
    const updated = exists
      ? products.map((p) => (p.id === cleaned.id ? cleaned : p))
      : [cleaned, ...products];
    setProducts(updated);
    saveStoredProducts(updated);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncProducts(updated, invoices, settings).then((synced) => {
        setCloudStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
        }));
      }).catch((err) => {
        console.warn('Auto sync update product error:', err);
        setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
      });
    }
  };

  const handleAddProduct = (prod: Product) => {
    const [cleaned] = sanitizeProductPrices([prod]);
    const updated = [cleaned, ...products];
    setProducts(updated);
    saveStoredProducts(updated);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncProducts(updated, invoices, settings).then((synced) => {
        setCloudStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
        }));
      }).catch((err) => {
        console.warn('Auto sync add product error:', err);
        setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
      });
    }
  };

  const handleDeleteProduct = (prod: Product) => {
    const updated = products.filter((p) => p.id !== prod.id);
    setProducts(updated);
    saveStoredProducts(updated);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncProducts(updated, invoices, settings).then((synced) => {
        setCloudStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
        }));
      }).catch((err) => {
        console.warn('Auto sync delete product error:', err);
        setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
      });
    }
  };

  // Handler: Batch Update Products (from Excel Import)
  const handleBatchUpdateProducts = (updatedProducts: Product[]) => {
    const cleaned = sanitizeProductPrices(updatedProducts);
    setProducts(cleaned);
    saveStoredProducts(cleaned);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncProducts(cleaned, invoices, settings)
        .then((synced) => {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
          }));
        })
        .catch((err) => {
          console.warn('Auto sync batch products update error:', err);
          setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
        });
    }
  };

  // Handler: Batch Update Customers (from Excel Import)
  const handleBatchUpdateCustomers = (updatedCustomers: Customer[]) => {
    setCustomers(updatedCustomers);
    saveStoredCustomers(updatedCustomers);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncCustomers(updatedCustomers)
        .then((synced) => {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
          }));
        })
        .catch((err) => {
          console.warn('Auto sync batch customers update error:', err);
          setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
        });
    }
  };

  // Handler: Batch Update Invoices (from Excel Import)
  const handleBatchUpdateInvoices = (updatedInvoices: Invoice[]) => {
    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncInvoices(updatedInvoices)
        .then((synced) => {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
          }));
        })
        .catch((err) => {
          console.warn('Auto sync batch invoices update error:', err);
          setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
        });
    }
  };

  // Handler: Reset Products to Official Catalog
  const handleResetOfficialPrices = () => {
    const official = resetProductsToOfficialCatalog();
    setProducts(official);

    if (isCloudConnected()) {
      setCloudStatus((prev) => ({ ...prev, isSyncing: true }));
      autoSyncProducts(official, invoices, settings)
        .then((synced) => {
          setCloudStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: synced ? new Date().toISOString() : prev.lastSyncedAt,
          }));
        })
        .catch((err) => {
          console.warn('Auto sync reset products error:', err);
          setCloudStatus((prev) => ({ ...prev, isSyncing: false }));
        });
    }
  };

  // Handler: Save Settings
  const handleSaveSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    if (isCloudConnected()) {
      autoSyncSettings(newSettings).catch((err) => {
        console.warn('Failed autoSyncSettings in handleSaveSettings, falling back to full sync:', err);
        const config = getStoredSheetConfig();
        const token = getStoredAccessToken();
        syncAllDataToGoogleSheets(token, config.id, products, invoices, newSettings, customers).catch(console.warn);
      });
    }
  };

  // Handler: Reset Data
  const handleResetData = () => {
    resetAllData();
    setProducts(getStoredProducts());
    setInvoices(getStoredInvoices());
    setSettings(getStoredSettings());
    setActiveTab('home');
  };

  // Handler: Data pulled from Google Sheets
  const handleDataLoadedFromSheets = (
    newProducts?: Product[],
    newInvoices?: Invoice[],
    newSettings?: Partial<ShopSettings>,
    newCustomers?: Customer[]
  ) => {
    if (newProducts && newProducts.length > 0) {
      const sanitized = sanitizeProductPrices(newProducts);
      setProducts(sanitized);
      saveStoredProducts(sanitized);
    }
    if (newInvoices && newInvoices.length > 0) {
      setInvoices(newInvoices);
      saveStoredInvoices(newInvoices);
    }
    if (newSettings && Object.keys(newSettings).length > 0) {
      setSettings((prev) => {
        const merged = { ...prev, ...newSettings };
        saveStoredSettings(merged);
        return merged;
      });
    }
    if (newCustomers && newCustomers.length > 0) {
      setCustomers(newCustomers);
      saveStoredCustomers(newCustomers);
    }
  };

  // Handler: Quick Export All Invoices to Excel
  const handleExportAllExcel = () => {
    exportInvoicesToExcel(invoices, customers, `فواتير_${settings.shopName.replace(/\s+/g, '_')}`);
  };

  // Handler: Log Out
  const handleLogout = () => {
    logoutSession();
    setIsAuthenticated(false);
  };

  // If login is required and user is not authenticated, show LoginScreen
  if (settings.requireLogin !== false && !isAuthenticated) {
    return (
      <LoginScreen
        settings={settings}
        onLoginSuccess={() => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const nextInvoiceId = generateNextInvoiceId(invoices, settings);

  return (
    <div className="min-h-screen bg-[#F6F8F6] text-slate-800 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportExcel={handleExportAllExcel}
        onStartNewInvoice={handleStartNewInvoice}
        isCloudConnected={cloudStatus.isConnected}
        isSyncing={cloudStatus.isSyncing}
        lastSyncedAt={cloudStatus.lastSyncedAt}
        onSyncNow={handleHeaderSyncNow}
        onLogout={settings.requireLogin !== false ? handleLogout : undefined}
      />

      {/* Toast Notification Banner */}
      {syncToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 bg-[#087A35] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200">
          <span>{syncToast}</span>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-white/80 hover:text-white text-sm font-black p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg md:max-w-2xl lg:max-w-3xl w-full mx-auto px-4 pt-4 sm:pt-6">
        {/* If an invoice was just created, show the dedicated Success Screen */}
        {createdInvoiceForSuccess ? (
          <SuccessInvoiceScreen
            invoice={createdInvoiceForSuccess}
            settings={settings}
            onViewInvoice={() => {
              setSelectedInvoiceForDetail(createdInvoiceForSuccess);
              setCreatedInvoiceForSuccess(null);
            }}
            onPrintInvoice={() => {
              const inv = createdInvoiceForSuccess;
              setCreatedInvoiceForSuccess(null);
              handlePrintInvoice(inv);
            }}
            onNewInvoice={() => {
              setCreatedInvoiceForSuccess(null);
              setActiveTab('new-invoice');
            }}
          />
        ) : (
          <>
            {/* 1. Home View */}
            {activeTab === 'home' && (
              <HomeScreen
                invoices={invoices}
                settings={settings}
                products={products}
                onStartNewInvoice={handleStartNewInvoice}
                setActiveTab={setActiveTab}
                onNavigateToTab={setActiveTab}
                onSelectInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
                onViewInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
                onPrintInvoice={handlePrintInvoice}
                onEditInvoice={(inv) => setSelectedInvoiceForEdit(inv)}
                onDeleteInvoice={(inv) => setSelectedInvoiceForDelete(inv)}
                onUpdateInvoice={handleSaveInvoiceEdit}
              />
            )}

            {/* 2. Today's Prices View */}
            {activeTab === 'today-prices' && (
              <TodayPricesScreen
                products={products}
                settings={settings}
                onEditPrices={() => setActiveTab('edit-prices')}
                onBatchUpdateProducts={handleBatchUpdateProducts}
                onResetOfficialPrices={handleResetOfficialPrices}
              />
            )}

            {/* 3. Edit Daily Prices View */}
            {activeTab === 'edit-prices' && (
              <EditPricesScreen
                products={products}
                settings={settings}
                onSave={handleSaveDailyPrices}
                onCancel={() => setActiveTab('today-prices')}
              />
            )}

            {/* 4. Invoices List View */}
            {activeTab === 'invoices' && (
              <InvoicesListScreen
                invoices={invoices}
                settings={settings}
                onStartNewInvoice={handleStartNewInvoice}
                onSelectInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
                onViewInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
                onPrintInvoice={handlePrintInvoice}
                onExportExcel={handleExportAllExcel}
                onImportInvoices={handleBatchUpdateInvoices}
                onEditInvoice={(inv) => setSelectedInvoiceForEdit(inv)}
                onDeleteInvoice={(inv) => setSelectedInvoiceForDelete(inv)}
                onUpdateInvoice={handleSaveInvoiceEdit}
              />
            )}

            {/* 5. New Invoice Creation Wizard */}
            {activeTab === 'new-invoice' && (
              <NewInvoiceWizard
                products={products}
                customers={customers}
                invoices={invoices}
                settings={settings}
                nextInvoiceId={nextInvoiceId}
                onInvoiceCreated={handleInvoiceCreated}
                onCancel={() => setActiveTab('home')}
              />
            )}

            {/* 6. Customers Table Screen */}
            {activeTab === 'customers' && (
              <CustomersScreen
                customers={customers}
                invoices={invoices}
                settings={settings}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onBatchUpdateCustomers={handleBatchUpdateCustomers}
                onSelectCustomerInvoices={(custName) => {
                  setActiveTab('invoices');
                }}
              />
            )}

            {/* 6. Products Catalog Management */}
            {activeTab === 'products' && (
              <ProductsScreen
                products={products}
                settings={settings}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onBatchUpdateProducts={handleBatchUpdateProducts}
                onResetOfficialPrices={handleResetOfficialPrices}
                onSyncCloud={handleHeaderSyncNow}
                isCloudConnected={cloudStatus.isConnected}
                isSyncing={cloudStatus.isSyncing}
              />
            )}

            {/* 7. Settings Screen */}
            {activeTab === 'settings' && (
              <SettingsScreen
                settings={settings}
                invoices={invoices}
                products={products}
                customers={customers}
                onSaveSettings={handleSaveSettings}
                onResetData={handleResetData}
                onBatchUpdateProducts={handleBatchUpdateProducts}
                onBatchUpdateCustomers={handleBatchUpdateCustomers}
                onBatchUpdateInvoices={handleBatchUpdateInvoices}
                onDataLoadedFromSheets={handleDataLoadedFromSheets}
                onLogout={settings.requireLogin !== false ? handleLogout : undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent Bottom Mobile Navigation Bar - Hidden during active invoice creation wizard */}
      {activeTab !== 'new-invoice' && !createdInvoiceForSuccess && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onStartNewInvoice={handleStartNewInvoice}
          onExportExcel={handleExportAllExcel}
        />
      )}

      {/* Modals */}
      {selectedInvoiceForDetail && (
        <InvoiceDetailModal
          invoice={selectedInvoiceForDetail}
          settings={settings}
          autoPrint={autoPrintInvoice}
          onClose={() => {
            setSelectedInvoiceForDetail(null);
            setAutoPrintInvoice(false);
          }}
          onEdit={() => {
            setSelectedInvoiceForEdit(selectedInvoiceForDetail);
            setSelectedInvoiceForDetail(null);
            setAutoPrintInvoice(false);
          }}
          onDelete={() => {
            setSelectedInvoiceForDelete(selectedInvoiceForDetail);
            setAutoPrintInvoice(false);
          }}
        />
      )}

      {selectedInvoiceForEdit && (
        <EditInvoiceModal
          invoice={selectedInvoiceForEdit}
          products={products}
          settings={settings}
          onSave={handleSaveInvoiceEdit}
          onClose={() => setSelectedInvoiceForEdit(null)}
        />
      )}

      {selectedInvoiceForDelete && (
        <DeleteConfirmModal
          invoice={selectedInvoiceForDelete}
          settings={settings}
          onConfirm={() => handleConfirmDeleteInvoice(selectedInvoiceForDelete)}
          onClose={() => setSelectedInvoiceForDelete(null)}
        />
      )}
    </div>
  );
}
