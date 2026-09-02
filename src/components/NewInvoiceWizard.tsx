import React, { useState, useMemo } from 'react';
import { Product, InvoiceItem, ProductCategory, ShopSettings, Invoice, Customer } from '../types';
import { parseArabicFloat } from '../utils/arabicNumbers';
import { isCategoryMatch } from '../utils/categoryUtils';
import {
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  ShoppingBag,
  Carrot,
  Apple,
  Sparkles,
  Package,
  Tag,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  Truck,
  Users,
  MapPin,
  FileText
} from 'lucide-react';

interface NewInvoiceWizardProps {
  products: Product[];
  customers?: Customer[];
  invoices?: Invoice[];
  settings: ShopSettings;
  onCancel: () => void;
  onInvoiceCreated: (invoice: Invoice) => void;
  nextInvoiceId: string;
}

export const NewInvoiceWizard: React.FC<NewInvoiceWizardProps> = ({
  products,
  customers = [],
  invoices = [],
  settings,
  onCancel,
  onInvoiceCreated,
  nextInvoiceId,
}) => {
  // Wizard Steps: 1 = Customer, 2 = Products, 3 = Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Sort customers by order frequency (most orders first)
  const sortedCustomers = useMemo(() => {
    if (!invoices || invoices.length === 0) return customers;

    const orderCounts: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (inv.customerId) {
        orderCounts[inv.customerId] = (orderCounts[inv.customerId] || 0) + 1;
      } else if (inv.customerName) {
        const normalizedName = inv.customerName.trim().toLowerCase();
        orderCounts[normalizedName] = (orderCounts[normalizedName] || 0) + 1;
      }
    });

    return [...customers].sort((a, b) => {
      const countA = (orderCounts[a.id] || 0) + (orderCounts[a.name.trim().toLowerCase()] || 0);
      const countB = (orderCounts[b.id] || 0) + (orderCounts[b.name.trim().toLowerCase()] || 0);
      return countB - countA;
    });
  }, [customers, invoices]);

  // Step 1: Customer & Date/Time Details
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerNameError, setCustomerNameError] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceTime, setInvoiceTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Step 2: Selected Items (map by productId)
  const [selectedItems, setSelectedItems] = useState<Map<string, InvoiceItem>>(new Map());
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

// Step 3: Review & Discount & Delivery Fee & Notes
  const [deliveryFeeStr, setDeliveryFeeStr] = useState<string>('');
  const [discountStr, setDiscountStr] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [invoicePaymentType, setInvoicePaymentType] = useState<'cash' | 'debt'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unit-specific configurations for step and preset buttons
  const getUnitConfig = (unit: string) => {
    const norm = (unit || '').trim().toLowerCase();
    const isWeight = 
      norm === '' ||
      norm === 'كغ' ||
      norm === 'كغم' ||
      norm === 'كيلو' ||
      norm === 'كجم' ||
      norm === 'كيلوجرام' ||
      norm === 'غم' ||
      norm === 'غرام' ||
      norm === 'جرام' ||
      norm.includes('كغ') ||
      norm.includes('كيلو') ||
      norm.includes('كجم');
    
    if (isWeight) {
      const displayUnit = unit || 'كغ';
      return {
        step: 0.250,
        presets: [0.250, 0.500, 0.750, 1.000, 1.500, 2.000],
        getLabel: (val: number, u: string) => {
          const displayUnitLocal = u || 'كغ';
          if (val < 1) {
            return `${val.toFixed(3).replace(/\.?0+$/, '')} ${displayUnitLocal}`;
          }
          return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(3).replace(/\.?0+$/, '')} ${displayUnitLocal}`;
        },
        stepLabel: `0.250 ${displayUnit}`,
        isWeight: true,
      };
    } else {
      return {
        step: 1.0,
        presets: [1, 2, 3, 5, 10, 20],
        getLabel: (val: number, u: string) => {
          return `${val.toFixed(0)} ${u || 'حبة'}`;
        },
        stepLabel: unit || 'حبة',
        isWeight: false,
      };
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.active === false || (p.active as any) === 'false' || (p.active as any) === 'لا' || (p.active as any) === '0') return false;
      const matchCat = isCategoryMatch(p.category, activeCategory);
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // State to hold raw string input of quantity for each product to allow typing decimal dots/zeros safely
  const [wizardQtyInputs, setWizardQtyInputs] = useState<Record<string, string>>({});

  // Handle adding / updating quantity of a product
  const handleUpdateQuantity = (product: Product, newQty: number) => {
    const updated = new Map(selectedItems);
    if (newQty <= 0) {
      updated.delete(product.id);
      setWizardQtyInputs(prev => {
        const c = { ...prev };
        delete c[product.id];
        return c;
      });
    } else {
      // Round to 3 decimals to avoid floating point issues
      const roundedQty = Math.round(newQty * 1000) / 1000;
      const itemTotal = Math.round(roundedQty * product.price * 100) / 100;
      updated.set(product.id, {
        productId: product.id,
        productName: product.name,
        category: product.category,
        image: product.image,
        unit: product.unit,
        quantity: roundedQty,
        unitPrice: product.price,
        total: itemTotal,
      });
      setWizardQtyInputs(prev => ({ ...prev, [product.id]: String(roundedQty) }));
    }
    setSelectedItems(updated);
  };

  // Handle direct text change in quantity input
  const handleQuantityInputChange = (product: Product, val: string) => {
    if (val === '') {
      const updated = new Map(selectedItems);
      updated.set(product.id, {
        productId: product.id,
        productName: product.name,
        category: product.category,
        image: product.image,
        unit: product.unit,
        quantity: 0,
        unitPrice: product.price,
        total: 0,
      });
      setSelectedItems(updated);
      return;
    }
    const parsed = parseArabicFloat(val);
    const roundedQty = isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 1000) / 1000;
    const itemTotal = Math.round(roundedQty * product.price * 100) / 100;
    const updated = new Map(selectedItems);
    updated.set(product.id, {
      productId: product.id,
      productName: product.name,
      category: product.category,
      image: product.image,
      unit: product.unit,
      quantity: roundedQty,
      unitPrice: product.price,
      total: itemTotal,
    });
    setSelectedItems(updated);
  };

  // Calculate totals
  const itemsArray = useMemo(() => Array.from(selectedItems.values()).filter((item: InvoiceItem) => item.quantity > 0), [selectedItems]);
  const itemsCount = itemsArray.length;
  const subtotal = useMemo(() => {
    return itemsArray.reduce((sum, item) => sum + item.total, 0);
  }, [itemsArray]);

  const parsedDeliveryFee = useMemo(() => {
    const f = parseArabicFloat(deliveryFeeStr);
    return isNaN(f) || f < 0 ? 0 : f;
  }, [deliveryFeeStr]);

  const parsedDiscount = useMemo(() => {
    const d = parseArabicFloat(discountStr);
    return isNaN(d) || d < 0 ? 0 : d;
  }, [discountStr]);

  const grandTotal = Math.max(0, subtotal + parsedDeliveryFee - parsedDiscount);

  // Step 1 Validation & Proceed
  const handleProceedToProducts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setCustomerNameError('يرجى إدخال اسم المشتري');
      return;
    }
    setCustomerNameError('');
    setStep(2);
  };

  // Step 2 Proceed to Review
  const handleProceedToReview = () => {
    if (itemsCount === 0) {
      return;
    }
    setStep(3);
  };

  // Step 3 Finalize Invoice Creation
  const handleFinalizeInvoice = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const finalDate = invoiceDate.trim() || new Date().toISOString().split('T')[0];
    const finalTime = invoiceTime.trim() || '12:00';

    const newInvoice: Invoice = {
      id: nextInvoiceId,
      date: finalDate,
      time: finalTime,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      items: itemsArray,
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee: parsedDeliveryFee > 0 ? Math.round(parsedDeliveryFee * 100) / 100 : undefined,
      discount: Math.round(parsedDiscount * 100) / 100,
      total: Math.round(grandTotal * 100) / 100,
      status: invoicePaymentType === 'debt' ? 'pending' : 'paid',
      paymentMethod: invoicePaymentType,
      notes: notes.trim() || undefined,
    };

    onInvoiceCreated(newInvoice);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3.5 pb-28 animate-in fade-in duration-200">
      {/* Top Header & Wizard Stepper (High Density) */}
      <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-gray-200 flex items-center justify-between">
        <button
          id="btn-wizard-back"
          onClick={() => {
            if (step === 3) setStep(2);
            else if (step === 2) setStep(1);
            else onCancel();
          }}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs font-bold py-1 px-2.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{step === 1 ? 'إلغاء' : 'رجوع'}</span>
        </button>

        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <h2 className="font-bold text-sm text-[#1A1A1A]">فاتورة جديدة</h2>
            <span className="text-[11px] font-bold text-[#087A35] bg-[#F0F9F4] px-2 py-0.5 rounded border border-[#087A35]/20">
              {nextInvoiceId}
            </span>
          </div>
        </div>

        <div className="w-12 text-left">
          <span className="text-xs font-black text-[#087A35] bg-[#F0F9F4] px-2 py-0.5 rounded-full border border-[#087A35]/20">
            {step}/3
          </span>
        </div>
      </div>

      {/* Progress Steps (High Density Compact) */}
      <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-2xs flex items-center justify-between">
        {/* Step 1 Pill */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step >= 1 ? 'bg-[#087A35] text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step > 1 ? <Check className="w-3 h-3" /> : '1'}
          </span>
          <span className={`text-xs font-bold ${step >= 1 ? 'text-[#087A35]' : 'text-gray-400'}`}>
            المشتري
          </span>
        </div>

        <span className="text-gray-300 text-xs">←</span>

        {/* Step 2 Pill */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step >= 2 ? 'bg-[#087A35] text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step > 2 ? <Check className="w-3 h-3" /> : '2'}
          </span>
          <span className={`text-xs font-bold ${step >= 2 ? 'text-[#087A35]' : 'text-gray-400'}`}>
            المنتجات {itemsCount > 0 && `(${itemsCount})`}
          </span>
        </div>

        <span className="text-gray-300 text-xs">←</span>

        {/* Step 3 Pill */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 3 ? 'bg-[#087A35] text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            3
          </span>
          <span className={`text-xs font-bold ${step === 3 ? 'text-[#087A35]' : 'text-gray-400'}`}>
            المراجعة
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1: بيانات المشتري */}
      {/* ========================================================= */}
      {step === 1 && (
        <form
          onSubmit={handleProceedToProducts}
          className="bg-white rounded-2xl p-5 shadow-2xs border border-gray-200 space-y-4 animate-in fade-in"
        >
          <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                <User className="w-4 h-4 text-[#087A35]" />
                بيانات المشتري
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                اختر من قائمة العملاء أو أدخل اسم زبون جديد
              </p>
            </div>
            {customers.length > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                {customers.length} عميل مسجل
              </span>
            )}
          </div>

          {/* Customer Selection from Registered List */}
          {customers.length > 0 && (
            <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 space-y-2">
              <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                اختر عميل مسجل بجدول العملاء:
              </label>
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCustomerId(id);
                    if (id) {
                      const found = sortedCustomers.find((c) => c.id === id);
                      if (found) {
                        setCustomerName(found.name);
                        setCustomerPhone(found.phone || '');
                        if (customerNameError) setCustomerNameError('');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- كود العميل / اختر عميل مسجل --</option>
                  {sortedCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">
              اسم المشتري <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (selectedCustomerId) {
                    const match = customers.find(c => c.name.trim() === e.target.value.trim());
                    if (!match) setSelectedCustomerId('');
                  }
                  if (customerNameError) setCustomerNameError('');
                }}
                placeholder="أدخل اسم المشتري (مثال: أحمد محمد)"
                className={`w-full pr-9 pl-3 py-2.5 rounded-xl bg-gray-50 border text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none transition-all ${
                  customerNameError
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#087A35]'
                }`}
                autoFocus
              />
            </div>
            {customerNameError && (
              <p className="text-[11px] text-red-500 font-bold">{customerNameError}</p>
            )}
          </div>

          {/* Customer Phone */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">
                رقم الهاتف
              </label>
              <span className="text-[10px] text-gray-400 font-medium">اختياري للمشاركة عبر واتساب</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="input-customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="أدخل رقم الهاتف (مثال: 0791234567)"
                className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#087A35] transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Invoice Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#087A35]" />
                تاريخ الفاتورة
              </label>
              <input
                id="input-invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#087A35] transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#087A35]" />
                وقت الفاتورة
              </label>
              <input
                id="input-invoice-time"
                type="time"
                value={invoiceTime}
                onChange={(e) => setInvoiceTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#087A35] transition-all"
              />
            </div>
          </div>

          {/* Quick Repeat Customer Suggestions */}
          <div className="pt-1">
            <p className="text-[10px] font-bold text-gray-400 mb-1.5">زبائن متكررون للسرعة:</p>
            <div className="flex flex-wrap gap-1">
              {['زبون عام', 'أحمد محمد', 'زبون مباشر', 'محمد علي', 'سامر حسن', 'طلب واتساب'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setCustomerName(name);
                    setCustomerNameError('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    customerName === name
                      ? 'bg-[#F0F9F4] text-[#087A35] border-[#087A35]/30'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button
            id="btn-step1-next"
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white font-bold text-sm shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4"
          >
            <span>التالي: اختيار المنتجات والأوزان</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* STEP 2: اختيار المنتجات */}
      {/* ========================================================= */}
      {step === 2 && (
        <div className="space-y-3 pb-32 animate-in fade-in">
          {/* Top Quick Status & Next Button Bar */}
          <div className="bg-[#F0F9F4] border-2 border-[#087A35]/40 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-gray-700">
                الأصناف المحددة:{' '}
                <span className="text-[#087A35] font-black text-sm">
                  {itemsCount} {itemsCount === 1 ? 'صنف' : 'أصناف'}
                </span>
              </div>
              <div className="text-base font-black text-[#087A35] leading-tight mt-0.5">
                {subtotal.toFixed(3)}{' '}
                <span className="text-xs font-normal text-gray-600">{settings.currency}</span>
              </div>
            </div>

            <button
              id="btn-step2-next-top"
              type="button"
              disabled={itemsCount === 0}
              onClick={handleProceedToReview}
              className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center gap-2 transition-all shrink-0 ${
                itemsCount > 0
                  ? 'bg-[#087A35] hover:bg-[#0A8F3D] text-white shadow-md active:scale-95 cursor-pointer ring-2 ring-[#087A35]/30 animate-pulse'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>التالي: مراجعة الفاتورة</span>
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Search & Category Filter (High Density) */}
          <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="input-product-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن صنف بالاسم (بندورة، خيار، تفاح...)"
                className="w-full pr-9 pl-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#087A35] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                id="tab-cat-all"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === 'all'
                    ? 'bg-[#087A35] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                الكل ({products.filter((p) => p.active).length})
              </button>

              <button
                id="tab-cat-vegetables"
                onClick={() => setActiveCategory(ProductCategory.VEGETABLES)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === ProductCategory.VEGETABLES
                    ? 'bg-[#087A35] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Carrot className="w-3.5 h-3.5" />
                <span>الخضار</span>
              </button>

              <button
                id="tab-cat-fruits"
                onClick={() => setActiveCategory(ProductCategory.FRUITS)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === ProductCategory.FRUITS
                    ? 'bg-[#087A35] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>الفواكه</span>
              </button>

              <button
                id="tab-cat-herbs"
                onClick={() => setActiveCategory(ProductCategory.LEAFY)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === ProductCategory.LEAFY
                    ? 'bg-[#087A35] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ورقيات وأعشاب</span>
              </button>

              <button
                id="tab-cat-boxes"
                onClick={() => setActiveCategory(ProductCategory.BOXES)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === ProductCategory.BOXES
                    ? 'bg-[#087A35] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>بكسات وشوالات</span>
              </button>
            </div>
          </div>

          {/* Products Grid (High Density) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredProducts.map((product) => {
              const selectedItem = selectedItems.get(product.id);
              const isSelected = !!selectedItem;
              const currentQty = selectedItem ? selectedItem.quantity : 0;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  className={`bg-white rounded-2xl p-3 border transition-all ${
                    isSelected
                      ? 'bg-[#F0F9F4]/70 border-[#087A35] shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Product Photo */}
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-200 relative flex items-center justify-center text-lg">
                      {product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{product.image || '🥗'}</span>
                      )}
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#087A35] text-white flex items-center justify-center text-[9px]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-[#1A1A1A] truncate">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-black text-xs text-[#087A35]">
                          {product.price.toFixed(3)}{' '}
                          <span className="text-[10px] font-normal text-gray-500">
                            {settings.currency}
                          </span>
                        </span>
                        <span className="text-[10px] text-gray-400">
                          / {product.unit}
                        </span>
                      </div>
                    </div>

                    {/* Quick Add Button if not selected */}
                    {!isSelected && (
                      <button
                        id={`btn-add-product-${product.id}`}
                        onClick={() => handleUpdateQuantity(product, 1.0)}
                        className="w-8 h-8 rounded-lg bg-[#F0F9F4] hover:bg-[#087A35] text-[#087A35] hover:text-white border border-[#087A35]/30 flex items-center justify-center transition-all active:scale-95 shrink-0"
                        title="إضافة"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>

                  {/* Quantity & Weight Controls (When Selected) */}
                  {isSelected && (() => {
                    const config = getUnitConfig(product.unit);
                    return (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between gap-1.5">
                          {/* Minus / Delete */}
                          <button
                            id={`btn-qty-minus-${product.id}`}
                            onClick={() => {
                              if (currentQty <= config.step) {
                                handleUpdateQuantity(product, 0);
                              } else {
                                handleUpdateQuantity(product, Math.max(0, currentQty - config.step));
                              }
                            }}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                            title={currentQty <= config.step ? 'حذف' : `إنقاص ${config.stepLabel}`}
                          >
                            {currentQty <= config.step ? (
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Direct Decimal Input with 3 Decimal Places */}
                          <div className="flex-1 relative flex items-center justify-center">
                            <input
                              id={`input-qty-${product.id}`}
                              type="text"
                              inputMode="decimal"
                              value={wizardQtyInputs[product.id] !== undefined ? wizardQtyInputs[product.id] : (currentQty === 0 ? '' : String(currentQty))}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/[,،٫]/g, '.');
                                setWizardQtyInputs(prev => ({ ...prev, [product.id]: cleaned }));
                                handleQuantityInputChange(product, cleaned);
                              }}
                              className="w-full text-center py-1 px-2 font-black text-xs text-[#087A35] bg-white rounded-lg border border-[#087A35] focus:outline-none"
                              placeholder="0.000"
                            />
                            <span className="absolute left-2 text-[10px] font-bold text-gray-400 pointer-events-none">
                              {product.unit}
                            </span>
                          </div>

                          {/* Plus */}
                          <button
                            id={`btn-qty-plus-${product.id}`}
                            onClick={() => handleUpdateQuantity(product, currentQty + config.step)}
                            className="w-7 h-7 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white flex items-center justify-center transition-colors active:scale-95 shrink-0"
                            title={`زيادة ${config.stepLabel}`}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Quick Weight Chips */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                          {config.presets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateQuantity(product, preset)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors shrink-0 ${
                                Math.abs(currentQty - preset) < 0.001
                                  ? 'bg-[#087A35] text-white border-[#087A35]'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {config.getLabel(preset, product.unit)}
                            </button>
                          ))}
                        </div>

                        {/* Item Subtotal Calculation */}
                        <div className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-lg border border-gray-200">
                          <span className="text-gray-500 font-medium">إجمالي الصنف:</span>
                          <span className="font-black text-[#087A35]">
                            {selectedItem.total.toFixed(3)} {settings.currency}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Floating Sticky Bottom Bar for Step 2 */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 shadow-2xl no-print">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500 font-bold">
                  الأصناف المحددة: <span className="text-[#087A35] font-black">{itemsCount}</span>
                </div>
                <div className="text-lg font-black text-[#087A35] leading-tight">
                  {subtotal.toFixed(3)}{' '}
                  <span className="text-xs font-normal text-gray-500">
                    {settings.currency}
                  </span>
                </div>
              </div>

              <button
                id="btn-step2-next"
                type="button"
                disabled={itemsCount === 0}
                onClick={handleProceedToReview}
                className={`py-3 px-6 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md ${
                  itemsCount > 0
                    ? 'bg-[#087A35] hover:bg-[#0A8F3D] active:bg-[#076B2E] text-white cursor-pointer active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>التالي: مراجعة الفاتورة ({itemsCount})</span>
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: مراجعة الفاتورة */}
      {/* ========================================================= */}
      {step === 3 && (
        <div className="space-y-3.5 animate-in fade-in">
          {/* Customer Summary Card */}
          <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-gray-200 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
              <span className="text-xs font-bold text-gray-400">بيانات المشتري</span>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold text-[#087A35] hover:underline"
              >
                تعديل
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-[#1A1A1A]">{customerName}</div>
                {customerPhone && (
                  <div className="text-xs text-gray-500 font-medium mt-0.5" dir="ltr">
                    {customerPhone}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F0F9F4] text-[#087A35] text-xs font-bold border border-[#087A35]/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#087A35]" />
                  {nextInvoiceId}
                </span>
              </div>
            </div>
          </div>

          {/* Products Summary Table */}
          <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
              <span className="text-xs font-bold text-gray-400">
                المنتجات المحددة ({itemsCount})
              </span>
              <button
                onClick={() => setStep(2)}
                className="text-xs font-bold text-[#087A35] hover:underline"
              >
                + إضافة / تعديل
              </button>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              {itemsArray.map((item, idx) => (
                <div key={item.productId} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-4">
                      {idx + 1}.
                    </span>
                    <div>
                      <div className="font-bold text-xs text-[#1A1A1A]">
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        {item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity.toFixed(3).replace(/\.?0+$/, '')} {item.unit} × {item.unitPrice.toFixed(3)} {settings.currency}
                      </div>
                    </div>
                  </div>

                  <div className="text-left font-black text-xs text-[#087A35]">
                    {item.total.toFixed(3)}{' '}
                    <span className="text-[10px] font-normal text-gray-500">
                      {settings.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal, Discount, and Grand Total Calculations */}
            <div className="border-t border-gray-200 pt-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">المجموع الفرعي:</span>
                <span className="font-bold text-[#1A1A1A]">
                  {subtotal.toFixed(3)} {settings.currency}
                </span>
              </div>

              {/* Delivery Fee Input */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#087A35]" />
                  رسوم التوصيل:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    id="input-review-delivery-fee"
                    type="text"
                    inputMode="decimal"
                    value={deliveryFeeStr}
                    onChange={(e) => setDeliveryFeeStr(e.target.value.replace(/[,،٫]/g, '.'))}
                    placeholder="0.00"
                    className="w-20 py-0.5 px-2 text-left font-bold text-xs bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:border-[#087A35] focus:outline-none"
                  />
                  <span className="text-xs text-gray-500 font-bold">{settings.currency}</span>
                </div>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  الخصم إن وجد:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    id="input-review-discount"
                    type="text"
                    inputMode="decimal"
                    value={discountStr}
                    onChange={(e) => setDiscountStr(e.target.value.replace(/[,،٫]/g, '.'))}
                    placeholder="0.00"
                    className="w-20 py-0.5 px-2 text-left font-bold text-xs bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:border-[#087A35] focus:outline-none"
                  />
                  <span className="text-xs text-gray-500 font-bold">{settings.currency}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F0F9F4] border border-[#087A35]/30">
                <span className="font-bold text-gray-800">الإجمالي النهائي:</span>
                <span className="font-black text-lg text-[#087A35]">
                  {grandTotal.toFixed(3)}{' '}
                  <span className="text-xs font-semibold text-gray-600">
                    {settings.currency}
                  </span>
                </span>
              </div>

              {/* Payment Method / Status Clarification */}
              <div className="border-t border-gray-100 pt-3.5 mt-2 space-y-2">
                <span className="text-xs font-bold text-gray-500">حالة الدفع (طبيعة الفاتورة):</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-pay-cash"
                    onClick={() => setInvoicePaymentType('cash')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                      invoicePaymentType === 'cash'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm">💵 نقدي</span>
                    <span className="text-[10px] font-normal opacity-80">فاتورة نقدي</span>
                  </button>

                  <button
                    type="button"
                    id="btn-pay-debt"
                    onClick={() => setInvoicePaymentType('debt')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                      invoicePaymentType === 'debt'
                        ? 'bg-amber-50 text-amber-800 border-amber-500 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm">📝 ذمم</span>
                    <span className="text-[10px] font-normal opacity-80">ذمم آجل</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Finalize Button */}
          <button
            id="btn-finalize-invoice"
            onClick={handleFinalizeInvoice}
            disabled={isSubmitting}
            className={`w-full py-3.5 px-5 rounded-xl text-white font-bold text-base shadow-xs transition-all flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed opacity-80'
                : 'bg-[#087A35] hover:bg-[#0A8F3D] active:bg-[#076B2E] active:scale-[0.99] cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSubmitting ? 'جاري الحفظ والمزامنة...' : 'حفظ وإصدار الفاتورة'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
