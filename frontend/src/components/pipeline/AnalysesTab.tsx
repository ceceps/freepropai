import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles, Users, Target } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import { formatCompactIDR, formatDate } from '../../utils/format';
import { analysisPreviewText, parsePipelineAnalysis } from '../../utils/pipelineAnalysis';
import PipelineListingAnalysis from './PipelineListingAnalysis';
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
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
        setError(message || 'Failed to load listing analyses');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-br from-primary-50 via-surface to-amber-50 dark:from-primary-950/20 dark:via-surface dark:to-amber-950/20 border border-primary-100 dark:border-primary-900/30 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary-600 dark:bg-primary-500 text-white shadow-md shadow-primary-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">Analisa Properti AI</h3>
            <p className="text-sm text-text-secondary mt-1">
              Buyer Persona, selling point, dan ringkasan strategi dari listing yang sudah dianalisis di pipeline.
            </p>
          </div>
        </div>
        <p className="text-sm text-text-tertiary flex-shrink-0">{total} listing analyses</p>
      </div>

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

      {error && (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-grey-100 dark:bg-grey-800 rounded-2xl" />
          <div className="h-48 bg-grey-100 dark:bg-grey-800 rounded-2xl" />
        </div>
      ) : analyses.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <Target className="w-16 h-16 text-primary-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-text-primary mb-2">Belum Ada Analisis Properti</h4>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Analisis pipeline akan muncul di sini setelah listing berhasil dianalisis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => {
            const expanded = expandedId === analysis.id;
            const parsed = parsePipelineAnalysis(analysis);
            return (
              <div key={analysis.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-base text-text-primary">
                      {analysis.listingTitle || parsed.title || 'Untitled listing'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-tertiary">
                      {analysis.listingPropertyType && <span className="badge badge-secondary">{analysis.listingPropertyType}</span>}
                      {analysis.listingPrice != null && <span>{formatCompactIDR(analysis.listingPrice)}</span>}
                      <span>Updated {formatDate(analysis.updatedAt || analysis.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : analysis.id)}
                    className="btn btn-ghost btn-sm flex items-center gap-1 text-primary-600 dark:text-primary-400 min-h-11"
                    aria-expanded={expanded}
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expanded ? 'Hide' : 'Details'}
                  </button>
                </div>

                {!expanded && (
                  <div className="space-y-3">
                    {parsed.buyerPersonas[0] && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
                        <p className="text-sm text-text-secondary leading-relaxed">{analysisPreviewText(analysis, 180)}</p>
                      </div>
                    )}
                    {parsed.sellingPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parsed.sellingPoints.slice(0, 4).map((point) => (
                          <span
                            key={point.segment}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs rounded-lg font-medium"
                          >
                            {point.segment}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {expanded && <PipelineListingAnalysis analysis={analysis} showHeader={false} />}
              </div>
            );
          })}
        </div>
      )}

      {!loading && analyses.length < total && (
        <div className="text-center">
          <button
            type="button"
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
