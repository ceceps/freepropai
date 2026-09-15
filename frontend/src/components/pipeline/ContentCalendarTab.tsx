import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import { formatDate, truncate } from '../../utils/format';
import type { PipelineCalendarItem, PipelineFacets } from '../../types';

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  posted: 'badge-info',
};

export default function ContentCalendarTab() {
  const [items, setItems] = useState<PipelineCalendarItem[]>([]);
  const [facets, setFacets] = useState<PipelineFacets | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    pipelineApi
      .getFacets()
      .then((res) => {
        if (res.success && res.data) setFacets(res.data);
      })
      .catch(() => {
        /* overview banner already surfaces configuration errors */
      });
  }, []);

  const fetchCalendar = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await pipelineApi.getContentCalendar({
          platform: platform || undefined,
          approvalStatus: approvalStatus || undefined,
          from: from || undefined,
          to: to || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        if (res.success && res.data) {
          setItems((prev) => (append ? [...prev, ...res.data!] : res.data!));
          setTotal(res.total);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load content calendar');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [platform, approvalStatus, from, to]
  );

  useEffect(() => {
    fetchCalendar(0, false);
  }, [fetchCalendar]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full" aria-label="Filter by platform">
          <option value="">All platforms</option>
          {facets?.platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} className="w-full" aria-label="Filter by approval status">
          <option value="">All statuses</option>
          {facets?.approvalStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-full" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-full" aria-label="To date" />

        <button onClick={() => fetchCalendar(0, false)} className="btn btn-secondary flex items-center justify-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <p className="text-sm text-text-tertiary">{total} scheduled content items</p>

      {error && (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-text-tertiary animate-pulse">Loading calendar...</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-text-tertiary">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No scheduled content matches the current filters.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grey-50 dark:bg-grey-900/40 text-text-tertiary">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Listing</th>
                  <th className="text-left font-medium px-4 py-3">Platform</th>
                  <th className="text-left font-medium px-4 py-3">Type</th>
                  <th className="text-left font-medium px-4 py-3">Hook</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Approved by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-grey-50 dark:hover:bg-grey-800/40 transition-colors align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-text-secondary">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-text-primary max-w-[220px]">{item.listingTitle || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{item.platform}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{item.contentType}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-[280px]">{truncate(item.hook, 90) || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[item.approvalStatus || 'pending'] || 'badge-secondary'}`}>
                        {item.approvalStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{item.approvedByName || item.approvedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && items.length < total && (
        <div className="text-center">
          <button
            onClick={() => fetchCalendar(items.length, true)}
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
