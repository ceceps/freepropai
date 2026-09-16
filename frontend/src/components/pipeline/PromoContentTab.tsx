import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, ChevronDown, ChevronUp, Video, Image as ImageIcon, CalendarPlus, Check, Loader2 } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import { truncate } from '../../utils/format';
import type { PipelinePromoContent } from '../../types';

interface ListingGroup {
  listingId: string;
  listingTitle: string;
  featureImage: string | null;
  items: PipelinePromoContent[];
}

function ScheduleButton({ promoId }: { promoId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSchedule = async () => {
    setState('loading');
    try {
      const res = await pipelineApi.schedulePromoToCalendar(promoId);
      if (res.success && res.data) {
        setMsg(`Scheduled from ${res.data.from}`);
        setState('done');
      } else {
        setMsg('Failed');
        setState('error');
      }
    } catch {
      setMsg('Error');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
        <Check className="w-3.5 h-3.5" /> {msg}
      </span>
    );
  }

  return (
    <button
      onClick={handleSchedule}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-400 dark:hover:bg-primary-900/40 transition-colors disabled:opacity-60"
      title="Schedule to calendar from next available date"
    >
      {state === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CalendarPlus className="w-3.5 h-3.5" />
      )}
      {state === 'error' ? msg : 'Schedule'}
    </button>
  );
}

const PAGE_SIZE = 24;

interface ListingGroup {
  listingId: string;
  listingTitle: string;
  featureImage: string | null;
  items: PipelinePromoContent[];
}

export default function PromoContentTab() {
  const [items, setItems] = useState<PipelinePromoContent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedListing, setExpandedListing] = useState<string | null>(null);

  const fetchPromo = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await pipelineApi.getPromoContent({ limit: PAGE_SIZE, offset });
      if (res.success && res.data) {
        setItems((prev) => (append ? [...prev, ...res.data!] : res.data!));
        setTotal(res.total);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load promo content');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPromo(0, false);
  }, [fetchPromo]);

  const groups = useMemo(() => {
    const map = new Map<string, ListingGroup>();
    for (const item of items) {
      const key = item.listingId || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          listingId: key,
          listingTitle: item.listingTitle || 'Untitled listing',
          featureImage: item.listingFeatureImage || null,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-tertiary">{total} promo content items across {groups.length} listings</p>

      {error && (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-2">
              <div className="h-4 bg-grey-100 dark:bg-grey-800 rounded w-1/4" />
              <div className="h-3 bg-grey-100 dark:bg-grey-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-12 text-center text-text-tertiary">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No promo content plans found.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const expanded = expandedListing === group.listingId;
            const days = new Set(group.items.map((i) => i.dayNum)).size;
            return (
              <div key={group.listingId} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpandedListing(expanded ? null : group.listingId)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-grey-50 dark:hover:bg-grey-800/40 transition-colors"
                >
                  {group.featureImage ? (
                    <img src={group.featureImage} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-grey-100 dark:bg-grey-800 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-text-tertiary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-text-primary truncate">{group.listingTitle}</h4>
                    <p className="text-xs text-text-tertiary mt-0.5">{group.items.length} items across {days} days</p>
                  </div>
                  {expanded ? <ChevronUp className="w-5 h-5 text-text-tertiary" /> : <ChevronDown className="w-5 h-5 text-text-tertiary" />}
                </button>

                {expanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {group.items.map((item) => (
                        <div key={item.id} className="p-4 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="badge badge-primary">Day {item.dayNum} · #{item.seqNum}</span>
                            {item.angle && <span className="badge badge-secondary">{item.angle}</span>}
                            <div className="ml-auto">
                              <ScheduleButton promoId={item.id} />
                            </div>
                          </div>

                        {item.captionHpsc && (
                          <div>
                            <p className="text-xs font-semibold text-text-tertiary uppercase mb-1 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" /> Caption (HPSC)
                            </p>
                            <p className="text-sm text-text-secondary whitespace-pre-wrap">{item.captionHpsc}</p>
                          </div>
                        )}

                        {item.videoScript && (
                          <div>
                            <p className="text-xs font-semibold text-text-tertiary uppercase mb-1 flex items-center gap-1">
                              <Video className="w-3.5 h-3.5" /> Video Script
                            </p>
                            <p className="text-sm text-text-secondary whitespace-pre-wrap">
                              {truncate(item.videoScript, 1200)}
                            </p>
                          </div>
                        )}

                        {(item.posterSpec != null || item.videoMeta != null) && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-primary-600 dark:text-primary-400">Technical spec</summary>
                            <pre className="mt-2 bg-grey-50 dark:bg-grey-900/40 border border-border rounded-lg p-3 overflow-x-auto font-mono text-[11px] leading-relaxed">
                              {JSON.stringify({ posterSpec: item.posterSpec, videoMeta: item.videoMeta }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length < total && (
        <div className="text-center">
          <button
            onClick={() => fetchPromo(items.length, true)}
            disabled={loadingMore}
            className="btn btn-secondary"
          >
            {loadingMore ? 'Loading...' : `Load more (${items.length}/${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
