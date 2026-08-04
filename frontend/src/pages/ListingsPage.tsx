import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Home, Sparkles } from 'lucide-react';
import { listingApi } from '../services/api';
import ListingForm from '../components/listings/ListingForm';
import DescriptionVariants from '../components/listings/DescriptionVariants';
import type { ListingSummary, ListingWithDetails, CreateListingData } from '../types';

type View = 'list' | 'create' | 'detail';

export default function ListingsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const detailResponse = await listingApi.getById(response.data.listingId);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">FreePropAI</h1>
            <div className="flex space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link to="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link to="/followups" className="text-gray-600 hover:text-gray-900">Follow-ups</Link>
              <Link to="/listings" className="text-primary-600 font-medium">Listings</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {view === 'list' && 'Property Listings'}
            {view === 'create' && 'Create New Listing'}
            {view === 'detail' && 'Listing Details'}
          </h2>
          
          {view === 'list' && (
            <button
              onClick={() => setView('create')}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Listing</span>
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
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div>
            {isLoading ? (
              <div className="card">
                <p className="text-center py-8 text-gray-600">Loading listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="card">
                <div className="text-center py-12">
                  <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No listings yet. Create your first listing to get started!</p>
                  <button
                    onClick={() => setView('create')}
                    className="btn btn-primary"
                  >
                    Create First Listing
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div key={listing.id} className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewDetail(listing.id)}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-gray-900">{listing.title}</h3>
                      <span className={`badge ${listing.status === 'published' ? 'badge-hot' : 'badge-cold'}`}>
                        {listing.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">📍 {listing.location}</p>
                    <p className="text-xl font-bold text-primary-600 mb-3">{formatPrice(listing.price)}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      {listing.bedrooms && <span>🛏️ {listing.bedrooms} KT</span>}
                      {listing.bathrooms && <span>🚿 {listing.bathrooms} KM</span>}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{listing.photoCount} photos</span>
                      {listing.hasDescriptions ? (
                        <span className="text-green-600 flex items-center">
                          <Sparkles className="w-4 h-4 mr-1" />
                          Descriptions ready
                        </span>
                      ) : (
                        <span className="text-gray-400">No descriptions</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create View */}
        {view === 'create' && (
          <ListingForm onSubmit={handleCreateListing} isLoading={isLoading} />
        )}

        {/* Detail View */}
        {view === 'detail' && selectedListing && (
          <div className="space-y-6">
            {/* Listing Info */}
            <div className="card">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{selectedListing.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{selectedListing.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-medium text-primary-600">{formatPrice(selectedListing.price)}</p>
                </div>
                {selectedListing.land_area && (
                  <div>
                    <p className="text-sm text-gray-600">Land Area</p>
                    <p className="font-medium">{selectedListing.land_area} m²</p>
                  </div>
                )}
                {selectedListing.building_area && (
                  <div>
                    <p className="text-sm text-gray-600">Building Area</p>
                    <p className="font-medium">{selectedListing.building_area} m²</p>
                  </div>
                )}
                {selectedListing.bedrooms && (
                  <div>
                    <p className="text-sm text-gray-600">Bedrooms</p>
                    <p className="font-medium">{selectedListing.bedrooms}</p>
                  </div>
                )}
                {selectedListing.bathrooms && (
                  <div>
                    <p className="text-sm text-gray-600">Bathrooms</p>
                    <p className="font-medium">{selectedListing.bathrooms}</p>
                  </div>
                )}
              </div>
              {selectedListing.additional_info && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Additional Info</p>
                  <p className="text-gray-800">{selectedListing.additional_info}</p>
                </div>
              )}
            </div>

            {/* Photos */}
            {selectedListing.photos.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedListing.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.photo_url}
                      alt="Property"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Descriptions */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">AI-Generated Descriptions</h3>
                {selectedListing.descriptions.length === 0 && (
                  <button
                    onClick={handleGenerateDescriptions}
                    disabled={isGenerating}
                    className="btn btn-primary flex items-center space-x-2"
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
      </main>
    </div>
  );
}