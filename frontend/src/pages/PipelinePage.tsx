import { useEffect, useState } from 'react';
import { Database, Home, Sparkles, Megaphone, CalendarDays, AlertTriangle, Clock } from 'lucide-react';
import { pipelineApi } from '../services/api';
import type { PipelineOverview } from '../types';
import ScrapedListingsTab from '../components/pipeline/ScrapedListingsTab';
import AnalysesTab from '../components/pipeline/AnalysesTab';
import PromoContentTab from '../components/pipeline/PromoContentTab';
import ContentCalendarTab from '../components/pipeline/ContentCalendarTab';

type TabId = 'listings' | 'analyses' | 'promo' | 'calendar';

const TABS: { id: TabId; label: string }[] = [
  { id: 'listings', label: 'Scraped Listings' },
  { id: 'analyses', label: 'Listing Analysis' },
  { id: 'promo', label: 'Promo Content' },
  { id: 'calendar', label: 'Content Calendar' },
];

export default function PipelinePage() {
  const [tab, setTab] = useState<TabId>('listings');
  const [overview, setOverview] = useState<PipelineOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    pipelineApi
      .getOverview()
      .then((res) => {
        if (active && res.success && res.data) setOverview(res.data);
      })
      .catch((err) => {
        if (!active) return;
        if (err?.response?.status === 503) setNotConfigured(true);
        else setError(err?.response?.data?.error || 'Failed to load pipeline overview');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = overview
    ? [
        { label: 'Sources', value: overview.sources, icon: Database },
        { label: 'Scraped Listings', value: overview.listings, icon: Home },
        { label: 'Analyses', value: overview.analyses, icon: Sparkles },
        { label: 'Promo Items', value: overview.promoContent, icon: Megaphone },
        { label: 'Calendar Items', value: overview.calendarItems, icon: CalendarDays },
        { label: 'Pending Approval', value: overview.pendingCalendar, icon: Clock },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          Content Pipeline
        </h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          Read-only view of the scraping and marketing pipeline database.
        </p>
      </div>

      {notConfigured ? (
        <div className="card border-warning-200 bg-warning-50 dark:bg-warning-950/20 text-warning-700 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Pipeline database is not configured.</p>
            <p>
              Set <code className="font-mono">PIPELINE_DB_NAME</code> (or{' '}
              <code className="font-mono">PIPELINE_DATABASE_URL</code>) in <code className="font-mono">backend/.env</code> and restart the API to browse
              this data.
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4 text-sm">{error}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-3 bg-grey-100 dark:bg-grey-800 rounded w-2/3 mb-3" />
                    <div className="h-6 bg-grey-100 dark:bg-grey-800 rounded w-1/3" />
                  </div>
                ))
              : stats.map((stat) => (
                  <div key={stat.label} className="card p-4">
                    <div className="flex items-center gap-2 text-text-tertiary mb-1">
                      <stat.icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">{stat.value.toLocaleString('id-ID')}</p>
                  </div>
                ))}
          </div>

          <div
            role="tablist"
            aria-label="Pipeline sections"
            className="flex w-fit max-w-full rounded-lg border border-border bg-grey-100 dark:bg-grey-900 p-1 gap-1 overflow-x-auto scrollbar-hide"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {tab === 'listings' && <ScrapedListingsTab />}
            {tab === 'analyses' && <AnalysesTab />}
            {tab === 'promo' && <PromoContentTab />}
            {tab === 'calendar' && <ContentCalendarTab />}
          </div>
        </>
      )}
    </div>
  );
}
