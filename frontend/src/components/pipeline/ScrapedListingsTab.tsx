import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, Home } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import ZoomableImage from '../common/ZoomableImage';
import ScrapedListingDetail from './ScrapedListingDetail';
import { formatCompactIDR, formatDate } from '../../utils/format';
import type { PipelineListing, PipelineSource, PipelineFacets } from '../../types';

const PAGE_SIZE = 24;

export default function ScrapedListingsTab() {
  const [sources, setSources] = useState<PipelineSource[]>([]);
  const [facets, setFacets] = useState<PipelineFacets | null>(null);
  const [listings, setListings] = useState<PipelineListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [marketStatus, setMarketStatus] = useState<string | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.all([pipelineApi.getSources(), pipelineApi.getFacets()])
      .then(([sourcesRes, facetsRes]) => {
        if (sourcesRes.success && sourcesRes.data) setSources(sourcesRes.data);
        if (facetsRes.success && facetsRes.data) setFacets(facetsRes.data);
      })
      .catch(() => {
        /* overview banner already surfaces configuration errors */
      });
  }, []);

  const fetchListings = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await pipelineApi.getListings({
          sourceId,
          search: debouncedSearch || undefined,
          marketStatus,
          limit: PAGE_SIZE,
          offset,
        });
        if (res.success && res.data) {
          setListings((prev) => (append ? [...prev, ...res.data!] : res.data!));
          setTotal(res.total);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load scraped listings');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sourceId, debouncedSearch, marketStatus]
  );

  useEffect(() => {
    fetchListings(0, false);
  }, [fetchListings]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description..."
            className="input w-full pl-9"
          />
        </div>

        <select
          value={sourceId ?? ''}
          onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full"
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} ({source.listingCount})
            </option>
          ))}
        </select>

        <select
          value={marketStatus ?? ''}
          onChange={(e) => setMarketStatus(e.target.value || undefined)}
          className="w-full"
          aria-label="Filter by market status"
        >
          <option value="">All market status</option>
          {facets?.marketStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-sm text-text-tertiary">
        <span>{total} scraped listings</span>
        <button onClick={() => fetchListings(0, false)} className="btn btn-ghost btn-sm flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="h-40 bg-grey-100 dark:bg-grey-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-grey-100 dark:bg-grey-800 rounded w-3/4" />
                <div className="h-4 bg-grey-100 dark:bg-grey-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="card p-12 text-center text-text-tertiary">
          <Home className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No scraped listings match the current filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <button
              key={listing.id}
              onClick={() => setSelectedId(listing.id)}
              className="card card-hover p-0 overflow-hidden text-left flex flex-col"
            >
              {listing.featureImage ? (
                <ZoomableImage
                  src={listing.featureImage}
                  alt={listing.title || 'Listing'}
                  zoomable={false}
                  className="h-40 w-full"
                />
              ) : (
                <div className="h-40 w-full bg-grey-100 dark:bg-grey-800 flex items-center justify-center">
                  <Home className="w-8 h-8 text-text-tertiary opacity-50" />
                </div>
              )}
              <div className="p-4 space-y-2 flex-1 flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.sourceName && <span className="badge badge-info">{listing.sourceName}</span>}
                  {listing.marketStatus && <span className="badge badge-secondary">{listing.marketStatus}</span>}
                </div>
                <h4 className="font-semibold text-sm text-text-primary line-clamp-2">{listing.title || 'Untitled listing'}</h4>
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatCompactIDR(listing.price)}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-text-tertiary">
                  <span>{listing.bedrooms ?? '-'} bd · {listing.bathrooms ?? '-'} ba · {listing.lb ?? listing.lt ?? '-'} m²</span>
                  <span>{formatDate(listing.scrapedAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && listings.length < total && (
        <div className="text-center">
          <button
            onClick={() => fetchListings(listings.length, true)}
            disabled={loadingMore}
            className="btn btn-secondary"
          >
            {loadingMore ? 'Loading...' : `Load more (${listings.length}/${total})`}
          </button>
        </div>
      )}

      {selectedId && <ScrapedListingDetail listingId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
