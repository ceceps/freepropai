import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import ZoomableImage from '../common/ZoomableImage';

interface ListingImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  zoomable?: boolean;
}

export default function ListingImage({ src, alt, className = '', zoomable = true }: ListingImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <ImageIcon className="w-10 h-10 text-text-tertiary dark:text-text-tertiary-dark opacity-40" />
      </div>
    );
  }

  return (
    <ZoomableImage
      src={src}
      alt={alt}
      zoomable={zoomable}
      className={`w-full h-full ${className}`}
      onError={() => setHasError(true)}
    >
      {!isLoaded && <div className="absolute inset-0 shimmer pointer-events-none" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        onLoad={() => setIsLoaded(true)}
      />
    </ZoomableImage>
  );
}
