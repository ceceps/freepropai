import { useState, useEffect } from 'react';
import { scrapingApi } from '../services/api';
import type { ScrapingJob, ScrapedListing } from '../types';

export default function ScrapingPage() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ScrapingJob | null>(null);
  const [scrapedListings, setScrapedListings] = useState<ScrapedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [sourceUrl, setSourceUrl] = useState('https://www.acehome.co.id/?reg=BBR&kat=rumah');
  const [sourceName, setSourceName] = useState('acehome');
  const [maxPages, setMaxPages] = useState(5);

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Fetch scraped listings when job is selected
  useEffect(() => {
    if (selectedJob) {
      fetchScrapedListings(selectedJob.id);
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await scrapingApi.getJobs();
      if (response.success && response.data) {
        setJobs(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchScrapedListings = async (jobId: string) => {
    try {
      setLoading(true);
      const response = await scrapingApi.getScrapedListings(jobId);
      if (response.success && response.data) {
        setScrapedListings(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch scraped listings');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScraping = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceUrl) {
      setError('Please enter a URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await scrapingApi.createJob({
        sourceUrl,
        sourceName,
        maxPages,
      });

      if (response.success) {
        alert('Scraping job started! Check the jobs list for progress.');
        setSourceUrl('');
        fetchJobs();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start scraping');
    } finally {
      setLoading(false);
    }
  };

  const handleImportListing = async (listingId: string) => {
    try {
      setLoading(true);
      const response = await scrapingApi.importListing(listingId, {
        downloadImages: true,
        generateDescriptions: true,
      });

      if (response.success) {
        alert('Listing imported successfully!');
        if (selectedJob) {
          fetchScrapedListings(selectedJob.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import listing');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipListing = async (listingId: string) => {
    try {
      const response = await scrapingApi.skipListing(listingId);
      if (response.success) {
        if (selectedJob) {
          fetchScrapedListings(selectedJob.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to skip listing');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getImportStatusColor = (status: string) => {
    switch (status) {
      case 'imported': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'skipped': return 'text-gray-600 bg-gray-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Property Scraping</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Scraping Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Start New Scraping Job</h2>
        <form onSubmit={handleStartScraping} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Website
            </label>
            <select
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="acehome">Acehome.com</option>
              <option value="rumah123" disabled>Rumah123 (Coming Soon)</option>
              <option value="olx" disabled>OLX (Coming Soon)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL to Scrape
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.acehome.co.id/?reg=BBR&kat=rumah"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Pages to Scrape
            </label>
            <input
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value))}
              min="1"
              max="20"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Starting...' : 'Start Scraping'}
          </button>
        </form>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Scraping Jobs</h2>
          <button
            onClick={fetchJobs}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No scraping jobs yet</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 border rounded-lg cursor-pointer hover:border-blue-500 transition ${
                  selectedJob?.id === job.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{job.sourceName}</p>
                    <p className="text-sm text-gray-600 truncate">{job.sourceUrl}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Found: {job.totalListingsFound}</span>
                  <span>Imported: {job.totalListingsImported}</span>
                  <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scraped Listings */}
      {selectedJob && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Scraped Listings ({scrapedListings.length})
          </h2>

          {scrapedListings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No listings found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scrapedListings.map((listing) => (
                <div key={listing.id} className="border rounded-lg overflow-hidden">
                  {listing.imageUrls && listing.imageUrls.length > 0 && (
                    <img
                      src={listing.imageUrls[0]}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{listing.location}</p>
                    {listing.price != null && (
                      <p className="text-lg font-bold text-blue-600 mb-2">
                        Rp {Number(listing.price).toLocaleString('id-ID')}
                      </p>
                    )}
                    <div className="flex gap-2 text-sm text-gray-600 mb-3">
                      {listing.bedrooms && <span>{listing.bedrooms} KT</span>}
                      {listing.bathrooms && <span>{listing.bathrooms} KM</span>}
                      {listing.landArea && <span>{listing.landArea}m²</span>}
                    </div>
                    
                    <div className="mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getImportStatusColor(listing.importStatus)}`}>
                        {listing.importStatus}
                      </span>
                    </div>

                    {listing.importStatus === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleImportListing(listing.id)}
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                        >
                          Import
                        </button>
                        <button
                          onClick={() => handleSkipListing(listing.id)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 text-sm font-medium"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
