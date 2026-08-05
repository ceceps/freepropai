import { useState, useEffect } from 'react';
import { Plus, Home, Sparkles, Edit2, Trash2, Star, Search, Filter, Eye, Upload, Image, MapPin } from 'lucide-react';
import { listingApi } from '../services/api';
import ListingForm from '../components/listings/ListingForm';
import DescriptionVariants from '../components/listings/DescriptionVariants';
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
                    {/* Listing Image Placeholder */}
                    <div className="relative h-40 bg-gradient-to-br from-primary-100 to-yellow-100 dark:from-primary-900/30 dark:to-yellow-900/30">
                      {listing.photos && listing.photos.length > 0 && (
                        <img
                          src={`http://localhost:3001${listing.photos[0].photo_url}`}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
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

                    <div className="p-5">
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

      {/* Detail View */}
      {view === 'detail' && selectedListing && (
        <div className="space-y-6">
          {/* Listing Info */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{selectedListing.title}</h3>
              <div className="flex items-center gap-2">
                <span className={`badge ${getStatusConfig(selectedListing.status).badge}`}>
                  {getStatusConfig(selectedListing.status).label}
                </span>
                <button
                  onClick={() => handleEditListing(selectedListing.id)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteListing(selectedListing.id)}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">Location</p>
                <p className="font-medium text-text-primary dark:text-text-primary-dark">{selectedListing.location}</p>
              </div>
              <div>
                <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">Price</p>
                <p className="font-medium text-primary-600 dark:text-primary-400">{formatPrice(selectedListing.price)}</p>
              </div>
              {selectedListing.land_area && (
                <div>
                  <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">Land Area</p>
                  <p className="font-medium text-text-primary dark:text-text-primary-dark">{selectedListing.land_area} m²</p>
                </div>
              )}
              {selectedListing.building_area && (
                <div>
                  <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">Building Area</p>
                  <p className="font-medium text-text-primary dark:text-text-primary-dark">{selectedListing.building_area} m²</p>
                </div>
              )}
              {selectedListing.bedrooms && (
                <div>
                  <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">Bedrooms</p>
                  <p className="font-medium text-text-primary dark:text-text-primary-dark">{selectedListing.bedrooms}</p>
                </div>
              )}
              {selectedListing.bathrooms && (
                <div>
                  <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">Bathrooms</p>
                  <p className="font-medium text-text-primary dark:text-text-primary-dark">{selectedListing.bathrooms}</p>
                </div>
              )}
            </div>
            {selectedListing.additional_info && (
              <div>
                <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark mb-2">Additional Info</p>
                <p className="text-text-secondary dark:text-text-secondary-dark">{selectedListing.additional_info}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Photos</h3>
              <button
                onClick={() => handleEditListing(selectedListing.id)}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Manage Photos
              </button>
            </div>
            {selectedListing.photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedListing.photos.map((photo) => (
                  <div key={photo.id} className="relative rounded-lg overflow-hidden border border-border dark:border-border-dark">
                    <img
                      src={`http://localhost:3001${photo.photo_url}`}
                      alt="Property"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {photo.is_featured && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 shadow">
                        <Star className="w-3.5 h-3.5 fill-white" />
                        <span>Featured</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-border dark:border-border-dark rounded-lg text-center">
                <Image className="w-12 h-12 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-2" />
                <p className="text-text-secondary dark:text-text-secondary-dark">No photos uploaded yet</p>
                <button
                  onClick={() => handleEditListing(selectedListing.id)}
                  className="mt-3 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                >
                  Add photos
                </button>
              </div>
            )}
          </div>

          {/* Descriptions */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">AI-Generated Descriptions</h3>
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
        </div>
      )}
    </div>
  );
}