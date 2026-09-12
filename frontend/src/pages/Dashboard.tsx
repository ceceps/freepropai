import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Home, ArrowUpRight,
  Plus, LayoutDashboard, MapPin, Phone,
  Clock, Zap, Activity, Flame, RefreshCw,
  AlertCircle, BedDouble, Bath, Search
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import type {
  DashboardStats,
  Lead,
  DashboardRecentListing
} from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  footnote?: string;
  footnoteType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  href?: string;
}

function StatCard({ title, value, footnote, footnoteType = 'neutral', icon, iconColor, bgColor, href }: StatCardProps) {
  return (
    <Link
      to={href || '#'}
      className="card card-hover p-6 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-primary mb-2">{value}</p>
          {footnote && (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${
                footnoteType === 'positive' ? 'text-green-600 dark:text-green-400' :
                footnoteType === 'negative' ? 'text-red-600 dark:text-red-400' :
                'text-text-tertiary dark:text-text-tertiary-dark'
              }`}>
                {footnoteType === 'positive' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {footnoteType === 'negative' && <ArrowUpRight className="w-3.5 h-3.5 rotate-180" />}
                {footnote}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </Link>
  );
}

const formatPrice = (price?: number | null) => {
  if (price === undefined || price === null) return '-';
  if (price >= 1_000_000_000) return `Rp ${(price / 1_000_000_000).toFixed(1)} M`;
  if (price >= 1_000_000) return `Rp ${(price / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${price.toLocaleString('id-ID')}`;
};

const formatRelativeTime = (value?: string | number | null) => {
  if (value === undefined || value === null) return '-';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getScoreBadge = (score: Lead['score']) => {
  switch (score) {
    case 'Hot': return 'badge-danger';
    case 'Warm': return 'badge-warning';
    case 'Cold': return 'badge-info';
    default: return 'badge-neutral';
  }
};

const getListingStatus = (status: string) => {
  switch (status) {
    case 'published':
    case 'active':
      return { badge: 'badge-success', label: 'Published' };
    case 'draft':
      return { badge: 'badge-neutral', label: 'Draft' };
    case 'sold':
      return { badge: 'badge-danger', label: 'Sold' };
    default:
      return { badge: 'badge-neutral', label: status };
  }
};

const getFollowUpStatus = (status: string) => {
  switch (status) {
    case 'pending': return { badge: 'badge-warning', label: 'Pending' };
    case 'approved': return { badge: 'badge-primary', label: 'Approved' };
    case 'sent': return { badge: 'badge-success', label: 'Sent' };
    case 'rejected': return { badge: 'badge-danger', label: 'Rejected' };
    default: return { badge: 'badge-neutral', label: status };
  }
};

interface ActivityEntry {
  id: string;
  type: 'lead' | 'followup' | 'listing';
  title: string;
  description: string;
  timestamp: number;
  statusLabel: string;
  badge: string;
}

const buildActivity = (stats: DashboardStats): ActivityEntry[] => {
  const entries: ActivityEntry[] = [];

  stats.recentLeads.forEach((lead) => {
    entries.push({
      id: `lead-${lead.id}`,
      type: 'lead',
      title: 'New lead added',
      description: `${lead.name} · ${lead.phone}`,
      timestamp: new Date(lead.createdAt).getTime(),
      statusLabel: lead.score,
      badge: getScoreBadge(lead.score),
    });
  });

  stats.recentFollowUps.forEach((fu) => {
    const config = getFollowUpStatus(fu.status);
    entries.push({
      id: `followup-${fu.id}`,
      type: 'followup',
      title: 'Follow-up scheduled',
      description: `${fu.leadName} · ${fu.leadPhone}`,
      timestamp: new Date(fu.scheduledFor || fu.createdAt).getTime(),
      statusLabel: config.label,
      badge: config.badge,
    });
  });

  stats.recentListings.forEach((listing) => {
    const config = getListingStatus(listing.status);
    entries.push({
      id: `listing-${listing.id}`,
      type: 'listing',
      title: 'Listing created',
      description: `${listing.title} · ${listing.location}`,
      timestamp: new Date(listing.createdAt).getTime(),
      statusLabel: config.label,
      badge: config.badge,
    });
  });

  return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
};

const EmptyState = ({ message, cta, to }: { message: string; cta: string; to: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-12">
    <div className="p-3 rounded-xl bg-grey-100 dark:bg-grey-800 mb-3">
      <Activity className="w-6 h-6 text-text-tertiary" />
    </div>
    <p className="text-sm text-text-secondary mb-4">{message}</p>
    <Link to={to} className="btn btn-primary btn-sm">
      <Plus className="w-4 h-4" />
      {cta}
    </Link>
  </div>
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'leads'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load dashboard statistics');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading the dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const counts = stats?.counts;
  const hotShare = counts && counts.totalLeads > 0
    ? Math.round((counts.hotLeads / counts.totalLeads) * 100)
    : 0;
  const activity = stats ? buildActivity(stats) : [];

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Welcome back! Here&apos;s what&apos;s happening with your properties today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/listings" className="btn btn-secondary btn-sm">
            <Home className="w-4 h-4" />
            View Listings
          </Link>
          <Link to="/leads" className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card p-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" />
          <p className="text-sm text-text-secondary">Loading dashboard...</p>
        </div>
      ) : error ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={fetchStats} className="btn btn-primary btn-sm">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Total Leads"
              value={counts?.totalLeads ?? 0}
              footnote={`${counts?.newLeads7d ?? 0} new this week`}
              footnoteType={counts && counts.newLeads7d > 0 ? 'positive' : 'neutral'}
              icon={<Users className="w-6 h-6" />}
              iconColor="text-primary-600 dark:text-primary-400"
              bgColor="bg-primary-50 dark:bg-primary-950/30"
              href="/leads"
            />
            <StatCard
              title="Active Listings"
              value={counts?.activeListings ?? 0}
              footnote={`${counts?.draftListings ?? 0} drafts pending`}
              icon={<Home className="w-6 h-6" />}
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-50 dark:bg-emerald-950/30"
              href="/listings"
            />
            <StatCard
              title="Pending Follow-ups"
              value={counts?.pendingFollowUps ?? 0}
              footnote={`${counts?.totalFollowUps ?? 0} total scheduled`}
              footnoteType={counts && counts.pendingFollowUps > 0 ? 'negative' : 'neutral'}
              icon={<MessageSquare className="w-6 h-6" />}
              iconColor="text-amber-600 dark:text-amber-400"
              bgColor="bg-amber-50 dark:bg-amber-950/30"
              href="/followups"
            />
            <StatCard
              title="Hot Leads"
              value={counts?.hotLeads ?? 0}
              footnote={`${hotShare}% of all leads`}
              icon={<Flame className="w-6 h-6" />}
              iconColor="text-red-600 dark:text-red-400"
              bgColor="bg-red-50 dark:bg-red-950/30"
              href="/leads"
            />
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="border-b border-border">
              <nav className="flex gap-1 p-1" aria-label="Dashboard tabs">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'listings', label: 'Top Listings', icon: Home },
                  { id: 'leads', label: 'Recent Leads', icon: Users },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-primary-100 text-text-primary dark:bg-primary-600 dark:text-white shadow-sm'
                          : 'text-text-secondary hover:bg-grey-50 dark:hover:bg-grey-800/50 hover:text-text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recent Activity */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
                    </div>
                    {activity.length === 0 ? (
                      <EmptyState
                        message="No recent activity yet. Add a lead or listing to get started."
                        cta="Add Lead"
                        to="/leads"
                      />
                    ) : (
                      <div className="space-y-3">
                        {activity.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-4 p-4 border border-border bg-surface hover:bg-grey-50 dark:hover:bg-grey-800/30 rounded-xl transition-colors"
                          >
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              item.type === 'lead' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
                              item.type === 'followup' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' :
                              'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {item.type === 'lead' && <Users className="w-4 h-4" />}
                              {item.type === 'followup' && <MessageSquare className="w-4 h-4" />}
                              {item.type === 'listing' && <Home className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary">{item.title}</p>
                              <p className="text-sm text-text-secondary mt-0.5 truncate">{item.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`badge ${item.badge}`}>{item.statusLabel}</span>
                              <span className="text-xs text-text-tertiary whitespace-nowrap">
                                {formatRelativeTime(item.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Real Performance Overview */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-4">Performance Overview</h3>
                      <div className="card p-6 h-full bg-grey-50/50 dark:bg-grey-900/20">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="text-center p-4 bg-surface border border-border rounded-xl shadow-sm">
                            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{counts?.newLeads7d ?? 0}</p>
                            <p className="text-sm text-text-secondary">New Leads (7d)</p>
                          </div>
                          <div className="text-center p-4 bg-surface border border-border rounded-xl shadow-sm">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{counts?.hotLeads ?? 0}</p>
                            <p className="text-sm text-text-secondary">Hot Leads</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Active Listings', value: counts?.activeListings ?? 0, trend: `${counts?.totalListings ?? 0} total`, color: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'Draft Listings', value: counts?.draftListings ?? 0, trend: 'Needs review', color: 'text-blue-600 dark:text-blue-400' },
                            { label: 'Pending Follow-ups', value: counts?.pendingFollowUps ?? 0, trend: `${counts?.totalFollowUps ?? 0} total`, color: 'text-amber-600 dark:text-amber-400' },
                            { label: 'Hot Lead Share', value: `${hotShare}%`, trend: 'Of all leads', color: 'text-indigo-600 dark:text-indigo-400' },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 border border-border bg-surface rounded-lg">
                              <p className="text-sm font-medium text-text-primary">{item.label}</p>
                              <div className="text-right">
                                <p className="text-lg font-bold text-text-primary">{item.value}</p>
                                <p className={`text-xs font-medium ${item.color}`}>{item.trend}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Data-driven insight */}
                    <div className="card p-6 bg-gradient-to-br from-primary-50 to-amber-50 dark:from-primary-900/10 dark:to-amber-900/10 border-primary-100 dark:border-primary-900/30">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-primary-600 dark:bg-primary-500 shadow-lg shadow-primary-500/20">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-text-primary mb-1">
                            {counts && counts.hotLeads > 0 ? 'Follow-up opportunity' : 'Build your pipeline'}
                          </h4>
                          <p className="text-sm text-text-secondary leading-relaxed mb-4">
                            {counts && counts.hotLeads > 0
                              ? `You have ${counts.hotLeads} hot lead${counts.hotLeads > 1 ? 's' : ''} and ${counts.pendingFollowUps} pending follow-up${counts.pendingFollowUps === 1 ? '' : 's'}. Prioritize them to convert faster.`
                              : counts && counts.totalLeads > 0
                                ? `You have ${counts.totalLeads} lead${counts.totalLeads > 1 ? 's' : ''} in your pipeline. Schedule follow-ups to keep the conversation going.`
                                : 'Add your first lead or listing to start tracking your pipeline here.'}
                          </p>
                          <Link
                            to={counts && counts.hotLeads > 0 ? '/followups' : '/leads'}
                            className="btn btn-primary btn-sm shadow-md"
                          >
                            {counts && counts.hotLeads > 0 ? (
                              <>
                                <MessageSquare className="w-3.5 h-3.5" />
                                Review Follow-ups
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Add Lead
                              </>
                            )}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'listings' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <p className="text-sm text-text-secondary">
                      Your most recently added listings.
                    </p>
                    <Link to="/listings" className="btn btn-primary">
                      <Plus className="w-4 h-4" />
                      Manage Listings
                    </Link>
                  </div>

                  {stats && stats.recentListings.length === 0 ? (
                    <EmptyState
                      message="No listings yet. Add or import a listing to see it here."
                      cta="New Listing"
                      to="/listings"
                    />
                  ) : (
                    <div className="table-container border border-border rounded-xl">
                      <table className="table">
                        <thead>
                          <tr>
                            {['Property', 'Location', 'Price', 'Status', 'Details', 'Added', 'Actions'].map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {stats?.recentListings.map((listing: DashboardRecentListing) => {
                            const statusConfig = getListingStatus(listing.status);
                            return (
                              <tr key={listing.id}>
                                <td className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center border border-primary-100 dark:border-primary-900/30">
                                      <Home className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <p className="font-bold text-text-primary">{listing.title}</p>
                                  </div>
                                </td>
                                <td>
                                  <div className="flex items-center gap-1.5 text-text-secondary">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {listing.location}
                                  </div>
                                </td>
                                <td className="font-bold text-text-primary">{formatPrice(listing.price)}</td>
                                <td>
                                  <span className={`badge ${statusConfig.badge}`}>{statusConfig.label}</span>
                                </td>
                                <td>
                                  <div className="flex items-center gap-3 text-text-secondary text-sm">
                                    <span className="flex items-center gap-1">
                                      <BedDouble className="w-3.5 h-3.5" />
                                      {listing.bedrooms ?? '-'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Bath className="w-3.5 h-3.5" />
                                      {listing.bathrooms ?? '-'}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-text-secondary text-sm whitespace-nowrap">
                                  {formatRelativeTime(listing.createdAt)}
                                </td>
                                <td>
                                  <Link
                                    to="/listings"
                                    className="btn btn-ghost btn-sm"
                                    title="Open in Listings"
                                  >
                                    <Search className="w-4 h-4" />
                                    View
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leads' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                    <p className="text-sm text-text-secondary">
                      Your most recently added leads.
                    </p>
                    <Link to="/leads" className="btn btn-primary">
                      <Plus className="w-4 h-4" />
                      Manage Leads
                    </Link>
                  </div>

                  {stats && stats.recentLeads.length === 0 ? (
                    <EmptyState
                      message="No leads yet. Add your first lead to see it here."
                      cta="Add Lead"
                      to="/leads"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {stats?.recentLeads.map((lead) => (
                        <div key={lead.id} className="card card-hover p-6 border-border group">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-bold text-lg text-text-primary">{lead.name}</p>
                              <p className="text-xs text-text-tertiary font-mono">{lead.phone}</p>
                            </div>
                            <span className={`badge ${getScoreBadge(lead.score)}`}>
                              {lead.score}
                            </span>
                          </div>
                          <div className="space-y-2.5 text-sm text-text-secondary mb-5">
                            <div className="flex items-center gap-2.5">
                              <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                              {lead.phone}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                              {lead.location || 'Location not set'}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Home className="w-3.5 h-3.5 text-text-tertiary" />
                              {lead.unitType || 'Any property type'}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                              Added {formatRelativeTime(lead.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <span className="badge badge-secondary capitalize">{lead.urgency}</span>
                            <Link to="/leads" className="btn btn-primary btn-sm flex-1 justify-center">
                              View Lead
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
