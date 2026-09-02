import React, { useState, useMemo, useRef } from 'react';
import { Customer, Invoice, ShopSettings } from '../types';
import { exportCustomersToExcel, importCustomersFromExcel } from '../services/excelService';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  FileText,
  Edit,
  Trash2,
  X,
  Plus,
  MessageSquare,
  Calendar,
  Check,
  TrendingUp,
  MapPin,
  ExternalLink,
  ChevronLeft,
  AlertTriangle,
  Wallet,
  Award,
  BarChart3,
  CreditCard,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Upload,
  Download,
  Loader2
} from 'lucide-react';

interface CustomersScreenProps {
  customers: Customer[];
  invoices: Invoice[];
  settings: ShopSettings;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onBatchUpdateCustomers?: (customers: Customer[]) => void;
  onSelectCustomerInvoices?: (customerName: string) => void;
}

type DebtFilterType = 'all' | 'has_debt' | 'fully_paid' | 'no_invoices';
type CustomerSortOption = 'highest_spent' | 'highest_debt' | 'most_invoices' | 'name';

export const CustomersScreen: React.FC<CustomersScreenProps> = ({
  customers,
  invoices,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onBatchUpdateCustomers,
  onSelectCustomerInvoices,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<DebtFilterType>('all');
  const [sortBy, setSortBy] = useState<CustomerSortOption>('highest_spent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Excel Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');

  // Customer Invoices View Modal
  const [viewCustomerInvoices, setViewCustomerInvoices] = useState<Customer | null>(null);

  // Deletion Confirmation Modal State
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);

  // Calculate detailed customer statistics
  const customerStats = useMemo(() => {
    return customers.map((c) => {
      // Find invoices matching customer name or customerId or phone
      const custInvoices = invoices.filter((inv) => {
        if (inv.customerId && inv.customerId === c.id) return true;
        if (c.name && inv.customerName && inv.customerName.trim().toLowerCase() === c.name.trim().toLowerCase()) return true;
        if (c.phone && inv.customerPhone && inv.customerPhone.replace(/\s+/g, '') === c.phone.replace(/\s+/g, '')) return true;
        return false;
      });

      const invoiceCount = custInvoices.length;
      const totalSpent = custInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidSpent = custInvoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0);
      const pendingDebt = custInvoices.reduce((sum, inv) => sum + (inv.status === 'pending' ? inv.total : 0), 0);
      const pendingInvoicesCount = custInvoices.filter((inv) => inv.status === 'pending').length;

      const sortedInvoices = [...custInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastInvoice = sortedInvoices.length > 0 ? sortedInvoices[0] : null;

      return {
        customer: c,
        invoiceCount,
        totalSpent,
        paidSpent,
        pendingDebt,
        pendingInvoicesCount,
        lastInvoiceDate: lastInvoice ? lastInvoice.date : null,
        invoices: custInvoices,
      };
    });
  }, [customers, invoices]);

  // Overall Global Statistics
  const overallStats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customerStats.filter((c) => c.invoiceCount > 0);
    const activeCustomersCount = activeCustomers.length;
    const grandTotalCustomerSpent = customerStats.reduce((acc, c) => acc + c.totalSpent, 0);
    const grandTotalPaid = customerStats.reduce((acc, c) => acc + c.paidSpent, 0);
    const grandTotalPendingDebt = customerStats.reduce((acc, c) => acc + c.pendingDebt, 0);
    const debtorsCount = customerStats.filter((c) => c.pendingDebt > 0).length;
    const avgSpentPerActiveCustomer = activeCustomersCount > 0 ? grandTotalCustomerSpent / activeCustomersCount : 0;

    // Top VIP Spender
    const sortedBySpent = [...customerStats].sort((a, b) => b.totalSpent - a.totalSpent);
    const topSpender = sortedBySpent.length > 0 && sortedBySpent[0].totalSpent > 0 ? sortedBySpent[0] : null;

    // Top Debtor
    const sortedByDebt = [...customerStats].sort((a, b) => b.pendingDebt - a.pendingDebt);
    const topDebtor = sortedByDebt.length > 0 && sortedByDebt[0].pendingDebt > 0 ? sortedByDebt[0] : null;

    return {
      totalCustomers,
      activeCustomersCount,
      grandTotalCustomerSpent,
      grandTotalPaid,
      grandTotalPendingDebt,
      debtorsCount,
      avgSpentPerActiveCustomer,
      topSpender,
      topDebtor,
      topCustomersList: sortedBySpent.slice(0, 3).filter((c) => c.totalSpent > 0),
      topDebtorsList: sortedByDebt.slice(0, 3).filter((c) => c.pendingDebt > 0),
    };
  }, [customers, customerStats]);

  // Filtered & Sorted Customer List
  const filteredCustomerStats = useMemo(() => {
    return customerStats
      .filter((cs) => {
        // 1. Search filter
        const q = searchQuery.trim().toLowerCase();
        const matchSearch =
          !q ||
          cs.customer.name.toLowerCase().includes(q) ||
          (cs.customer.phone && cs.customer.phone.includes(q)) ||
          (cs.customer.notes && cs.customer.notes.toLowerCase().includes(q)) ||
          (cs.customer.address && cs.customer.address.toLowerCase().includes(q));

        if (!matchSearch) return false;

        // 2. Debt / Status Filter
        if (debtFilter === 'has_debt' && cs.pendingDebt <= 0) return false;
        if (debtFilter === 'fully_paid' && (cs.invoiceCount === 0 || cs.pendingDebt > 0)) return false;
        if (debtFilter === 'no_invoices' && cs.invoiceCount > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest_spent') return b.totalSpent - a.totalSpent;
        if (sortBy === 'highest_debt') return b.pendingDebt - a.pendingDebt;
        if (sortBy === 'most_invoices') return b.invoiceCount - a.invoiceCount;
        if (sortBy === 'name') return a.customer.name.localeCompare(b.customer.name, 'ar');
        return 0;
      });
  }, [customerStats, searchQuery, debtFilter, sortBy]);

  // Open modal for Create or Edit
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setNotes('');
    setAddress('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setNotes(customer.notes || '');
    setAddress(customer.address || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        address: address.trim(),
      });
    } else {
      onAddCustomer({
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        address: address.trim(),
      });
    }

    setIsModalOpen(false);
  };

  const handleWhatsApp = (phoneNumber: string, customerName: string, debtAmount?: number) => {
    if (!phoneNumber) return;
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('07')) {
      formattedPhone = '962' + cleanPhone.substring(1);
    }
    let messageText = `مرحباً ${customerName}، يسعدنا تواصلك مع ${settings.shopName || 'محلنا'}.`;
    if (debtAmount && debtAmount > 0) {
      messageText = `مرحباً السيد/ة ${customerName}، تذكير محترم من ${settings.shopName || 'محلنا'}: توجد ذمم معلقة بقيمة (${debtAmount.toFixed(2)} ${settings.currency}). شاكرين تعاونكم الطيب.`;
    }
    const message = encodeURIComponent(messageText);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleExportExcel = () => {
    try {
      exportCustomersToExcel(customers, invoices, settings.currency);
    } catch (err: any) {
      setImportNotification({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء تصدير العملاء',
      });
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotification(null);

    try {
      const result = await importCustomersFromExcel(file, customers);
      if (onBatchUpdateCustomers) {
        onBatchUpdateCustomers(result.updatedCustomers);
      } else {
        // Fallback: update individual items
        result.updatedCustomers.forEach((cust) => {
          const existing = customers.find((c) => c.id === cust.id);
          if (existing) {
            onUpdateCustomer(cust);
          } else {
            onAddCustomer(cust);
          }
        });
      }

      setImportNotification({
        type: 'success',
        message: `تم استيراد بيانات العملاء بنجاح: تم تحديث ${result.matchedCount} عميل وإضافة ${result.addedCount} عميل جديد.`,
      });
    } catch (err: any) {
      setImportNotification({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء قراءة ملف العملاء من Excel',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-snug">إحصائيات وحسابات العملاء</h1>
            <p className="text-xs text-gray-500 font-medium">
              إدارة الزبائن، تحليلات المبيعات، ومتابعة الذمم والديون المترتبة
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
            title="تصدير جدول العملاء إلى Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>تصدير Excel</span>
          </button>

          {/* Import from Excel */}
          <button
            onClick={handleTriggerFileInput}
            disabled={isImporting}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-xl border border-blue-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-50"
            title="استيراد وتحديث العملاء من ملف Excel"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-blue-700" />
            )}
            <span>{isImporting ? 'جاري الاستيراد...' : 'استيراد Excel'}</span>
          </button>

          {/* Add Customer Button */}
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Import / Action Notification Banner */}
      {importNotification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
            importNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{importNotification.message}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-gray-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Main Analytics Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold">مجموع المبيعات للعملاء</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-gray-900">
              {overallStats.grandTotalCustomerSpent.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-gray-500">{settings.currency}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-bold mt-1.5 flex items-center gap-1">
            <span>من أصل</span>
            <strong className="text-gray-800">{overallStats.activeCustomersCount}</strong>
            <span>عميل نشط</span>
          </div>
        </div>

        {/* Total Debt / Pending Dues */}
        <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-900 mb-1">
            <span className="text-[11px] font-bold">الذمم والديون المستحقة</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-amber-900">
              {overallStats.grandTotalPendingDebt.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-amber-700">{settings.currency}</span>
          </div>
          <div className="text-[10px] text-amber-800 font-bold mt-1.5 flex items-center gap-1">
            <span>مطلوبة من</span>
            <strong className="text-amber-950 font-black">{overallStats.debtorsCount}</strong>
            <span>عميل عليه ديون</span>
          </div>
        </div>

        {/* Total Paid Collections */}
        <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-900 mb-1">
            <span className="text-[11px] font-bold">المبالغ المسددة (نقداً)</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-900">
              {overallStats.grandTotalPaid.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-emerald-700">{settings.currency}</span>
          </div>
          <div className="text-[10px] text-emerald-800 font-bold mt-1.5">
            تحصيل نقدي مؤكد بالكامل
          </div>
        </div>

        {/* Average Spending per Customer */}
        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold">متوسط قيمة شراء العميل</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-gray-900">
              {overallStats.avgSpentPerActiveCustomer.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-gray-500">{settings.currency}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-bold mt-1.5">
            معدل الصرف للعميل الواحد
          </div>
        </div>
      </div>

      {/* Top Spenders & Top Debtors Highlights Widget */}
      {(overallStats.topCustomersList.length > 0 || overallStats.topDebtorsList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Top VIP Buyers Leaderboard */}
          <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs text-gray-900">أكثر العملاء شراءً (VIP)</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-bold">حسب إجمالي المبيعات</span>
            </div>

            {overallStats.topCustomersList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">لا يوجد مشتريات مسجلة بعد.</p>
            ) : (
              <div className="space-y-2">
                {overallStats.topCustomersList.map((item, index) => {
                  const rankIcons = ['🥇', '🥈', '🥉'];
                  return (
                    <div
                      key={item.customer.id}
                      className="flex items-center justify-between bg-gray-50/80 hover:bg-emerald-50/50 p-2 rounded-xl border border-gray-100 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{rankIcons[index] || `#${index + 1}`}</span>
                        <div>
                          <div className="font-bold text-gray-900">{item.customer.name}</div>
                          <div className="text-[10px] text-gray-500">
                            {item.invoiceCount} فواتير | {item.customer.phone || 'بدون رقم'}
                          </div>
                        </div>
                      </div>

                      <div className="text-left font-black text-emerald-800">
                        {item.totalSpent.toFixed(2)} <span className="text-[10px] text-gray-500">{settings.currency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Debtors Widget */}
          <div className="bg-amber-50/40 rounded-2xl p-3.5 border border-amber-200/70 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-xs text-amber-950">أبرز العملاء أصحاب الذمم والديون</h3>
              </div>
              <span className="text-[10px] text-amber-800 font-bold">ذمم مستحقة</span>
            </div>

            {overallStats.topDebtorsList.length === 0 ? (
              <div className="text-center py-3 text-xs text-emerald-700 font-bold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ممتاز! لا يوجد أي ديون معلقة على العملاء.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {overallStats.topDebtorsList.map((item) => (
                  <div
                    key={item.customer.id}
                    className="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-200 shadow-2xs text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900">{item.customer.name}</div>
                      <div className="text-[10px] text-amber-800 font-semibold">
                        {item.pendingInvoicesCount} فواتير ذمم غير مسددة
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-left font-black text-amber-900">
                        {item.pendingDebt.toFixed(2)}{' '}
                        <span className="text-[10px] text-amber-700">{settings.currency}</span>
                      </div>

                      {item.customer.phone && (
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(item.customer.phone, item.customer.name, item.pendingDebt)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="إرسال تذكير بالدين عبر الواتساب"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>تذكير</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter, Search & Sort Control Card */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 space-y-3">
        {/* Search Bar & Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عميل باسمه، رقم هاتفه، أو عنوانه..."
              className="w-full pr-9 pl-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as CustomerSortOption)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-600 shrink-0"
          >
            <option value="highest_spent">الأعلى شراءً</option>
            <option value="highest_debt">الأعلى ذمماً (ديون)</option>
            <option value="most_invoices">الأكثر فواتيراً</option>
            <option value="name">أبجدي حسب الاسم</option>
          </select>
        </div>

        {/* Debt Status Tabs Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setDebtFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              debtFilter === 'all'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            جميع العملاء ({customers.length})
          </button>

          <button
            onClick={() => setDebtFilter('has_debt')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              debtFilter === 'has_debt'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>عليهم ذمم ({overallStats.debtorsCount})</span>
          </button>

          <button
            onClick={() => setDebtFilter('fully_paid')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              debtFilter === 'fully_paid'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>مسددون بالكامل</span>
          </button>

          <button
            onClick={() => setDebtFilter('no_invoices')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              debtFilter === 'no_invoices'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            بدون فواتير ({customers.length - overallStats.activeCustomersCount})
          </button>
        </div>
      </div>

      {/* Customer List Display Table */}
      {filteredCustomerStats.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">لا يوجد عملاء مطابقون للفلاتر</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery || debtFilter !== 'all'
              ? 'جرّب تغيير عبارة البحث أو فلتر الذمم للحصول على نتائج.'
              : 'لم تقم بإضافة أي عميل بعد. ابدأ بإضافة أول عميل لك.'}
          </p>
          {!searchQuery && debtFilter === 'all' && (
            <button
              onClick={handleOpenAdd}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4 hidden sm:table-cell">الهاتف</th>
                  <th className="py-3 px-4 text-center">الفواتير</th>
                  <th className="py-3 px-4 text-center">إجمالي المشتريات</th>
                  <th className="py-3 px-4 text-center">الذمم والديون</th>
                  <th className="py-3 px-4 text-center">إجراءات والتواصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomerStats.map(({ customer, invoiceCount, totalSpent, pendingDebt, paidSpent }) => (
                  <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Customer Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-sm">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-xs">{customer.name}</div>
                          {customer.address && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[120px]">{customer.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-gray-600 font-mono hidden sm:table-cell">
                      {customer.phone || '-'}
                    </td>

                    {/* Invoices Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-lg font-bold text-gray-700">
                        {invoiceCount}
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3 px-4 text-center font-black text-gray-900">
                      {totalSpent.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-gray-400">{settings.currency}</span>
                    </td>

                    {/* Pending Debt */}
                    <td className="py-3 px-4 text-center">
                      {pendingDebt > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                          <span>{pendingDebt.toFixed(2)} {settings.currency}</span>
                        </span>
                      ) : invoiceCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>خالي الذمة</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">-</span>
                      )}
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* WhatsApp Reminder if phone exists */}
                        {customer.phone && (
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(customer.phone, customer.name, pendingDebt)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all"
                            title={pendingDebt > 0 ? 'إرسال تذكير بالدين عبر الواتساب' : 'مراسلة عبر الواتساب'}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Call Button */}
                        {customer.phone && (
                          <button
                            type="button"
                            onClick={() => handleCall(customer.phone)}
                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition-all"
                            title="اتصال هافتي"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Invoices */}
                        <button
                          type="button"
                          onClick={() => setViewCustomerInvoices(customer)}
                          className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                          title="عرض الفواتير"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Customer */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                          title="تعديل العميل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Customer */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmCustomer(customer)}
                          className="p-1.5 text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                  </h3>
                  <p className="text-xs text-emerald-100">أدخل تفاصيل العميل لحفظها واستخدامها بالفواتير</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  اسم العميل / الزبون <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أبو أحمد، مطعم السلطان..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  رقم الهاتف / الواتساب
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 0791234567"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-right"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">العنوان / المنطقة</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: عمان - خلدا، الشارع الرئيسي"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">ملاحظات خاصة بالعميل</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: زبون جملة، يفضل التوصيل قبل الظهر..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCustomer ? 'حفظ التغييرات' : 'إضافة العميل'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Customer Invoices */}
      {viewCustomerInvoices && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>فواتير العميل: {viewCustomerInvoices.name}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  إجمالي الفواتير المسجلة لهذا العميل
                </p>
              </div>
              <button
                onClick={() => setViewCustomerInvoices(null)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {(() => {
                const custInvoices = invoices.filter((inv) => {
                  if (inv.customerId && inv.customerId === viewCustomerInvoices.id) return true;
                  if (inv.customerName && inv.customerName.trim().toLowerCase() === viewCustomerInvoices.name.trim().toLowerCase()) return true;
                  if (viewCustomerInvoices.phone && inv.customerPhone && inv.customerPhone.replace(/\s+/g, '') === viewCustomerInvoices.phone.replace(/\s+/g, '')) return true;
                  return false;
                });

                if (custInvoices.length === 0) {
                  return (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      لا يوجد فواتير مسجلة حالياً باسم هذا العميل.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {custInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-emerald-50/40 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              {inv.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                inv.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inv.status === 'paid' ? 'مدفوعة' : 'معلقة ذمم'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                            <span>التاريخ: {inv.date}</span>
                            <span>العناصر: {inv.items.length}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-gray-200 pt-2 sm:pt-0">
                          <div className="text-left font-black text-emerald-900 text-base">
                            {inv.total.toFixed(2)} <span className="text-xs text-gray-500">{settings.currency}</span>
                          </div>
                          {onSelectCustomerInvoices && (
                            <button
                              onClick={() => {
                                setViewCustomerInvoices(null);
                                onSelectCustomerInvoices(inv.customerName || viewCustomerInvoices.name);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <span>استعراض</span>
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Custom Delete Confirmation for Customer */}
      {deleteConfirmCustomer && (
        <div
          onClick={() => setDeleteConfirmCustomer(null)}
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Red Warning Icon */}
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Dialog Header & Text */}
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-gray-900 leading-snug">
                هل أنت متأكد من حذف هذا العميل؟
              </h3>
              <div className="inline-block px-3 py-1 rounded-xl bg-gray-50 text-gray-800 text-xs font-bold border border-gray-100 mt-1">
                {deleteConfirmCustomer.name}
              </div>
              <p className="text-xs text-rose-500 font-bold pt-1">
                ⚠️ سيتم حذف العميل نهائياً من سجلات هذا الجهاز ومن ملف الإكسل.
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmCustomer(null)}
                className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(deleteConfirmCustomer.id);
                  setDeleteConfirmCustomer(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

