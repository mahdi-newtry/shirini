import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  RotateCcw, 
  Copy, 
  Eye, 
  Send, 
  MessageSquare, 
  ShoppingBag, 
  CreditCard, 
  Headphones, 
  Cake, 
  Truck, 
  Info, 
  HelpCircle, 
  Wand2, 
  Tag, 
  Flame, 
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { BotSettings } from '../types';
import { BOT_TEXT_SECTIONS, BotTextSectionConfig, TextPresetOption } from '../data/textPresets';

interface BotTextsCustomizerProps {
  settings: BotSettings;
  onUpdateSettings: (newSettings: Partial<BotSettings>) => Promise<void> | void;
}

export const BotTextsCustomizer: React.FC<BotTextsCustomizerProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('welcomeMessage');
  const [currentTexts, setCurrentTexts] = useState<Record<string, string>>({
    welcomeMessage: settings.welcomeMessage || '',
    orderSuccessMessage: settings.orderSuccessMessage || '',
    paymentGuideMessage: settings.paymentGuideMessage || '',
    supportMessage: settings.supportMessage || '',
    customCakeGuideMessage: settings.customCakeGuideMessage || '',
    shippingInfoMessage: settings.shippingInfoMessage || '',
    aboutUsMessage: settings.aboutUsMessage || '',
  });
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'raw' | 'rendered'>('rendered');
  const [telegramPreviewTheme, setTelegramPreviewTheme] = useState<'dark' | 'light'>('light');
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const currentSection = BOT_TEXT_SECTIONS.find((s) => s.key === selectedSectionKey) || BOT_TEXT_SECTIONS[0];

  const handleTextChange = (text: string) => {
    setCurrentTexts((prev) => ({
      ...prev,
      [selectedSectionKey]: text,
    }));
    setIsSaved(false);
  };

  const handleApplyPreset = (preset: TextPresetOption) => {
    let replacedContent = preset.content;
    // Replace standard placeholders with real store values
    replacedContent = replacedContent
      .replace(/{storeName}/g, settings.storeName || 'قنادی شیرین‌کام')
      .replace(/{botName}/g, settings.botName || 'ربات قنادی')
      .replace(/{cardNumber}/g, settings.cardNumber || '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸')
      .replace(/{cardHolder}/g, settings.cardHolder || 'مدیریت قنادی')
      .replace(/{shabaNumber}/g, settings.shabaNumber || 'IR650170000000123456789012')
      .replace(/{storePhone}/g, settings.storePhone || '۰۲۱-۸۸۹۹۲۲۳۳')
      .replace(/{storeAddress}/g, settings.storeAddress || 'تهران، نرسیده به میدان ونک')
      .replace(/{shippingFee}/g, (settings.shippingFee || 45000).toLocaleString('fa-IR'))
      .replace(/{freeShippingThreshold}/g, (settings.freeShippingThreshold || 700000).toLocaleString('fa-IR'))
      .replace(/{orderNumber}/g, 'SH-8425')
      .replace(/{totalAmount}/g, '۸۵۰,۰۰۰');

    setCurrentTexts((prev) => ({
      ...prev,
      [selectedSectionKey]: replacedContent,
    }));
    setAppliedPresetId(preset.id);
    setIsSaved(false);
  };

  const handleInsertVariable = (varName: string) => {
    const currentVal = currentTexts[selectedSectionKey] || '';
    handleTextChange(currentVal + ' ' + varName);
  };

  const handleInsertTag = (tag: string) => {
    const currentVal = currentTexts[selectedSectionKey] || '';
    if (tag === 'b') {
      handleTextChange(currentVal + ' <b>متن پررنگ</b>');
    } else if (tag === 'i') {
      handleTextChange(currentVal + ' <i>متن مایل</i>');
    } else if (tag === 'code') {
      handleTextChange(currentVal + ' <code>متن کپی‌شونده</code>');
    }
  };

  const handleSave = async () => {
    await onUpdateSettings(currentTexts);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const getSectionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4" />;
      case 'Headphones': return <Headphones className="w-4 h-4" />;
      case 'Cake': return <Cake className="w-4 h-4" />;
      case 'Truck': return <Truck className="w-4 h-4" />;
      case 'Info': return <Info className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Helper to render HTML safe in preview with theme adaptation
  const renderTelegramFormattedText = (rawText: string, isDark: boolean) => {
    if (!rawText) return `<span style="color: ${isDark ? '#94a3b8' : '#64748b'}; font-style: italic;">متنی برای نمایش وارد نشده است...</span>`;
    
    // Sample substitutions for live preview
    const populated = rawText
      .replace(/{storeName}/g, settings.storeName || 'قنادی شیرین‌کام')
      .replace(/{botName}/g, settings.botName || 'ربات قنادی')
      .replace(/{cardNumber}/g, settings.cardNumber || '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸')
      .replace(/{cardHolder}/g, settings.cardHolder || 'مدیریت قنادی')
      .replace(/{shabaNumber}/g, settings.shabaNumber || 'IR650170000000123456789012')
      .replace(/{storePhone}/g, settings.storePhone || '۰۲۱-۸۸۹۹۲۲۳۳')
      .replace(/{storeAddress}/g, settings.storeAddress || 'تهران، نرسیده به میدان ونک')
      .replace(/{shippingFee}/g, (settings.shippingFee || 45000).toLocaleString('fa-IR'))
      .replace(/{freeShippingThreshold}/g, (settings.freeShippingThreshold || 700000).toLocaleString('fa-IR'))
      .replace(/{orderNumber}/g, 'SH-8425')
      .replace(/{totalAmount}/g, '۸۵۰,۰۰۰');

    const boldStyle = isDark 
      ? 'color: #ffffff; font-weight: 700;' 
      : 'color: #0f172a; font-weight: 700;';
    const italicStyle = isDark 
      ? 'color: #fde68a; font-style: italic;' 
      : 'color: #92400e; font-style: italic; font-weight: 500;';
    const codeStyle = isDark 
      ? 'display: inline-block; padding: 2px 6px; border-radius: 6px; background-color: #0f172a; color: #38bdf8; font-family: monospace; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 11px;' 
      : 'display: inline-block; padding: 2px 6px; border-radius: 6px; background-color: #e0f2fe; color: #0369a1; font-family: monospace; border: 1px solid #7dd3fc; font-size: 11px; font-weight: 600;';

    const formatted = populated
      .replace(/\n/g, '<br/>')
      .replace(/<b>(.*?)<\/b>/g, `<strong style="${boldStyle}">$1</strong>`)
      .replace(/<i>(.*?)<\/i>/g, `<em style="${italicStyle}">$1</em>`)
      .replace(/<code>(.*?)<\/code>/g, `<code style="${codeStyle}">$1</code>`);

    return formatted;
  };

  const isDarkTg = telegramPreviewTheme === 'dark';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 via-slate-900/60 to-indigo-900/30 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">مرکز شخصی‌سازی متون و پیام‌های ربات تلگرام</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  قالب‌های پیشنهادی آماده
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                متن هر بخش از ربات را با سلیقه خود ویرایش کنید، یا از بین قالب‌های آماده و حرفه‌ای (لوکس، سنتی، رسمی و مینیمال) با یک کلیک انتخاب نمایید.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 shrink-0 btn-preserve"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                <span>تغییرات با موفقیت ذخیره شد!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ذخیره تغییرات متون</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Sections Navigation Tab List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 px-3 py-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>انتخاب بخش جهت شخصی‌سازی:</span>
            </h3>

            <div className="space-y-1.5 mt-1">
              {BOT_TEXT_SECTIONS.map((section) => {
                const isSelected = selectedSectionKey === section.key;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => {
                      setSelectedSectionKey(section.key);
                      setAppliedPresetId(null);
                    }}
                    className={`w-full text-right p-3 rounded-xl transition-all flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-purple-600/15 border-purple-500 text-purple-900 dark:text-white shadow-sm font-semibold'
                        : 'bg-slate-950/40 border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {getSectionIcon(section.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{section.title}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 leading-relaxed font-normal">
                        {section.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2.5 shadow-sm">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>فرمت‌نویسی پیام‌ها (HTML Tags):</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              شما می‌توانید از تگ‌های رسمی تلگرام در متن استفاده کنید تا پیام‌ها خوانا و حرفه‌ای نمایش داده شوند:
            </p>
            <div className="space-y-1.5 font-mono text-[11px] pt-1">
              <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <code className="text-amber-400 font-bold">&lt;b&gt;متن پررنگ&lt;/b&gt;</code>
                <span className="text-[10px] text-slate-400 font-sans">Bold (تیتر پیام)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <code className="text-sky-400">&lt;code&gt;شماره کارت&lt;/code&gt;</code>
                <span className="text-[10px] text-slate-400 font-sans">کپی با لمس</span>
              </div>
              <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <code className="text-pink-400">&lt;i&gt;متن مایل&lt;/i&gt;</code>
                <span className="text-[10px] text-slate-400 font-sans">Italic (توضیح تکمیلی)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active Section Editor & Preset Cards */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Active Section Title & Variable Inserters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  {getSectionIcon(currentSection.iconName)}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    ویرایش {currentSection.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentSection.description}
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPreviewMode('rendered')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    previewMode === 'rendered' ? 'bg-purple-600 text-white shadow btn-preserve' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>پیش‌نمایش تلگرام</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    previewMode === 'raw' ? 'bg-slate-800 text-white shadow btn-preserve' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>ویرایشگر کد</span>
                </button>
              </div>
            </div>

            {/* Quick Variable Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>درج متغیرهای هوشمند در متن:</span>
                </span>
                <span className="text-[11px] text-slate-400">با کلیک روی هر متغیر، در انتهای متن درج می‌شود</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentSection.variables.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => handleInsertVariable(v.name)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-sky-500/20 hover:border-sky-500/40 text-xs font-mono transition-all flex items-center gap-1.5 group"
                    title={`درج ${v.desc}`}
                  >
                    <span className="font-semibold">{v.name}</span>
                    <span className="text-[10px] text-slate-400 font-sans">({v.desc})</span>
                  </button>
                ))}

                {/* Quick HTML tag helpers */}
                <button
                  type="button"
                  onClick={() => handleInsertTag('b')}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-amber-400 border border-amber-500/20 text-xs font-bold transition-all"
                  title="افزودن تگ بولد"
                >
                  &lt;b&gt;بولد&lt;/b&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('code')}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 text-xs font-mono transition-all"
                  title="افزودن تگ کد"
                >
                  &lt;code&gt;کپی&lt;/code&gt;
                </button>
              </div>
            </div>

            {/* Textarea or Live Preview */}
            {previewMode === 'rendered' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">
                    پیش‌نمایش ظاهر پیام در تلگرام مشتری:
                  </label>

                  {/* Telegram Theme Preview Toggle */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setTelegramPreviewTheme('light')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                        telegramPreviewTheme === 'light'
                          ? 'bg-amber-500 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>تلگرام لایت</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelegramPreviewTheme('dark')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                        telegramPreviewTheme === 'dark'
                          ? 'bg-indigo-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>تلگرام دارک</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Telegram Chat Bubble (Robust Isolation) */}
                <div 
                  className="rounded-2xl p-4 sm:p-6 transition-colors duration-200 border shadow-inner"
                  style={{
                    backgroundColor: isDarkTg ? '#17212b' : '#e4ecf2',
                    borderColor: isDarkTg ? '#2b3a4a' : '#cbd5e1',
                    backgroundImage: isDarkTg 
                      ? 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)' 
                      : 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.7) 0%, rgba(226, 232, 240, 0.95) 100%)'
                  }}
                >
                  <div className="flex items-start gap-3 max-w-xl mx-auto">
                    {/* Bot Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow">
                      🍰
                    </div>

                    {/* Chat Bubble with Guaranteed Contrast */}
                    <div 
                      className="flex-1 p-4 rounded-2xl rounded-tr-none shadow-md text-xs sm:text-sm leading-relaxed border transition-all"
                      style={{
                        backgroundColor: isDarkTg ? '#242f3d' : '#ffffff',
                        color: isDarkTg ? '#f8fafc' : '#0f172a',
                        borderColor: isDarkTg ? '#2e3d4f' : '#e2e8f0',
                        boxShadow: isDarkTg ? '0 4px 6px -1px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b" style={{ borderColor: isDarkTg ? '#2e3d4f' : '#f1f5f9' }}>
                        <span className="font-bold text-xs" style={{ color: isDarkTg ? '#38bdf8' : '#0284c7' }}>
                          {settings.botName || 'قنادی شیرین‌کام'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono" style={{ backgroundColor: isDarkTg ? '#1e293b' : '#f1f5f9', color: isDarkTg ? '#94a3b8' : '#64748b' }}>
                          bot
                        </span>
                      </div>

                      {/* Rendered Text Block with Inline CSS Protection */}
                      <div 
                        className="space-y-1 font-sans leading-relaxed text-right"
                        style={{ color: isDarkTg ? '#f8fafc' : '#0f172a' }}
                        dangerouslySetInnerHTML={{ 
                          __html: renderTelegramFormattedText(currentTexts[selectedSectionKey] || '', isDarkTg) 
                        }}
                      />

                      {/* Footer & Timestamps */}
                      <div className="flex items-center justify-end gap-1 mt-3 pt-1 border-t text-[10px]" style={{ borderColor: isDarkTg ? '#2e3d4f' : '#f8fafc', color: isDarkTg ? '#94a3b8' : '#64748b' }}>
                        <span>14:32</span>
                        <span style={{ color: '#0ea5e9' }}>✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    متن در حال ویرایش:
                  </label>
                  <textarea
                    rows={6}
                    value={currentTexts[selectedSectionKey] || ''}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition font-sans leading-relaxed"
                    placeholder="متن خود را اینجا وارد کنید..."
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ویرایشگر مستقیم متن پیام (کد و تگ‌های HTML):
                </label>
                <textarea
                  rows={9}
                  value={currentTexts[selectedSectionKey] || ''}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition font-mono leading-relaxed"
                  placeholder="متن را همراه با تگ‌های HTML وارد نمایید..."
                />
              </div>
            )}
          </div>

          {/* Preset Suggestions Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">
                    قالب‌های متنی پیشنهادی برای این بخش (Presets)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    اگر ایده‌ای ندارید، با یک کلیک متن مورد علاقه‌تان را انتخاب و جایگزین کنید:
                  </p>
                </div>
              </div>
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                {currentSection.presets.length} مدل متن آماده
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentSection.presets.map((preset) => {
                const isCurrentApplied = appliedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`bg-slate-950/60 border rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3 ${
                      isCurrentApplied
                        ? 'border-emerald-500/50 bg-emerald-950/10 shadow-lg ring-1 ring-emerald-500/30'
                        : 'border-slate-800 hover:border-purple-500/40 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{preset.emoji}</span>
                          <h5 className="font-bold text-xs sm:text-sm">
                            {preset.title}
                          </h5>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          {preset.tag}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                        {preset.description}
                      </p>

                      {/* Content Preview Snippet */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-[11px] leading-relaxed max-h-24 overflow-y-auto scrollbar-thin">
                        <p className="whitespace-pre-line font-sans text-slate-300">
                          {preset.content}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow ${
                        isCurrentApplied
                          ? 'bg-emerald-600 text-white shadow-emerald-600/30 btn-preserve'
                          : 'bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white border border-slate-700 hover:border-purple-500'
                      }`}
                    >
                      {isCurrentApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span className="text-white">این قالب اعمال شده است</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>✨ اعمال این قالب پیشنهادی</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
