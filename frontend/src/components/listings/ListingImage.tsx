import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface ListingImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function ListingImage({ src, alt, className = '' }: ListingImageProps) {
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
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {!isLoaded && <div className="absolute inset-0 shimmer" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
