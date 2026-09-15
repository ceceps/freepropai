import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import { formatCompactIDR, formatDate, truncate } from '../../utils/format';
import type { PipelineAnalysis } from '../../types';

const PAGE_SIZE = 12;

export default function AnalysesTab() {
  const [analyses, setAnalyses] = useState<PipelineAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAnalyses = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await pipelineApi.getAnalyses({
          search: debouncedSearch || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        if (res.success && res.data) {
          setAnalyses((prev) => (append ? [...prev, ...res.data!] : res.data!));
          setTotal(res.total);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load listing analyses');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    fetchAnalyses(0, false);
  }, [fetchAnalyses]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buyer persona or selling points..."
          className="input w-full pl-9"
        />
      </div>

      <p className="text-sm text-text-tertiary">{total} listing analyses</p>

      {error && (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-2">
              <div className="h-4 bg-grey-100 dark:bg-grey-800 rounded w-1/3" />
              <div className="h-3 bg-grey-100 dark:bg-grey-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="card p-12 text-center text-text-tertiary">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No listing analyses found.
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => {
            const expanded = expandedId === analysis.id;
            return (
              <div key={analysis.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-text-primary truncate">
                      {analysis.listingTitle || 'Untitled listing'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-tertiary">
                      {analysis.listingPropertyType && <span className="badge badge-secondary">{analysis.listingPropertyType}</span>}
                      {analysis.listingPrice != null && <span>{formatCompactIDR(analysis.listingPrice)}</span>}
                      <span>Updated {formatDate(analysis.updatedAt || analysis.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(expanded ? null : analysis.id)}
                    className="btn btn-ghost btn-sm flex items-center gap-1 text-primary-600 dark:text-primary-400"
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expanded ? 'Hide' : 'Details'}
                  </button>
                </div>

                {analysis.buyerPersona && (
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase mb-1">Buyer Persona</p>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {expanded ? analysis.buyerPersona : truncate(analysis.buyerPersona, 180)}
                    </p>
                  </div>
                )}

                {analysis.sellingPoints && (
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase mb-1">Selling Points</p>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {expanded ? analysis.sellingPoints : truncate(analysis.sellingPoints, 180)}
                    </p>
                  </div>
                )}

                {expanded && analysis.fullAnalysisMarkdown && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-text-tertiary uppercase mb-1">Full Analysis</p>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{analysis.fullAnalysisMarkdown}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && analyses.length < total && (
        <div className="text-center">
          <button
            onClick={() => fetchAnalyses(analyses.length, true)}
            disabled={loadingMore}
            className="btn btn-secondary"
          >
            {loadingMore ? 'Loading...' : `Load more (${analyses.length}/${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
