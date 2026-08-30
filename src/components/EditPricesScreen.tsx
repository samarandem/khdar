import React, { useState } from 'react';
import { Product, ShopSettings } from '../types';
import { SlidersHorizontal, Save, Calendar, Check } from 'lucide-react';
import { parsePriceValue } from '../services/excelService';

interface EditPricesScreenProps {
  products: Product[];
  settings: ShopSettings;
  onSavePrices?: (updatedProducts: Product[]) => void;
  onSave?: (updatedProducts: Product[]) => void;
  onBack?: () => void;
  onCancel?: () => void;
}

export const EditPricesScreen: React.FC<EditPricesScreenProps> = ({
  products,
  settings,
  onSavePrices,
  onSave,
  onBack,
  onCancel,
}) => {
  const handleBack = () => {
    if (onBack) onBack();
    else if (onCancel) onCancel();
  };

  const handleSave = (updated: Product[]) => {
    if (onSavePrices) onSavePrices(updated);
    else if (onSave) onSave(updated);
  };

  const [priceMap, setPriceMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    products.forEach((p) => {
      initial[p.id] = p.price.toString();
    });
    return initial;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePriceChange = (productId: string, val: string) => {
    // Automatically convert comma or Arabic comma to decimal dot
    const cleanVal = val.replace(/[,،٫]/g, '.');
    setPriceMap((prev) => ({
      ...prev,
      [productId]: cleanVal,
    }));
    setSavedSuccess(false);
  };

  const handleSaveAll = () => {
    const updated = products.map((p) => {
      const valStr = priceMap[p.id];
      const parsed = parsePriceValue(valStr, p.unit);
      return {
        ...p,
        price: parsed !== null && parsed >= 0 ? parsed : p.price,
      };
    });

    handleSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const todayFormatted = new Date().toLocaleDateString('ar-JO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-3.5 pb-28 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold border border-amber-200/60">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-[#1A1A1A] leading-tight">
              تعديل أسعار المنتجات
            </h2>
            <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-amber-700" />
              <span>{todayFormatted}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleBack}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          رجوع
        </button>
      </div>

      {/* Success Banner if saved */}
      {savedSuccess && (
        <div className="bg-[#F0F9F4] border border-[#087A35]/30 text-[#087A35] text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#087A35]" />
          <span>تم حفظ الأسعار الجديدة بنجاح وتحديث النظام!</span>
        </div>
      )}

      {/* Products Price List Table (High Density) */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 space-y-2">
        <div className="divide-y divide-gray-100">
          {products.map((product) => (
            <div
              key={product.id}
              className="py-2 flex items-center justify-between gap-2.5"
            >
              {/* Product Info & Image */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-200 flex items-center justify-center text-sm">
                  {product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <span>{product.image || '🥗'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#1A1A1A] truncate">
                    {product.name}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    الحالي: {product.price.toFixed(3)} {settings.currency} / {product.unit}
                  </div>
                </div>
              </div>

              {/* Price Input Field */}
              <div className="flex items-center gap-1 shrink-0">
                <input
                  id={`input-edit-price-${product.id}`}
                  type="text"
                  inputMode="decimal"
                  value={priceMap[product.id] ?? ''}
                  onChange={(e) => handlePriceChange(product.id, e.target.value)}
                  className="w-20 text-center py-1 px-1.5 text-xs font-black text-[#087A35] bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:border-[#087A35] focus:outline-none"
                  placeholder="0.000"
                />
                <span className="text-[10px] font-bold text-gray-500">
                  {settings.currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 p-2.5 shadow-md no-print">
        <div className="max-w-md mx-auto">
          <button
            id="btn-save-all-prices"
            onClick={handleSaveAll}
            className="w-full py-2.5 px-4 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white font-bold text-sm shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الأسعار لليوم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
