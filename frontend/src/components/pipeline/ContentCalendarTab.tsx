import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, LayoutList, RefreshCw } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import { formatDate, truncate } from '../../utils/format';
import ContentCalendarView, { type CalendarViewMode } from './ContentCalendarView';
import ContentCalendarDetailDrawer from './ContentCalendarDetailDrawer';
import type { PipelineCalendarItem, PipelineFacets } from '../../types';

const PAGE_SIZE = 25;
const CALENDAR_FETCH_LIMIT = 1000;

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  posted: 'badge-info',
};

type TabView = 'calendar' | 'table';

const toDateParam = (date: Date) => date.toLocaleDateString('en-CA');

const monthBounds = (month: Date) => ({
  from: toDateParam(new Date(month.getFullYear(), month.getMonth(), 1)),
  to: toDateParam(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
});

/** For week/day views we fetch a ±2-month window so navigation within that range is instant. */
const wideBounds = (month: Date) => ({
  from: toDateParam(new Date(month.getFullYear(), month.getMonth() - 1, 1)),
  to: toDateParam(new Date(month.getFullYear(), month.getMonth() + 2, 0)),
});

export default function ContentCalendarTab() {
  const [tabView, setTabView] = useState<TabView>('calendar');
  const [calView, setCalView] = useState<CalendarViewMode>('month');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [items, setItems] = useState<PipelineCalendarItem[]>([]);
  const [facets, setFacets] = useState<PipelineFacets | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [platform, setPlatform] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

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

  const loadCalendarItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch a wider window for week/day so navigation stays snappy
      const bounds = calView === 'month' ? monthBounds(month) : wideBounds(month);
      const res = await pipelineApi.getContentCalendar({
        platform: platform || undefined,
        approvalStatus: approvalStatus || undefined,
        from: bounds.from,
        to: bounds.to,
        limit: CALENDAR_FETCH_LIMIT,
        offset: 0,
      });
      if (res.success && res.data) {
        setItems(res.data);
        setTotal(res.total);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load content calendar');
    } finally {
      setLoading(false);
    }
  }, [month, platform, approvalStatus, calView]);

  const fetchTable = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await pipelineApi.getContentCalendar({
          platform: platform || undefined,
          approvalStatus: approvalStatus || undefined,
          from: filterFrom || undefined,
          to: filterTo || undefined,
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
    [platform, approvalStatus, filterFrom, filterTo]
  );

  useEffect(() => {
    if (tabView === 'calendar') loadCalendarItems();
    else fetchTable(0, false);
  }, [tabView, loadCalendarItems, fetchTable]);

  const refresh = () => {
    if (tabView === 'calendar') loadCalendarItems();
    else fetchTable(0, false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-grey-50 dark:bg-grey-900/40">
          <button
            onClick={() => setTabView('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              tabView === 'calendar' ? 'bg-surface text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Calendar
          </button>
          <button
            onClick={() => setTabView('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              tabView === 'table' ? 'bg-surface text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <LayoutList className="w-4 h-4" /> Table
          </button>
        </div>

        <button onClick={refresh} className="btn btn-secondary flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full" aria-label="Filter by platform">
          <option value="">All platforms</option>
          {facets?.platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={approvalStatus}
          onChange={(e) => setApprovalStatus(e.target.value)}
          className="w-full"
          aria-label="Filter by approval status"
        >
          <option value="">All statuses</option>
          {facets?.approvalStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {tabView === 'table' && (
          <>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="input w-full" aria-label="From date" />
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="input w-full" aria-label="To date" />
          </>
        )}
      </div>

      <p className="text-sm text-text-tertiary">
        {tabView === 'calendar'
          ? `${items.length} items in ${month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
          : `${total} scheduled content items`}
      </p>

      {error && (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      )}

      {tabView === 'calendar' ? (
        <ContentCalendarView
          month={month}
          items={items}
          loading={loading}
          onMonthChange={setMonth}
          onSelectItem={setSelectedId}
          viewMode={calView}
          onViewModeChange={setCalView}
        />
      ) : loading ? (
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
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className="hover:bg-grey-50 dark:hover:bg-grey-800/40 transition-colors align-top cursor-pointer"
                  >
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

      {tabView === 'table' && !loading && items.length < total && (
        <div className="text-center">
          <button onClick={() => fetchTable(items.length, true)} disabled={loadingMore} className="btn btn-secondary">
            {loadingMore ? 'Loading...' : `Load more (${items.length}/${total})`}
          </button>
        </div>
      )}

      {selectedId && <ContentCalendarDetailDrawer calendarId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
