import React, { useState, useMemo, useRef } from 'react';
import { Product, ProductCategory, ShopSettings } from '../types';
import { isCategoryMatch } from '../utils/categoryUtils';
import {
  Carrot,
  Apple,
  Sparkles,
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  RotateCcw,
  FileSpreadsheet,
  Cloud,
  Check,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { exportProductsToExcel, importProductsFromExcel, parsePriceValue } from '../services/excelService';

interface ProductsScreenProps {
  products: Product[];
  settings: ShopSettings;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
  onBatchUpdateProducts?: (products: Product[]) => void;
  onResetOfficialPrices?: () => void;
  onSyncCloud?: () => void;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({
  products,
  settings,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onBatchUpdateProducts,
  onResetOfficialPrices,
  onSyncCloud,
  isCloudConnected = false,
  isSyncing = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [exportNotice, setExportNotice] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>(ProductCategory.VEGETABLES);
  const [formUnit, setFormUnit] = useState('كغ');
  const [formPrice, setFormPrice] = useState('0.750');
  const [formImage, setFormImage] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = isCategoryMatch(p.category, activeCategory);
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormUnit(prod.unit);
    setFormPrice(prod.price.toString());
    setFormImage(prod.image);
    setFormActive(prod.active);
  };

  const handleOpenAdd = () => {
    setIsAddingNew(true);
    setFormName('');
    setFormCategory(ProductCategory.VEGETABLES);
    setFormUnit('كغ');
    setFormPrice('1.000');
    setFormImage('https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80');
    setFormActive(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('يرجى كتابة اسم المنتج');
      return;
    }

    const priceNum = parsePriceValue(formPrice, formUnit.trim() || 'كغ');
    if (priceNum === null || priceNum < 0) {
      alert('يرجى إدخال سعر صحيح (مثال: 0.39 أو 0.500)');
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: formName.trim(),
        category: formCategory,
        unit: formUnit.trim() || 'كغ',
        price: priceNum,
        image: formImage.trim() || editingProduct.image,
        active: formActive,
      });
      setEditingProduct(null);
    } else if (isAddingNew) {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        unit: formUnit.trim() || 'كغ',
        price: priceNum,
        image: formImage.trim() || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80',
        active: formActive,
      };
      onAddProduct(newProd);
      setIsAddingNew(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsProcessingImport(true);
      const result = await importProductsFromExcel(file, products);
      if (onBatchUpdateProducts) {
        onBatchUpdateProducts(result.updatedProducts);
      }
      setImportStatus({
        show: true,
        success: true,
        message: `تم بنجاح تحديث أسعار ${result.matchedCount} صنف${
          result.addedCount > 0 ? ` وإضافة ${result.addedCount} صنف جديد` : ''
        } من ملف الإكسل (${file.name})!`,
      });
    } catch (err: any) {
      setImportStatus({
        show: true,
        success: false,
        message: err?.message || 'فشل استيراد الأسعار من ملف الإكسل',
      });
    } finally {
      setIsProcessingImport(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3.5 pb-28 animate-in fade-in duration-200">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Title & Add Button (High Density) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="font-extrabold text-base text-[#1A1A1A]">دليل المنتجات والأسعار</h2>
          <p className="text-[11px] text-gray-500 font-medium">
            إدارة {products.length} صنف خضار وفواكه وبكسات وشوالات
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="btn-products-import-excel"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 transition-all active:scale-95 shadow-2xs"
            title="استيراد وتحديث الأسعار من ملف إكسل من جهازك"
          >
            <Upload className={`w-3.5 h-3.5 ${isProcessingImport ? 'animate-spin' : ''}`} />
            <span>{isProcessingImport ? 'جاري القراءة...' : 'استيراد أسعار Excel'}</span>
          </button>

          <button
            id="btn-products-export-excel"
            onClick={() => {
              exportProductsToExcel(products, `دليل_منتجات_${settings.shopName.replace(/\s+/g, '_')}`);
              setExportNotice(true);
              setTimeout(() => setExportNotice(false), 3000);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F0F9F4] hover:bg-[#E2F4EB] text-[#087A35] text-xs font-bold border border-[#087A35]/30 transition-all active:scale-95 shadow-2xs"
            title="تحميل جدول إكسل بكامل المنتجات والأسعار"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </button>

          {onResetOfficialPrices && (
            <button
              id="btn-products-reset-official"
              onClick={() => {
                if (
                  window.confirm(
                    'هل ترغب في إعادة تطبيق وتحديث كافة الأسعار الرسمية لـ 114+ صنف خضار وفواكه؟'
                  )
                ) {
                  onResetOfficialPrices();
                  setImportStatus({
                    show: true,
                    success: true,
                    message: 'تم تطبيق وتحديث لائحة الأسعار الرسمية بالكامل لجميع الأصناف!',
                  });
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold border border-gray-300 transition-all active:scale-95 shadow-2xs"
              title="تطبيق وتحديث كافة الأسعار الرسمية (114 صنف)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>الأسعار الرسمية</span>
            </button>
          )}

          {onSyncCloud && (
            <button
              id="btn-products-sync-cloud"
              onClick={onSyncCloud}
              disabled={isSyncing}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-2xs ${
                isCloudConnected
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
              title="مزامنة المنتجات مع قاعدة بيانات Google Sheets"
            >
              <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'مزامنة...' : isCloudConnected ? 'مزامنة Sheets' : 'ربط Sheets'}</span>
            </button>
          )}

          <button
            id="btn-products-add-new"
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة صنف</span>
          </button>
        </div>
      </div>

      {importStatus && importStatus.show && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
            importStatus.success
              ? 'bg-[#F0F9F4] border border-[#087A35]/30 text-[#087A35]'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {importStatus.success ? (
              <Check className="w-4 h-4 text-[#087A35] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {exportNotice && (
        <div className="bg-[#F0F9F4] border border-[#087A35]/30 text-[#087A35] text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#087A35]" />
          <span>تم تنزيل ملف الإكسل (Excel .xlsx) بنجاح متضمناً جميع الأصناف والأسعار!</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200 space-y-2.5">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-products-manage-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full pr-9 pl-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#1A1A1A] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#087A35] transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-[#087A35] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل ({products.length})
          </button>

          <button
            onClick={() => setActiveCategory(ProductCategory.VEGETABLES)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeCategory === ProductCategory.VEGETABLES
                ? 'bg-[#087A35] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Carrot className="w-3.5 h-3.5" />
            <span>الخضار</span>
          </button>

          <button
            onClick={() => setActiveCategory(ProductCategory.FRUITS)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeCategory === ProductCategory.FRUITS
                ? 'bg-[#087A35] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>الفواكه</span>
          </button>

          <button
            onClick={() => setActiveCategory(ProductCategory.LEAFY)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeCategory === ProductCategory.LEAFY
                ? 'bg-[#087A35] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>الأعشاب</span>
          </button>

          <button
            onClick={() => setActiveCategory(ProductCategory.BOXES)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
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
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs flex items-center justify-between gap-2.5 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-200 flex items-center justify-center text-lg">
                {prod.image && (prod.image.startsWith('http') || prod.image.startsWith('data:')) ? (
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <span>{prod.image || '🥗'}</span>
                )}
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-xs text-[#1A1A1A] truncate">
                  {prod.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                  <span className="font-black text-[#087A35]">
                    {prod.price.toFixed(3)} {settings.currency}
                  </span>
                  <span className="text-gray-400 text-[10px]">/ {prod.unit}</span>
                </div>
                <span className="inline-block text-[10px] text-gray-400 font-medium">
                  {prod.category === ProductCategory.VEGETABLES
                    ? 'خضار'
                    : prod.category === ProductCategory.FRUITS
                    ? 'فواكه'
                    : prod.category === ProductCategory.LEAFY
                    ? 'ورقيات وأعشاب'
                    : 'بكسات وشوالات'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                id={`btn-edit-prod-${prod.id}`}
                onClick={() => handleOpenEdit(prod)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#F0F9F4] hover:text-[#087A35] text-gray-600 flex items-center justify-center transition-colors"
                title="تعديل المنتج"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {onDeleteProduct && (
                <button
                  id={`btn-delete-prod-${prod.id}`}
                  onClick={() => setProductToDelete(prod)}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition-colors"
                  title="حذف المنتج"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Delete Product Confirmation */}
      {productToDelete && (
        <div
          onClick={() => setProductToDelete(null)}
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl border border-gray-200 text-center space-y-3.5 animate-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-[#1A1A1A]">
                هل أنت متأكد من حذف هذا المنتج؟
              </h3>
              <div className="inline-block px-2.5 py-0.5 rounded-lg bg-gray-100 text-[#1A1A1A] text-xs font-bold border border-gray-200 mt-0.5">
                {productToDelete.name} ({productToDelete.price.toFixed(3)} {settings.currency})
              </div>
              <p className="text-[11px] text-gray-500 pt-0.5">
                سيتم إزالة هذا الصنف من قائمة المنتجات المتاحة لإصدار الفواتير.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduct) onDeleteProduct(productToDelete);
                  setProductToDelete(null);
                }}
                className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Product */}
      {(editingProduct || isAddingNew) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl border border-gray-200 space-y-3 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-xs text-[#1A1A1A]">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingNew(false);
                }}
                className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                اسم المنتج <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: بندورة بلدية"
                className="w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold focus:bg-white focus:border-[#087A35] focus:outline-none"
                required
              />
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                  التصنيف
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                  className="w-full px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold focus:bg-white focus:border-[#087A35] focus:outline-none"
                >
                  <option value={ProductCategory.VEGETABLES}>خضار</option>
                  <option value={ProductCategory.FRUITS}>فواكه</option>
                  <option value={ProductCategory.LEAFY}>أعشاب / ورقيات</option>
                  <option value={ProductCategory.BOXES}>بكسات وشوالات (جملة)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                  الوحدة
                </label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold focus:bg-white focus:border-[#087A35] focus:outline-none"
                >
                  <option value="كغ">كغ (كيلوغرام)</option>
                  <option value="حبة">حبة</option>
                  <option value="ضمة">ضمة</option>
                  <option value="ربطة">ربطة</option>
                  <option value="بكسة">بكسة</option>
                  <option value="شوال">شوال</option>
                  <option value="علبة">علبة</option>
                  <option value="صحن">صحن</option>
                  <option value="شرحة">شرحة</option>
                  <option value="كرتونة">كرتونة</option>
                  <option value="صندوق">صندوق</option>
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                سعر الوحدة ({settings.currency}) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value.replace(/[,،٫]/g, '.'))}
                placeholder="0.390"
                className="w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-black text-[#087A35] focus:bg-white focus:border-[#087A35] focus:outline-none"
                required
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                رابط صورة المنتج
              </label>
              <input
                type="url"
                value={formImage}
                onChange={(e) => setFormImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[10px] font-mono focus:bg-white focus:border-[#087A35] focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingNew(false);
                }}
                className="py-1.5 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="py-1.5 px-3 rounded-lg bg-[#087A35] hover:bg-[#0A8F3D] text-white text-xs font-bold shadow-xs"
              >
                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
