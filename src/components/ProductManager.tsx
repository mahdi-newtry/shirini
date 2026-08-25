import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Image as ImageIcon, 
  Check, 
  X, 
  SlidersHorizontal,
  CakeSlice,
  Clock,
  Sparkles,
  ArrowUpDown,
  Tag,
  Upload
} from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { formatPrice, toPersianDigits } from '../utils/formatters';
import { AddProductModal } from './AddProductModal';
import { EditPriceModal } from './EditPriceModal';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPriceProduct, setEditingPriceProduct] = useState<Product | null>(null);
  const [changingPhotoProduct, setChangingPhotoProduct] = useState<Product | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: (ProductCategory | 'all')[] = [
    'all',
    'کیک و پای',
    'شیرینی تر و خامه‌ای',
    'شیرینی خشک و سنتی',
    'دسر و باقلوا',
    'کوکی و بیسکوئیت',
    'نان و کروسان',
  ];

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری انتخاب کنید.');
      return;
    }
    
    // Upload to server
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewPhotoUrl(data.url);
        setUploadedBase64(null);
      } else {
        alert('خطا در آپلود عکس');
      }
    } catch (err) {
      alert('خطا در آپلود عکس');
    }
  };

  const handlePhotoUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPhotoProduct) return;
    const targetImage = uploadedBase64 || newPhotoUrl.trim();
    if (!targetImage) return;

    await onUpdateProduct(changingPhotoProduct.id, { image: targetImage });
    setChangingPhotoProduct(null);
    setNewPhotoUrl('');
    setUploadedBase64(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
            <CakeSlice className="w-3.5 h-3.5" />
            <span>پنل صاحب قنادی</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            مدیریت محصولات، قیمت‌ها و تصاویر
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            هرگونه تغییر در قیمت، عکس، آپلود تصویر یا موجودی شیرینی‌ها به صورت آنی در <b>ربات تلگرام</b> و درگاه سفارش مشتریان اعمال می‌شود.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-amber-600/30 hover:shadow-amber-500/40 transition-all flex items-center gap-2 shrink-0 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
        
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام شیرینی، کیک، طعم یا ترکیبات..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {cat === 'all' ? '🌟 همه محصولات' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <CakeSlice className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-semibold text-slate-300">محصولی با این مشخصات یافت نشد!</p>
          <p className="text-xs text-slate-500">می‌توانید فیلتر جستجو را تغییر دهید یا محصول جدیدی با آپلود عکس اضافه کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const hasDiscount = product.discountPercent && product.discountPercent > 0;
            const finalPrice = hasDiscount
              ? (product.price * (100 - product.discountPercent!)) / 100
              : product.price;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden text-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Product Image & Badges */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                  <img
                    src={product.images?.[0] || product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                  {/* Category Pill */}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700">
                    {product.category}
                  </span>

                  {/* Availability Badge */}
                  <button
                    onClick={() => onUpdateProduct(product.id, { isAvailable: !product.isAvailable })}
                    className={`absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[11px] font-bold backdrop-blur-md transition-all flex items-center gap-1 ${
                      product.isAvailable
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    }`}
                    title="کلیک برای تغییر موجودی در بات تلگرام"
                  >
                    <span className={`w-2 h-2 rounded-full ${product.isAvailable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span>{product.isAvailable ? 'موجود' : 'ناموجود'}</span>
                  </button>

                  {/* Quick Change Photo Button */}
                  <button
                    onClick={() => {
                      setChangingPhotoProduct(product);
                      setNewPhotoUrl(product.images?.[0] || product.image);
                      setUploadedBase64(null);
                    }}
                    className="absolute bottom-3 left-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md text-xs flex items-center gap-1.5 transition-all opacity-90 hover:opacity-100"
                    title="آپلود یا تغییر عکس محصول"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>تغییر عکس</span>
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-white line-clamp-1 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Price & Unit Box */}
                  <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        قیمت ({product.unit}):
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {hasDiscount && (
                          <span className="text-xs text-slate-500 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        <span className="text-sm sm:text-base font-extrabold text-amber-400">
                          {formatPrice(finalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Edit Price Button */}
                    <button
                      onClick={() => setEditingPriceProduct(product)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="ویرایش قیمت این شیرینی"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تغییر قیمت</span>
                    </button>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>آماده‌سازی: {toPersianDigits(product.preparationTimeHours || 2)} ساعت</span>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`آیا از حذف محصول «${product.name}» اطمینان دارید؟`)) {
                          onDeleteProduct(product.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف شیرینی از لیست"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={onAddProduct}
      />

      {/* Edit Price Modal */}
      <EditPriceModal
        isOpen={!!editingPriceProduct}
        product={editingPriceProduct}
        onClose={() => setEditingPriceProduct(null)}
        onUpdateProduct={onUpdateProduct}
      />

      {/* Change Photo Modal with Upload */}
      {changingPhotoProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <span>آپلود و تغییر عکس: {changingPhotoProduct.name}</span>
              </h3>
              <button
                onClick={() => setChangingPhotoProduct(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePhotoUpdateSubmit} className="space-y-4">
              {/* Current or Uploaded Preview */}
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                <img
                  src={uploadedBase64 || newPhotoUrl || changingPhotoProduct.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Upload Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoUpload(e.target.files[0]);
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl text-center cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition-all"
              >
                <Upload className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-white">برای انتخاب و آپلود فایل عکس جدید کلیک کنید</p>
                <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  یا لینک مستقیم اینترنتی عکس:
                </label>
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => {
                    setNewPhotoUrl(e.target.value);
                    if (e.target.value) setUploadedBase64(null);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangingPhotoProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره عکس جدید</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
