import { useState, useEffect } from 'react';
import { scrapingApi } from '../services/api';
import ZoomableImage from '../components/common/ZoomableImage';
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
      case 'completed': return 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800';
      case 'running': return 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800';
      case 'failed': return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/50 border border-red-200 dark:border-red-800';
      default: return 'text-text-secondary bg-grey-100 dark:bg-grey-800 border border-border';
    }
  };

  const getImportStatusColor = (status: string) => {
    switch (status) {
      case 'imported': return 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800';
      case 'pending': return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800';
      case 'skipped': return 'text-text-secondary bg-grey-100 dark:bg-grey-800 border border-border';
      case 'failed': return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/50 border border-red-200 dark:border-red-800';
      default: return 'text-text-secondary bg-grey-100 dark:bg-grey-800 border border-border';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-text-primary">Property Scraping</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Scraping Form */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Start New Scraping Job</h2>
        <form onSubmit={handleStartScraping} className="space-y-4">
          <div>
            <label className="input-label">
              Source Website
            </label>
            <select
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="input"
            >
              <option value="acehome">Acehome.com</option>
              <option value="prolov">Prolov.id</option>
              <option value="rumah123" disabled>Rumah123 (Coming Soon)</option>
              <option value="olx" disabled>OLX (Coming Soon)</option>
            </select>
          </div>

          <div>
            <label className="input-label">
              URL to Scrape
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.acehome.co.id/?reg=BBR&kat=rumah"
              className="input"
              required
            />
          </div>

          <div>
            <label className="input-label">
              Max Pages to Scrape
            </label>
            <input
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value))}
              min="1"
              max="20"
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3"
          >
            {loading ? 'Starting...' : 'Start Scraping'}
          </button>
        </form>
      </div>

      {/* Jobs List */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Scraping Jobs</h2>
          <button
            onClick={fetchJobs}
            className="btn btn-ghost text-primary-600 hover:text-primary-700 font-medium"
          >
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-text-tertiary text-center py-8">No scraping jobs yet</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 border rounded-lg cursor-pointer transition ${
                  selectedJob?.id === job.id 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' 
                    : 'border-border hover:border-primary-400'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{job.sourceName}</p>
                    <p className="text-sm text-text-secondary truncate">{job.sourceUrl}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-text-tertiary">
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
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">
            Scraped Listings ({scrapedListings.length})
          </h2>

          {scrapedListings.length === 0 ? (
            <p className="text-text-tertiary text-center py-8">No listings found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scrapedListings.map((listing) => (
                <div key={listing.id} className="border border-border rounded-lg overflow-hidden bg-surface">
                  {listing.imageUrls && listing.imageUrls.length > 0 && (
                    <ZoomableImage
                      src={listing.imageUrls[0]}
                      alt={listing.title}
                      className="w-full h-48"
                      downloadName={`scraped-${listing.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 30) || 'property'}.jpg`}
                    />
                  )}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-text-primary line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-text-secondary">{listing.location}</p>
                    {(listing.propertyType || listing.region) && (
                      <div className="flex flex-wrap gap-2">
                        {listing.propertyType && (
                          <span className="badge badge-primary capitalize">{listing.propertyType}</span>
                        )}
                        {listing.region && (
                          <span className="badge badge-warning">{listing.region}</span>
                        )}
                      </div>
                    )}
                    {listing.price != null && (
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        Rp {Number(listing.price).toLocaleString('id-ID')}
                      </p>
                    )}
                    <div className="flex gap-2 text-sm text-text-tertiary">
                      {listing.bedrooms && <span>{listing.bedrooms} KT</span>}
                      {listing.bathrooms && <span>{listing.bathrooms} KM</span>}
                      {listing.landArea && <span>{listing.landArea}m²</span>}
                    </div>
                    
                    <div className="pt-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getImportStatusColor(listing.importStatus)}`}>
                        {listing.importStatus}
                      </span>
                    </div>

                    {listing.importStatus === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleImportListing(listing.id)}
                          disabled={loading}
                          className="btn btn-success btn-sm flex-1"
                        >
                          Import
                        </button>
                        <button
                          onClick={() => handleSkipListing(listing.id)}
                          className="btn btn-secondary btn-sm flex-1"
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
