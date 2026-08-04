import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { CreateListingData } from '../../types';

interface ListingFormProps {
  onSubmit: (data: CreateListingData, photos: File[]) => Promise<void>;
  isLoading?: boolean;
}

export default function ListingForm({ onSubmit, isLoading = false }: ListingFormProps) {
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
    const files = Array.from(e.target.files || []);
    
    if (files.length + photos.length > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    // Add new photos
    setPhotos(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.location || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    await onSubmit(formData, photos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Informasi Dasar</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">
              Judul Listing <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., Rumah Minimalis BSD"
              required
            />
          </div>

          <div>
            <label className="label">
              Lokasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., BSD City, Tangerang Selatan"
              required
            />
          </div>

          <div>
            <label className="label">
              Tipe Properti
            </label>
            <select
              name="propertyType"
              value={formData.propertyType}
              onChange={handleInputChange}
              className="input"
            >
              <option value="">Pilih tipe properti</option>
              <option value="rumah">Rumah</option>
              <option value="apartemen">Apartemen</option>
              <option value="ruko">Ruko</option>
              <option value="tanah">Tanah</option>
              <option value="villa">Villa</option>
              <option value="kost">Kost</option>
            </select>
          </div>

          <div>
            <label className="label">
              Harga (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 1200000000"
              required
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Detail Properti</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Luas Tanah (m²)</label>
            <input
              type="number"
              name="landArea"
              value={formData.landArea || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 120"
              min="0"
            />
          </div>

          <div>
            <label className="label">Luas Bangunan (m²)</label>
            <input
              type="number"
              name="buildingArea"
              value={formData.buildingArea || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 90"
              min="0"
            />
          </div>

          <div>
            <label className="label">Jumlah Kamar Tidur</label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 3"
              min="0"
            />
          </div>

          <div>
            <label className="label">Jumlah Kamar Mandi</label>
            <input
              type="number"
              name="bathrooms"
              value={formData.bathrooms || ''}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., 2"
              min="0"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Informasi Tambahan</label>
          <textarea
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            className="input"
            rows={3}
            placeholder="e.g., Dekat sekolah, akses tol, cluster aman"
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Foto Properti</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">Upload Foto (Max 10)</label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={photos.length >= 10}
                />
              </label>
            </div>
          </div>

          {/* Photo Previews */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          Batal
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Menyimpan...' : 'Simpan Listing'}
        </button>
      </div>
    </form>
  );
}
