import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, Product, ShopSettings } from '../types';
import { parseArabicFloat } from '../utils/arabicNumbers';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Save,
  Tag,
  Calendar,
  Clock,
  Truck
} from 'lucide-react';

interface EditInvoiceModalProps {
  invoice: Invoice;
  products: Product[];
  settings: ShopSettings;
  onClose: () => void;
  onSave: (updatedInvoice: Invoice) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  products,
  settings,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState(invoice.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(invoice.customerPhone || '');
  const [invoiceDate, setInvoiceDate] = useState(invoice.date || new Date().toISOString().split('T')[0]);
  const [invoiceTime, setInvoiceTime] = useState(invoice.time || '12:00');
  const [items, setItems] = useState<InvoiceItem[]>(() =>
    (invoice.items || []).map((it) => {
      const q = Math.round((parseArabicFloat(it.quantity) || 0) * 1000) / 1000;
      const p = Math.round((parseArabicFloat(it.unitPrice ?? (it as any).price) || 0) * 1000) / 1000;
      return {
        ...it,
        quantity: q,
        unitPrice: p,
        total: Math.round(q * p * 100) / 100,
      };
    })
  );
  const [deliveryFeeStr, setDeliveryFeeStr] = useState<string>(() => {
    const f = parseArabicFloat(invoice.deliveryFee);
    return f > 0 ? String(f) : (invoice.deliveryFee === 0 || invoice.deliveryFee === '0' ? '0' : '');
  });
  const [discountStr, setDiscountStr] = useState<string>(() => {
    const d = parseArabicFloat(invoice.discount);
    return d > 0 ? String(d) : (invoice.discount === 0 || invoice.discount === '0' ? '0' : '');
  });
  const [showAddProductPicker, setShowAddProductPicker] = useState(false);
  const [addProductSearch, setAddProductSearch] = useState('');

  useEffect(() => {
    setCustomerName(invoice.customerName || '');
    setCustomerPhone(invoice.customerPhone || '');
    setInvoiceDate(invoice.date || new Date().toISOString().split('T')[0]);
    setInvoiceTime(invoice.time || '12:00');
    setItems(
      (invoice.items || []).map((it) => {
        const q = Math.round((parseArabicFloat(it.quantity) || 0) * 1000) / 1000;
        const p = Math.round((parseArabicFloat(it.unitPrice ?? (it as any).price) || 0) * 1000) / 1000;
        return {
          ...it,
          quantity: q,
          unitPrice: p,
          total: Math.round(q * p * 100) / 100,
        };
      })
    );
    const fVal = parseArabicFloat(invoice.deliveryFee);
    setDeliveryFeeStr(fVal > 0 ? String(fVal) : (invoice.deliveryFee === 0 || invoice.deliveryFee === '0' ? '0' : ''));
    const dVal = parseArabicFloat(invoice.discount);
    setDiscountStr(dVal > 0 ? String(dVal) : (invoice.discount === 0 || invoice.discount === '0' ? '0' : ''));
  }, [invoice]);

  // Handle Item Quantity Change
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    const roundedQty = Math.round(newQty * 1000) / 1000;
    const unitPrice = updated[index].unitPrice;
    const total = Math.round(roundedQty * unitPrice * 100) / 100;
    updated[index] = {
      ...updated[index],
      quantity: roundedQty,
      total,
    };
    setItems(updated);
  };

  // Handle Quantity text input
  const handleQuantityTextChange = (index: number, textVal: string) => {
    const parsed = parseArabicFloat(textVal);
    const updated = [...items];
    if (parsed <= 0) {
      updated[index] = {
        ...updated[index],
        quantity: 0,
        total: 0,
      };
    } else {
      const roundedQty = Math.round(parsed * 1000) / 1000;
      const unitPrice = updated[index].unitPrice;
      updated[index] = {
        ...updated[index],
        quantity: roundedQty,
        total: Math.round(roundedQty * unitPrice * 100) / 100,
      };
    }
    setItems(updated);
  };

  // Handle Item Unit Price Change
  const handleUnitPriceChange = (index: number, textVal: string) => {
    const parsed = parseArabicFloat(textVal);
    const updated = [...items];
    const unitPrice = parsed < 0 ? 0 : Math.round(parsed * 1000) / 1000;
    const qty = updated[index].quantity;
    const total = Math.round(qty * unitPrice * 100) / 100;
    updated[index] = {
      ...updated[index],
      unitPrice,
      total,
    };
    setItems(updated);
  };

  // Handle Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  // Handle Add Product from Catalog
  const handleAddProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex !== -1) {
      handleQuantityChange(existingIndex, items[existingIndex].quantity + 1);
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        productName: product.name,
        category: product.category,
        image: product.image,
        unit: product.unit,
        quantity: 1.0,
        unitPrice: product.price,
        total: Math.round(product.price * 100) / 100,
      };
      setItems([...items, newItem]);
    }
    setShowAddProductPicker(false);
  };

  // Calculate totals
  const subtotal = Math.round(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100;
  const parsedDeliveryFee = (() => {
    const f = parseArabicFloat(deliveryFeeStr);
    return isNaN(f) || f < 0 ? 0 : Math.round(f * 100) / 100;
  })();
  const parsedDiscount = (() => {
    const d = parseArabicFloat(discountStr);
    return isNaN(d) || d < 0 ? 0 : Math.round(d * 100) / 100;
  })();
  const grandTotal = Math.max(0, Math.round((subtotal + parsedDeliveryFee - parsedDiscount) * 100) / 100);

  const handleSave = () => {
    if (!customerName.trim()) {
      alert('يرجى إدخال اسم المشتري');
      return;
    }
    const validItems = items.filter((it) => it.quantity > 0);
    if (validItems.length === 0) {
      alert('يجب أن تحتوي الفاتورة على صنف واحد على الأقل بكمية صالحة');
      return;
    }

    const cleanItems = validItems.map((it) => {
      const q = Math.round(Number(it.quantity) * 1000) / 1000;
      const p = Math.round(Number(it.unitPrice) * 1000) / 1000;
      return {
        ...it,
        quantity: q,
        unitPrice: p,
        total: Math.round(q * p * 100) / 100,
      };
    });

    const cleanSubtotal = Math.round(
      cleanItems.reduce((s, i) => s + i.total, 0) * 100
    ) / 100;
    const cleanGrandTotal = Math.max(
      0,
      Math.round((cleanSubtotal + parsedDeliveryFee - parsedDiscount) * 100) / 100
    );

    const updatedInvoice: Invoice = {
      ...invoice,
      date: invoiceDate.trim() || invoice.date,
      time: invoiceTime.trim() || invoice.time,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      items: cleanItems,
      subtotal: cleanSubtotal,
      deliveryFee: parsedDeliveryFee > 0 ? parsedDeliveryFee : undefined,
      discount: parsedDiscount,
      total: cleanGrandTotal,
    };

    onSave(updatedInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar (High Density) */}
        <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/90">
          <div>
            <h3 className="font-extrabold text-sm text-[#1A1A1A] leading-tight">
              تعديل الفاتورة
            </h3>
            <span className="text-xs font-bold text-[#087A35]">
              {invoice.id} • {invoiceDate}
            </span>
          </div>

          <button
            id="btn-close-edit-invoice"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
          {/* Customer Name, Phone, Date & Time */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
            <h4 className="text-[11px] font-bold text-gray-500">بيانات الفاتورة والمشتري</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                  اسم المشتري <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-edit-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 focus:border-[#087A35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  id="input-edit-customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 focus:border-[#087A35] focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-200/70">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#087A35]" />
                  تاريخ الفاتورة
                </label>
                <input
                  id="input-edit-invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 focus:border-[#087A35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#087A35]" />
                  وقت الفاتورة
                </label>
                <input
                  id="input-edit-invoice-time"
                  type="time"
                  value={invoiceTime}
                  onChange={(e) => setInvoiceTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 focus:border-[#087A35] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Products List & Editing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700">
                المنتجات والكميات ({items.length})
              </h4>
              <button
                id="btn-edit-add-product"
                type="button"
                onClick={() => setShowAddProductPicker(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F9F4] hover:bg-[#E2F4EB] text-[#087A35] text-xs font-bold border border-[#087A35]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ إضافة منتج</span>
              </button>
            </div>

            {/* Product Items Cards (High Density) */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-400">{idx + 1}.</span>
                      <span className="font-bold text-xs text-[#1A1A1A]">
                        {item.productName}
                      </span>
                    </div>

                    <button
                      id={`btn-remove-edit-item-${idx}`}
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center text-xs">
                    {/* Quantity Control */}
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium block mb-0.5">
                        الكمية ({item.unit})
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, Math.max(0, item.quantity - 0.250))}
                          className="w-6 h-6 rounded bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleQuantityTextChange(idx, e.target.value.replace(/[,،٫]/g, '.'))}
                          placeholder="0.000"
                          className="w-full text-center py-0.5 px-1 text-xs font-black rounded bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#087A35] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, item.quantity + 0.250)}
                          className="w-6 h-6 rounded bg-[#F0F9F4] text-[#087A35] flex items-center justify-center font-bold text-xs border border-[#087A35]/30"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium block mb-0.5">
                        سعر الوحدة
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                        onChange={(e) => handleUnitPriceChange(idx, e.target.value.replace(/[,،٫]/g, '.'))}
                        placeholder="0.000"
                        className="w-full text-center py-1 px-1.5 text-xs font-bold rounded bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#087A35] focus:outline-none"
                      />
                    </div>

                    {/* Subtotal of item */}
                    <div className="text-left">
                      <span className="text-[10px] text-gray-400 font-medium block mb-0.5">
                        الإجمالي
                      </span>
                      <div className="font-black text-xs text-[#087A35]">
                        {item.total.toFixed(2)} {settings.currency}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Discount Adjustment */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">المجموع الفرعي:</span>
              <span className="font-bold text-[#1A1A1A]">
                {subtotal.toFixed(2)} {settings.currency}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#087A35]" />
                خدمة التوصيل:
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="input-edit-delivery-fee"
                  type="text"
                  inputMode="decimal"
                  value={deliveryFeeStr}
                  onChange={(e) => setDeliveryFeeStr(e.target.value.replace(/[,،٫]/g, '.'))}
                  placeholder="0.00"
                  className="w-20 py-0.5 px-2 text-left font-bold rounded bg-white border border-gray-200 focus:border-[#087A35] focus:outline-none"
                />
                <span>{settings.currency}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">الخصم:</span>
              <div className="flex items-center gap-1">
                <input
                  id="input-edit-discount"
                  type="text"
                  inputMode="decimal"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value.replace(/[,،٫]/g, '.'))}
                  placeholder="0.00"
                  className="w-20 py-0.5 px-2 text-left font-bold rounded bg-white border border-gray-200 focus:border-[#087A35] focus:outline-none"
                />
                <span>{settings.currency}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs bg-[#F0F9F4] px-2.5 py-2 rounded-lg border border-[#087A35]/30">
              <span className="font-bold text-gray-800">الإجمالي النهائي:</span>
              <span className="font-black text-sm text-[#087A35]">
                {grandTotal.toFixed(2)} {settings.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors"
          >
            إلغاء
          </button>

          <button
            id="btn-save-invoice-changes"
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ التعديلات</span>
          </button>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showAddProductPicker && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-3.5 shadow-2xl border border-gray-200 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-xs text-[#1A1A1A]">اختر منتج لإضافته</h4>
              <button
                onClick={() => setShowAddProductPicker(false)}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <input
              type="text"
              value={addProductSearch}
              onChange={(e) => setAddProductSearch(e.target.value)}
              placeholder="ابحث بالاسم..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#087A35]"
            />

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 space-y-0.5">
              {products
                .filter(
                  (p) =>
                    p.active &&
                    (!addProductSearch ||
                      p.name.toLowerCase().includes(addProductSearch.toLowerCase()))
                )
                .map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className="p-2 flex items-center justify-between hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1A1A1A]">{prod.name}</div>
                      <div className="text-[10px] text-[#087A35] font-bold">
                        {prod.price.toFixed(3)} {settings.currency} / {prod.unit}
                      </div>
                    </div>
                    <button className="px-2 py-0.5 rounded bg-[#087A35] text-white text-[10px] font-bold">
                      + إضافة
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
