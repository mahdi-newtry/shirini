import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, CakeSlice, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { formatPrice } from '../utils/formatters';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
}

const PRESET_IMAGES = [
  { label: 'کیک شکلاتی', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700&auto=format&fit=crop&q=80' },
  { label: 'شیرینی ناپلئونی', url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700&auto=format&fit=crop&q=80' },
  { label: 'رولت توت فرنگی', url: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=700&auto=format&fit=crop&q=80' },
  { label: 'باقلوا پسته', url: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=700&auto=format&fit=crop&q=80' },
  { label: 'شیرینی دانمارکی', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=80' },
  { label: 'شیرینی نخودچی', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=700&auto=format&fit=crop&q=80' },
  { label: 'کروسان فرانسوی', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=700&auto=format&fit=crop&q=80' },
  { label: 'کوکی نیویورکی', url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=700&auto=format&fit=crop&q=80' },
  { label: 'چیزکیک لوتوس', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=700&auto=format&fit=crop&q=80' }
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('شیرینی تر و خامه‌ای');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('کیلوگرم');
  const [image, setImage] = useState(PRESET_IMAGES[0].url);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [preparationTimeHours, setPreparationTimeHours] = useState('2');
  const [stockKgOrCount, setStockKgOrCount] = useState('20');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('لطفاً فقط فایل تصویری (عکس) انتخاب کنید.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string;
        setUploadedImageBase64(base64);
        setCustomImageUrl('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(price.replace(/[^0-9]/g, ''), 10);
    if (!name.trim() || isNaN(priceNum) || priceNum <= 0) {
      alert('لطفاً نام و قیمت معتبر محصول را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const finalImage = uploadedImageBase64 || customImageUrl.trim() || image;

      await onAddProduct({
        name: name.trim(),
        category,
        price: priceNum,
        unit,
        image: finalImage,
        description: description.trim() || `محصول باکیفیت و تازه از کارگاه قنادی با بهترین مواد اولیه.`,
        isAvailable: true,
        discountPercent: parseInt(discountPercent, 10) || 0,
        preparationTimeHours: parseInt(preparationTimeHours, 10) || 2,
        stockKgOrCount: parseInt(stockKgOrCount, 10) || 20
      });

      // Reset form
      setName('');
      setPrice('');
      setDescription('');
      setUploadedImageBase64(null);
      setCustomImageUrl('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-slate-100 shadow-2xl">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CakeSlice className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">افزودن محصول جدید به قنادی</h3>
              <p className="text-xs text-slate-400">محصول فوراً در ربات تلگرام و فروشگاه فعال می‌شود</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                نام شیرینی / کیک <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: رولت شکلات تلخ با مغز فندق"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                دسته‌بندی <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="کیک و پای">کیک و پای</option>
                <option value="شیرینی تر و خامه‌ای">شیرینی تر و خامه‌ای</option>
                <option value="شیرینی خشک و سنتی">شیرینی خشک و سنتی</option>
                <option value="دسر و باقلوا">دسر و باقلوا</option>
                <option value="کوکی و بیسکوئیت">کوکی و بیسکوئیت</option>
                <option value="نان و کروسان">نان و کروسان</option>
              </select>
            </div>
          </div>

          {/* Price & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                قیمت (تومان) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min="1000"
                step="1000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="مثال: 380000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              {price && (
                <p className="text-[11px] text-amber-400 mt-1">
                  معادل: {formatPrice(parseInt(price, 10) || 0)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                واحد فروش
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="کیلوگرم">کیلوگرم</option>
                <option value="جعبه ۱۲ تایی">جعبه ۱۲ تایی</option>
                <option value="جعبه نیم‌کیلویی">جعبه نیم‌کیلویی</option>
                <option value="عدد">عدد</option>
                <option value="دیس">دیس</option>
              </select>
            </div>
          </div>

          {/* Real File Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                تصویر شیرینی و محصول <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                (آپلود مستقیم عکس، درگ و دراپ یا انتخاب از گالری)
              </span>
            </div>

            {/* Hidden Input for file picker */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {/* Upload Drag & Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
                  : uploadedImageBase64
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-amber-500/60 bg-slate-800/40 hover:bg-slate-800/70'
              }`}
            >
              {uploadedImageBase64 ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={uploadedImageBase64}
                      alt="Uploaded Preview"
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500"
                    />
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                        <Check className="w-4 h-4" /> عکس با موفقیت بارگذاری شد
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">برای تعویض عکس، دوباره اینجا کلیک کنید یا فایلی رها کنید</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedImageBase64(null);
                    }}
                    className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs flex items-center gap-1"
                    title="حذف عکس آپلود شده"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      برای آپلود عکس شیرینی اینجا کلیک کنید یا عکس را به اینجا بکشید (Drag & Drop)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      فرمت‌های مجاز: JPG, PNG, WEBP • عکس مستقیماً در ربات تلگرام و فروشگاه لود می‌شود
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Presets Grid */}
            <div className="mt-4">
              <span className="block text-[11px] text-slate-400 mb-2 font-medium">
                یا انتخاب سریع از عکس‌های پیشنهادی قنادی:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {PRESET_IMAGES.map((preset, idx) => {
                  const isSelected = !uploadedImageBase64 && (customImageUrl ? customImageUrl === preset.url : image === preset.url);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImage(preset.url);
                        setCustomImageUrl('');
                        setUploadedImageBase64(null);
                      }}
                      className={`relative rounded-xl overflow-hidden border-2 aspect-square group transition-all ${
                        isSelected ? 'border-amber-500 ring-2 ring-amber-500/30 scale-95' : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] text-white py-0.5 px-1 truncate text-center">
                        {preset.label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Image URL */}
            <div>
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => {
                  setCustomImageUrl(e.target.value);
                  if (e.target.value) setUploadedImageBase64(null);
                }}
                placeholder="یا لینک اینترنتی مستقیم عکس اختصاصی (https://...)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              توضیحات و ترکیبات خوشمزه
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: پخته شده با کره حیوانی، عطر هل و گلاب ناب، بدون مواد نگهدارنده و بسیار ترد و لذیذ..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Discount & Prep Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تخفیف ویژه (درصد)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                زمان آماده‌سازی و پخت (ساعت)
              </label>
              <input
                type="number"
                min="1"
                max="48"
                value={preparationTimeHours}
                onChange={(e) => setPreparationTimeHours(e.target.value)}
                placeholder="2"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>در حال ثبت...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ثبت و انتشار در ربات تلگرام</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
