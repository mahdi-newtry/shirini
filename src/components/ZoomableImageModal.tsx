import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomableImageModalProps {
  imageSrc: string | null | undefined;
  onClose: () => void;
  alt: string;
  title?: string;
  description?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

/**
 * A shared image viewer for customer uploads. It provides explicit zoom
 * controls, keyboard shortcuts and drag-to-pan so enlarged receipt/design
 * images remain useful on desktop and touch devices.
 */
export const ZoomableImageModal: React.FC<ZoomableImageModalProps> = ({
  imageSrc,
  onClose,
  alt,
  title = 'مشاهده تصویر',
  description,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const changeZoom = (nextZoom: number) => {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clampedZoom);
    if (clampedZoom <= 1) setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    resetView();
  }, [imageSrc]);

  useEffect(() => {
    if (!imageSrc) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        changeZoom(zoom + ZOOM_STEP);
      } else if (event.key === '-') {
        event.preventDefault();
        changeZoom(zoom - ZOOM_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageSrc, onClose, zoom]);

  if (!imageSrc) return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setPan({
      x: dragStart.current.panX + event.clientX - dragStart.current.x,
      y: dragStart.current.panY + event.clientY - dragStart.current.y,
    });
  };

  const finishDragging = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-[min(90vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-white">{title}</h3>
            {description && <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>}
          </div>

          <div className="flex items-center gap-1.5" dir="ltr">
            <button
              type="button"
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom out"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">−</span>
            </button>
            <span className="min-w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-xs font-bold text-amber-300">
              {Math.round(zoom * 100)}٪
            </span>
            <button
              type="button"
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom in"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">+</span>
            </button>
            <button
              type="button"
              onClick={resetView}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="Reset zoom"
              title="بازنشانی زوم"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-2 text-slate-300 transition hover:bg-rose-950 hover:text-rose-200"
              aria-label="Close image viewer"
              title="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div
          className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(51,65,85,0.45),_rgba(2,6,23,0.98))] p-4 sm:p-8 ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDragging}
          onPointerCancel={finishDragging}
          onPointerLeave={() => {
            if (isDragging) finishDragging();
          }}
          style={{ touchAction: zoom > 1 ? 'none' : 'auto' }}
        >
          <img
            src={imageSrc}
            alt={alt}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain shadow-2xl transition-transform duration-150"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            referrerPolicy="no-referrer"
          />
        </div>

        <footer className="flex flex-col-reverse items-center justify-between gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2.5 sm:flex-row sm:px-4">
          <p className="text-center text-[11px] text-slate-400 sm:text-right">
            دکمه‌های + و − یا کلیدهای صفحه‌کلید را برای زوم استفاده کنید؛ پس از بزرگ‌نمایی، تصویر را بکشید.
          </p>
          <a
            href={imageSrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-slate-800 hover:text-sky-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            باز کردن اندازه اصلی
          </a>
        </footer>
      </section>
    </div>
  );
};
