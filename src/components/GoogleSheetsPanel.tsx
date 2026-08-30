import React, { useState, useEffect } from 'react';
import { Product, Invoice, ShopSettings, GoogleSheetsSyncStatus, Customer } from '../types';
import {
  getStoredSheetConfig,
  syncAllDataToGoogleSheets,
  fetchAllDataFromGoogleSheets,
  setAutoSyncEnabled,
  DEFAULT_SHEET_URL,
  DEFAULT_SHEET_ID,
} from '../services/googleSheetsService';
import {
  Database,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Cloud,
  CloudUpload,
  CloudDownload,
  Zap,
  Check,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface GoogleSheetsPanelProps {
  products: Product[];
  invoices: Invoice[];
  settings: ShopSettings;
  customers: Customer[];
  onDataLoadedFromSheets: (p?: Product[], inv?: Invoice[], set?: Partial<ShopSettings>, custs?: Customer[]) => void;
  onSyncStateChange?: (status: GoogleSheetsSyncStatus) => void;
}

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  products,
  invoices,
  settings,
  customers,
  onDataLoadedFromSheets,
  onSyncStateChange,
}) => {
  const config = getStoredSheetConfig();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [lastSynced, setLastSynced] = useState<string | null>(config.lastSync);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sheetUrl = config.url || DEFAULT_SHEET_URL;
  const sheetId = config.id || DEFAULT_SHEET_ID;

  useEffect(() => {
    if (onSyncStateChange) {
      onSyncStateChange({
        isConnected: true,
        isSyncing: false,
        autoSyncEnabled: autoSync,
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl,
        lastSyncedAt: lastSynced || undefined,
      });
    }
  }, []);

  const handleManualPullData = async () => {
    setIsPulling(true);
    setSuccessMessage(null);
    try {
      const result = await fetchAllDataFromGoogleSheets(null, sheetId);
      if (result.products || result.invoices || result.settings || result.customers) {
        onDataLoadedFromSheets(
          result.products,
          result.invoices,
          result.settings,
          result.customers
        );
        const prodCount = result.products?.length ?? products.length;
        const invCount = result.invoices?.length ?? invoices.length;
        setSuccessMessage(`تم جلب أحدث البيانات من Google Sheets بنجاح! (${prodCount} صنف، ${invCount} فاتورة)`);
      } else {
        setSuccessMessage('تم التحقق من البيانات، التطبيق محدث وفقاً لجدول Google Sheets.');
      }
      const now = new Date().toISOString();
      setLastSynced(now);
    } catch (err: any) {
      console.error('Manual Pull Sync Error:', err);
    } finally {
      setIsPulling(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    setAutoSyncEnabled(enabled);
    if (onSyncStateChange) {
      onSyncStateChange({
        isConnected: true,
        isSyncing: false,
        autoSyncEnabled: enabled,
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl,
        lastSyncedAt: lastSynced || undefined,
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-gray-200 space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-[#1A1A1A]">
                المزامنة مع Google Sheets (الاعتماد على الاكسل)
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3 fill-emerald-600" />
                <span>جلب من الشيت فقط</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              البيانات والتعديلات تتحدث من الشيت مباشرة دون تعديل أو مسح في ملف الإكسل
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 rounded-2xl p-4 border border-emerald-200/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>مزامنة جلب البيانات مفعلة ومباشرة</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                معرف الجدول: <span className="font-mono text-[10px] bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-900">{sheetId}</span>
              </p>
            </div>
          </div>

          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs hover:border-emerald-400 transition-all self-start sm:self-auto"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>فتح جدول Google Sheets</span>
          </a>
        </div>

        {/* Primary Pull Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleManualPullData}
            disabled={isPulling}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPulling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري سحب أحدث البيانات والتغييرات من الاكسل...</span>
              </>
            ) : (
              <>
                <CloudDownload className="w-4 h-4" />
                <span>مزامنة وجلب التغييرات من Google Sheets الآن</span>
              </>
            )}
          </button>
        </div>

        {/* Auto Sync Toggle & Last Synced */}
        <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 text-[11px]">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <span>التحديث التلقائي الدوري من الشيت:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {lastSynced && (
            <span className="text-emerald-700 font-medium">
              آخر جلب: {new Date(lastSynced).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
