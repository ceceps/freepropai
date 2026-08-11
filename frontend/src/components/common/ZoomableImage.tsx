import { useState } from 'react';
import { ZoomIn, X, Download, Check } from 'lucide-react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  zoomable?: boolean;
  variant?: 'overlay' | 'corner';
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  downloadName?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  children?: React.ReactNode;
}

export default function ZoomableImage({
  src,
  alt,
  className = '',
  zoomable = true,
  variant = 'overlay',
  selectable = false,
  selected = false,
  onToggleSelect,
  downloadName = 'image.jpg',
  onError,
  children,
}: ZoomableImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  const openZoom = () => {
    if (zoomable) setIsZoomed(true);
  };

  return (
    <>
      <div className={`relative group overflow-hidden ${className}`}>
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${zoomable ? 'cursor-zoom-in' : ''}`}
          onClick={openZoom}
          onError={onError}
        />

        {selectable && onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center border-2 shadow transition-all ${
              selected
                ? 'bg-yellow-500 border-yellow-500'
                : 'bg-white/90 border-white/80 hover:border-yellow-400'
            }`}
            title={selected ? 'Deselect for download' : 'Select for download'}
            aria-label={selected ? 'Deselect for download' : 'Select for download'}
          >
            <Check className={`w-4 h-4 ${selected ? 'text-white' : 'text-transparent'}`} strokeWidth={3} />
          </button>
        )}

        {zoomable && variant === 'overlay' && (
          <div
            onClick={openZoom}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-zoom-in"
          >
            <span className="bg-white/90 text-text-primary p-2 rounded-full shadow-lg">
              <ZoomIn className="w-5 h-5" />
            </span>
          </div>
        )}

        {zoomable && variant === 'corner' && (
          <button
            type="button"
            onClick={openZoom}
            className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in"
            title="Zoom"
            aria-label="Zoom image"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        )}

        {children}
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors"
            title="Close"
            aria-label="Close zoom"
          >
            <X className="w-6 h-6" />
          </button>
          <a
            href={src}
            download={downloadName}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 btn btn-primary flex items-center gap-2"
            title="Download image"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
