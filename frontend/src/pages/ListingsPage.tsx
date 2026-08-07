import { useState, useEffect } from 'react';
import { Plus, Home, Sparkles, Edit2, Trash2, Star, Search, Filter, Eye, Upload, Image, MapPin } from 'lucide-react';
import { listingApi } from '../services/api';
import ListingForm from '../components/listings/ListingForm';
import DescriptionVariants from '../components/listings/DescriptionVariants';
import ListingImage from '../components/listings/ListingImage';
import type { ListingSummary, ListingWithDetails, CreateListingData } from '../types';

type View = 'list' | 'create' | 'detail' | 'edit';

export default function ListingsPage() {
  const [view, setView] = useState<View>('list');
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Load listings on mount
  useEffect(() => {
    if (view === 'list') {
      loadListings();
    }
  }, [view]);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      const response = await listingApi.getAll();
      if (response.success && response.data) {
        setListings(response.data);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
      setError('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateListing = async (data: CreateListingData, photos: File[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await listingApi.create(data, photos);

      if (response.success && response.data) {
        // Load the full listing details
        const detailResponse = await listingApi.getById(response.data.id);
        if (detailResponse.success && detailResponse.data) {
          setSelectedListing(detailResponse.data);
          setView('detail');
        }
      }
    } catch (err: any) {
      console.error('Failed to create listing:', err);
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDescriptions = async () => {
    if (!selectedListing) return;

    try {
      setIsGenerating(true);
      setError(null);

      const response = await listingApi.generateDescriptions(selectedListing.id);

      if (response.success) {
        // Reload listing details to get the new descriptions
        const detailResponse = await listingApi.getById(selectedListing.id);
        if (detailResponse.success && detailResponse.data) {
          setSelectedListing(detailResponse.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate descriptions:', err);
      setError(err.response?.data?.error || 'Failed to generate descriptions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectDescription = async (descriptionId: string) => {
    if (!selectedListing) return;

    try {
      await listingApi.selectDescription(selectedListing.id, descriptionId);

      // Reload listing details
      const detailResponse = await listingApi.getById(selectedListing.id);
      if (detailResponse.success && detailResponse.data) {
        setSelectedListing(detailResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to select description:', err);
      setError(err.response?.data?.error || 'Failed to select description');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await listingApi.getById(id);
      if (response.success && response.data) {
        setSelectedListing(response.data);
        setView('detail');
      }
    } catch (err) {
      console.error('Failed to load listing:', err);
      setError('Failed to load listing details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditListing = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Always fetch the exact listing details for the requested ID
      const response = await listingApi.getById(id);
      if (response.success && response.data) {
        setSelectedListing(response.data);
        setView('edit');
      } else {
        setError('Failed to load listing details');
      }
    } catch (err) {
      console.error('Failed to load listing:', err);
      setError('Failed to load listing details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateListing = async (data: CreateListingData, photos: File[]) => {
    if (!selectedListing) return;

    try {
      setIsLoading(true);
      setError(null);

      // Update listing data and upload any new photos
      const response = await listingApi.update(selectedListing.id, data, photos);

      if (response.success && response.data) {
        setSelectedListing(response.data);
        setView('detail');
      } else {
        const detailResponse = await listingApi.getById(selectedListing.id);
        if (detailResponse.success && detailResponse.data) {
          setSelectedListing(detailResponse.data);
          setView('detail');
        }
      }
    } catch (err: any) {
      console.error('Failed to update listing:', err);
      setError(err.response?.data?.error || 'Failed to update listing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await listingApi.delete(id);

      if (response.success) {
        setView('list');
        setSelectedListing(null);
        await loadListings();
      }
    } catch (err: any) {
      console.error('Failed to delete listing:', err);
      setError(err.response?.data?.error || 'Failed to delete listing');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published': return { badge: 'badge-success', label: 'Published' };
      case 'draft': return { badge: 'badge-neutral', label: 'Draft' };
      case 'pending': return { badge: 'badge-yellow', label: 'Pending' };
      case 'sold': return { badge: 'badge-danger', label: 'Sold' };
      default: return { badge: 'badge-neutral', label: status };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">Property Listings</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage your property listings and AI-generated descriptions.
          </p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('create')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Listing
          </button>
        )}
        {view !== 'list' && (
          <button
            onClick={() => {
              setView('list');
              setSelectedListing(null);
              setError(null);
            }}
            className="btn btn-secondary"
          >
            Back to List
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="card border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary-dark" />
                <input
                  type="search"
                  placeholder="Search listings by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full sm:w-40"
              >
                <option value="All">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
              </select>
              <button className="btn btn-secondary">
                <Filter className="w-4 h-4" />
                Advanced Filters
              </button>
            </div>
          </div>

          {/* Listings Grid */}
          {isLoading ? (
            <div className="card p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-text-secondary dark:text-text-secondary-dark">Loading listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="card p-12 text-center">
              <Home className="w-16 h-16 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-4" />
              <p className="text-text-secondary dark:text-text-secondary-dark mb-4">
                {listings.length === 0 ? 'No listings yet. Create your first listing to get started!' : 'No listings match your filters.'}
              </p>
              {listings.length === 0 && (
                <button
                  onClick={() => setView('create')}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Listing
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => {
                const statusConfig = getStatusConfig(listing.status);
                return (
                  <div key={listing.id} className="card card-hover overflow-hidden">
                    {/* Listing Image with Shimmer Loading */}
                    <div className="relative h-40 bg-gradient-to-br from-primary-100 to-yellow-100 dark:from-primary-900/30 dark:to-yellow-900/30">
                      <ListingImage
                        src={
                          listing.thumbnailUrl
                            ? `http://localhost:3001${listing.thumbnailUrl}`
                            : listing.photos?.[0]
                              ? `http://localhost:3001${listing.photos[0].photo_url}`
                              : null
                        }
                        alt={listing.title}
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`badge ${statusConfig.badge}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                        {listing.hasDescriptions && (
                          <span className="badge badge-yellow flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Ready
                          </span>
                        )}
                        <span className="badge badge-primary">
                          {listing.photoCount} photos
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary-dark mb-2 line-clamp-1">{listing.title}</h3>
                      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-3 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {listing.location}
                      </p>
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-3">{formatPrice(listing.price)}</p>

                      <div className="flex items-center gap-4 text-sm text-text-tertiary dark:text-text-tertiary-dark mb-4">
                        {listing.bedrooms && <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {listing.bedrooms} BR</span>}
                        {listing.bathrooms && <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {listing.bathrooms} BA</span>}
                        {listing.land_area && <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {listing.land_area} m²</span>}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-border dark:border-border-dark">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(listing.id);
                          }}
                          className="flex-1 btn btn-ghost btn-sm flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditListing(listing.id);
                          }}
                          className="flex-1 btn btn-ghost btn-sm flex items-center justify-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteListing(listing.id);
                          }}
                          className="flex-1 btn btn-ghost btn-sm flex items-center justify-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create View */}
      {view === 'create' && (
        <ListingForm onSubmit={handleCreateListing} isLoading={isLoading} />
      )}

      {/* Edit View */}
      {view === 'edit' && selectedListing && (
        <ListingForm
          key={selectedListing.id}
          onSubmit={handleUpdateListing}
          isLoading={isLoading}
          initialData={selectedListing}
          isEditMode={true}
        />
      )}

      {view === 'detail' && selectedListing && (
        <div className="space-y-6 animate-slide-up">
          {/* Hero Card */}
          <div className="card overflow-hidden">
            {selectedListing.photos.length > 0 && (
              <div className="relative h-64 md:h-80 lg:h-96">
                <img
                  src={`http://localhost:3001${selectedListing.photos.find(p => p.is_featured)?.photo_url || selectedListing.photos[0].photo_url}`}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className={`badge ${getStatusConfig(selectedListing.status).badge} mb-2`}>
                        {getStatusConfig(selectedListing.status).label}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow">{selectedListing.title}</h2>
                      <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />{selectedListing.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl md:text-3xl font-bold text-white">{formatPrice(selectedListing.price)}</p>
                      {selectedListing.land_area && (
                        <p className="text-white/70 text-sm">
                          {formatPrice(Math.round(selectedListing.price / selectedListing.land_area))}/m²
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Meta strip */}
            <div className="px-6 py-3 border-t border-border flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {selectedListing.user_id ? 'Has owner' : 'Unassigned'}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Listed {new Date(selectedListing.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {selectedListing.updated_at !== selectedListing.created_at && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Updated {new Date(selectedListing.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {selectedListing.property_type && (
                <span className="badge badge-secondary capitalize">{selectedListing.property_type}</span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedListing.bedrooms != null && (
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{selectedListing.bedrooms}</p>
                <p className="text-sm text-text-tertiary">Bedrooms</p>
              </div>
            )}
            {selectedListing.bathrooms != null && (
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{selectedListing.bathrooms}</p>
                <p className="text-sm text-text-tertiary">Bathrooms</p>
              </div>
            )}
            {selectedListing.land_area != null && (
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{selectedListing.land_area}</p>
                <p className="text-sm text-text-tertiary">Land (m²)</p>
              </div>
            )}
            {selectedListing.building_area != null && (
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{selectedListing.building_area}</p>
                <p className="text-sm text-text-tertiary">Building (m²)</p>
              </div>
            )}
          </div>

          {/* Photo Gallery */}
          <div className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-large font-semibold text-text-primary dark:text-text-primary-dark">Photos ({selectedListing.photos.length})</h4>
              <button
                onClick={() => handleEditListing(selectedListing.id)}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Manage
              </button>
            </div>
            {selectedListing.photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedListing.photos.map((photo, idx) => (
                  <div key={photo.id} className={`relative rounded-lg overflow-hidden border-2 ${photo.is_featured ? 'border-yellow-400 ring-2 ring-yellow-300' : 'border-border dark:border-border-dark'}`}>
                    <img
                      src={`http://localhost:3001${photo.photo_url}`}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-36 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {photo.is_featured && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-white" />
                        Featured
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-border dark:border-border-dark rounded-lg text-center">
                <Image className="w-12 h-12 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-2" />
                <p className="text-text-secondary dark:text-text-secondary-dark">No photos uploaded</p>
              </div>
            )}
          </div>

          {/* Description */}
          {selectedListing.additional_info && (
            <div className="card p-4">
              <h4 className="text-large font-semibold text-text-primary dark:text-text-primary-dark mb-3">Additional Information</h4>
              <p className="text-md text-text-secondary dark:text-text-secondary-dark leading-relaxed whitespace-pre-wrap">{selectedListing.additional_info}</p>
            </div>
          )}

          {/* AI Descriptions */}
          <div className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-large font-semibold text-text-primary dark:text-text-primary-dark">AI-Generated Descriptions</h4>
              {selectedListing.descriptions.length === 0 && (
                <button
                  onClick={handleGenerateDescriptions}
                  disabled={isGenerating}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{isGenerating ? 'Generating...' : 'Generate Descriptions'}</span>
                </button>
              )}
            </div>
            <DescriptionVariants
              descriptions={selectedListing.descriptions}
              onSelect={handleSelectDescription}
              isGenerating={isGenerating}
            />
          </div>

          {/* Action bar */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => handleEditListing(selectedListing.id)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Listing
            </button>
            <button
              onClick={() => handleDeleteListing(selectedListing.id)}
              className="btn btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}