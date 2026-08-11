import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Star, AlertTriangle } from 'lucide-react';
import type { CreateListingData, ListingWithDetails } from '../../types';
import { listingApi } from '../../services/api';

interface ListingFormProps {
  onSubmit: (data: CreateListingData, photos: File[]) => Promise<void>;
  isLoading?: boolean;
  initialData?: ListingWithDetails;
  isEditMode?: boolean;
}

const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TOTAL_PHOTOS = 10;

export default function ListingForm({ onSubmit, isLoading = false, initialData, isEditMode = false }: ListingFormProps) {
  const [formData, setFormData] = useState<CreateListingData>({
    title: '',
    location: '',
    price: 0,
    landArea: undefined,
    buildingArea: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    propertyType: '',
    additionalInfo: '',
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<{ id: string; url: string; is_featured: boolean }>>([]);
  const [featuredSelection, setFeaturedSelection] = useState<{ type: 'existing' | 'new'; idOrIndex: string | number } | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Initialize form with existing data in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        title: initialData.title || '',
        location: initialData.location || '',
        price: initialData.price || 0,
        landArea: initialData.land_area,
        buildingArea: initialData.building_area,
        bedrooms: initialData.bedrooms,
        bathrooms: initialData.bathrooms,
        propertyType: initialData.property_type || '',
        additionalInfo: initialData.additional_info || '',
      });

      setPhotos([]);
      setPhotoPreviews([]);

      const photosList = initialData.photos && initialData.photos.length > 0
        ? initialData.photos.map(p => ({ id: p.id, url: p.photo_url, is_featured: p.is_featured }))
        : [];
      setExistingPhotos(photosList);

      const featured = photosList.find(p => p.is_featured);
      if (featured) {
        setFeaturedSelection({ type: 'existing', idOrIndex: featured.id });
      } else if (photosList.length > 0) {
        setFeaturedSelection({ type: 'existing', idOrIndex: photosList[0].id });
      } else {
        setFeaturedSelection(null);
      }
    }
  }, [isEditMode, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'landArea' || name === 'buildingArea' || name === 'bedrooms' || name === 'bathrooms'
        ? value ? parseFloat(value) : undefined
        : value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWarningMessage(null);
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Check 1: Max total photos count (existing + already selected + newly selected)
    const totalCount = existingPhotos.length + photos.length + selectedFiles.length;
    if (totalCount > MAX_TOTAL_PHOTOS) {
      setWarningMessage(`⚠️ Peringatan: Total foto (${totalCount} foto) melebihi batas maksimal ${MAX_TOTAL_PHOTOS} foto. Maksimal 10 foto diperbolehkan.`);
      return;
    }

    // Check 2: Max total upload size (5 MB) across all newly selected files
    const combinedNewPhotos = [...photos, ...selectedFiles];
    const totalSize = combinedNewPhotos.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      setWarningMessage(`⚠️ Peringatan: Total ukuran file foto yang akan diunggah (${sizeMB} MB) melebihi batas maksimal 5 MB. Harap kurangi ukuran atau jumlah foto.`);
      return;
    }

    // Add new valid photos
    setPhotos(combinedNewPhotos);

    // If no featured selection yet, set the first new photo as featured
    if (!featuredSelection) {
      if (existingPhotos.length > 0) {
        setFeaturedSelection({ type: 'existing', idOrIndex: existingPhotos[0].id });
      } else {
        setFeaturedSelection({ type: 'new', idOrIndex: 0 });
      }
    }

    // Create image previews
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    setPhotoPreviews(updatedPreviews);

    // Reset warning if now within limits
    const totalSize = updatedPhotos.reduce((sum, f) => sum + f.size, 0);
    if (totalSize <= MAX_TOTAL_SIZE_BYTES && (existingPhotos.length + updatedPhotos.length) <= MAX_TOTAL_PHOTOS) {
      setWarningMessage(null);
    }

    if (featuredSelection?.type === 'new' && featuredSelection.idOrIndex === index) {
      if (existingPhotos.length > 0) {
        setFeaturedSelection({ type: 'existing', idOrIndex: existingPhotos[0].id });
      } else if (updatedPhotos.length > 0) {
        setFeaturedSelection({ type: 'new', idOrIndex: 0 });
      } else {
        setFeaturedSelection(null);
      }
    }
  };

  const removeExistingPhoto = async (photoId: string) => {
    try {
      if (isEditMode) {
        await listingApi.deletePhoto(photoId);
      }
    } catch (err) {
      console.error('Failed to delete photo on server:', err);
    }
    const updated = existingPhotos.filter(p => p.id !== photoId);
    setExistingPhotos(updated);

    if (featuredSelection?.type === 'existing' && featuredSelection.idOrIndex === photoId) {
      if (updated.length > 0) {
        setFeaturedSelection({ type: 'existing', idOrIndex: updated[0].id });
      } else if (photos.length > 0) {
        setFeaturedSelection({ type: 'new', idOrIndex: 0 });
      } else {
        setFeaturedSelection(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarningMessage(null);

    if (!formData.title || !formData.location || !formData.price) {
      setWarningMessage('Judul, lokasi, dan harga wajib diisi.');
      return;
    }

    // Client-side Validation Checks before submission
    const totalCount = existingPhotos.length + photos.length;
    if (totalCount > MAX_TOTAL_PHOTOS) {
      setWarningMessage(`⚠️ Peringatan: Total foto (${totalCount} foto) melebihi batas maksimal ${MAX_TOTAL_PHOTOS} foto.`);
      return;
    }

    const totalSize = photos.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      setWarningMessage(`⚠️ Peringatan: Total ukuran file foto (${sizeMB} MB) melebihi batas maksimal 5 MB.`);
      return;
    }

    const submitData: CreateListingData = {
      ...formData,
    };

    if (featuredSelection) {
      if (featuredSelection.type === 'existing') {
        submitData.featuredPhotoId = featuredSelection.idOrIndex as string;
      } else {
        submitData.featuredPhotoIndex = featuredSelection.idOrIndex as number;
      }
    }

    await onSubmit(submitData, photos);
  };

  const totalCurrentPhotos = existingPhotos.length + photos.length;
  const currentTotalNewSize = photos.reduce((sum, f) => sum + f.size, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Warning Message Banner */}
      {warningMessage && (
        <div className="card border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{warningMessage}</div>
        </div>
      )}

      {/* Basic Information */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">Basic Information</h3>

        <div className="space-y-6">
          <div>
            <label className="label">
              Listing Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., Luxury Villa Kemang"
              required
            />
          </div>

          <div>
            <label className="label">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., Kemang, South Jakarta"
              required
            />
          </div>

          <div>
            <label className="label">
              Property Type
            </label>
            <select
              name="propertyType"
              value={formData.propertyType}
              onChange={handleInputChange}
              className="input"
            >
              <option value="">Select property type</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="commercial">Commercial</option>
              <option value="land">Land</option>
              <option value="villa">Villa</option>
              <option value="condo">Condo</option>
            </select>
          </div>

          <div>
            <label className="label">
              Price (IDR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 15500000000"
              required
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">Property Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Land Area (m²)</label>
            <input
              type="number"
              name="landArea"
              value={formData.landArea || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 500"
              min="0"
            />
          </div>

          <div>
            <label className="label">Building Area (m²)</label>
            <input
              type="number"
              name="buildingArea"
              value={formData.buildingArea || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 350"
              min="0"
            />
          </div>

          <div>
            <label className="label">Bedrooms</label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 4"
              min="0"
            />
          </div>

          <div>
            <label className="label">Bathrooms</label>
            <input
              type="number"
              name="bathrooms"
              value={formData.bathrooms || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 3"
              min="0"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Additional Information</label>
          <textarea
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            className="input"
            rows={3}
            placeholder="e.g., Near international school, highway access, gated community"
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Property Photos</h3>
          <span className="text-sm font-medium text-text-tertiary dark:text-text-tertiary-dark">
            {totalCurrentPhotos} / {MAX_TOTAL_PHOTOS} photos ({ (currentTotalNewSize / (1024 * 1024)).toFixed(2) } MB / 5 MB)
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Upload Photos (Max 10 Photos, Total Size Max 5 MB)</label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border dark:border-border-dark rounded-xl cursor-pointer hover:border-primary-500 transition-colors bg-accent/50 dark:bg-accent-dark/50">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-text-tertiary dark:text-text-tertiary-dark" />
                  <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                    Click to select photos or drag & drop here
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">PNG, JPG, WEBP • Max total 5 MB • Max 10 Photos</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={totalCurrentPhotos >= MAX_TOTAL_PHOTOS}
                />
              </label>
            </div>
          </div>

          {/* Existing Photos (Edit Mode) */}
          {isEditMode && existingPhotos.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">Existing Photos (Click ⭐ for Featured Photo)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {existingPhotos.map((photo) => {
                  const isFeatured = featuredSelection?.type === 'existing' && featuredSelection.idOrIndex === photo.id;
                  return (
                    <div key={photo.id} className={`relative group border-2 rounded-xl overflow-hidden ${isFeatured ? 'border-yellow-500 ring-2 ring-yellow-400' : 'border-border dark:border-border-dark'}`}>
                      <img
                        src={photo.url}
                        alt="Property"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      {/* Featured Star Button */}
                      <button
                        type="button"
                        onClick={() => setFeaturedSelection({ type: 'existing', idOrIndex: photo.id })}
                        className={`absolute top-2 left-2 p-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow transition-all ${
                          isFeatured
                            ? 'bg-yellow-500 text-white opacity-100'
                            : 'bg-white/80 dark:bg-surface-dark/80 text-text-secondary dark:text-text-secondary-dark hover:bg-yellow-400 hover:text-white opacity-90 group-hover:opacity-100'
                        }`}
                        title="Set as Featured Photo"
                      >
                        <Star className={`w-4 h-4 ${isFeatured ? 'fill-white' : ''}`} />
                        {isFeatured && <span className="pr-1 text-xs">Featured</span>}
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photo.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photo Placeholder (No Photos) */}
          {isEditMode && existingPhotos.length === 0 && photoPreviews.length === 0 && (
            <div className="mb-4 p-8 border-2 border-dashed border-border dark:border-border-dark rounded-xl text-center">
              <ImageIcon className="w-12 h-12 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-2" />
              <p className="text-text-secondary dark:text-text-secondary-dark">No existing photos</p>
            </div>
          )}

          {/* New Photo Previews */}
          {photoPreviews.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">New Photos to Upload (Click ⭐ for Featured Photo)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoPreviews.map((preview, index) => {
                  const isFeatured = featuredSelection?.type === 'new' && featuredSelection.idOrIndex === index;
                  return (
                    <div key={index} className={`relative group border-2 rounded-xl overflow-hidden ${isFeatured ? 'border-yellow-500 ring-2 ring-yellow-400' : 'border-border dark:border-border-dark'}`}>
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      {/* Featured Star Button */}
                      <button
                        type="button"
                        onClick={() => setFeaturedSelection({ type: 'new', idOrIndex: index })}
                        className={`absolute top-2 left-2 p-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow transition-all ${
                          isFeatured
                            ? 'bg-yellow-500 text-white opacity-100'
                            : 'bg-white/80 dark:bg-surface-dark/80 text-text-secondary dark:text-text-secondary-dark hover:bg-yellow-400 hover:text-white opacity-90 group-hover:opacity-100'
                        }`}
                        title="Set as Featured Photo"
                      >
                        <Star className={`w-4 h-4 ${isFeatured ? 'fill-white' : ''}`} />
                        {isFeatured && <span className="pr-1 text-xs">Featured</span>}
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Listing' : 'Save Listing')}
        </button>
      </div>
    </form>
  );
}