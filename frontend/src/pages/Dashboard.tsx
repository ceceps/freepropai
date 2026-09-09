import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Home, TrendingUp, ArrowUpRight,
  Plus, Download, LayoutDashboard, MapPin, Eye, Edit, Trash2,
  Tag, Clock, Zap, Filter, Loader2, AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import type { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  href?: string;
}

function StatCard({ title, value, change, changeType = 'neutral', icon, iconColor, bgColor, href }: StatCardProps) {
  return (
    <Link
      to={href || '#'}
      className="card card-hover p-6 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-primary mb-2">{value}</p>
          {change && (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${
                changeType === 'positive' ? 'text-green-600 dark:text-green-400' :
                changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
                'text-text-tertiary dark:text-text-tertiary-dark'
              }`}>
                {changeType === 'positive' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {changeType === 'negative' && <ArrowUpRight className="w-3.5 h-3.5 rotate-180" />}
                {change}
              </span>
              <span className="text-xs text-text-tertiary">vs last month</span>
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function formatPrice(price: number | null): string {
  if (!price) return '—';
  if (price >= 1e9) return `IDR ${(price / 1e9).toFixed(1)}B`;
  if (price >= 1e6) return `IDR ${(price / 1e6).toFixed(0)}M`;
  return `IDR ${price.toLocaleString()}`;
}

function getStatusBadge(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'active' || statusLower === 'published') return 'badge-success';
  if (statusLower === 'pending') return 'badge-warning';
  if (statusLower === 'draft') return 'badge-secondary';
  if (statusLower === 'sold') return 'badge-secondary';
  return 'badge-secondary';
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'leads'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await dashboardApi.getStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.error || 'Failed to load dashboard data');
        }
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in p-4 sm:p-6 lg:p-8">
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Unable to load dashboard</h3>
          <p className="text-text-secondary mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const counts = stats?.counts;
  const recentLeads = stats?.recentLeads || [];
  const recentListings = stats?.recentListings || [];

  const recentActivity = [
    ...recentLeads.slice(0, 3).map((lead) => ({
      id: `lead-${lead.id}`,
      type: 'lead' as const,
      title: 'New lead captured',
      description: `${lead.name} from ${lead.location || 'Unknown location'}`,
      time: formatRelativeTime(lead.createdAt),
      status: lead.status === 'new' ? ('new' as const) : ('pending' as const),
    })),
    ...recentListings.slice(0, 2).map((listing) => ({
      id: `listing-${listing.id}`,
      type: 'listing' as const,
      title: 'Listing published',
      description: `${listing.title} - ID: ${listing.id.slice(0, 8)}`,
      time: formatRelativeTime(listing.createdAt),
      status: 'completed' as const,
    })),
  ].slice(0, 5);

  const topListings = recentListings.map((listing) => ({
    ...listing,
    status: listing.status || 'draft',
  }));

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
          <button className="btn btn-secondary btn-sm">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            Quick Action
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Leads"
          value={counts?.totalLeads?.toLocaleString() || '0'}
          change={counts && counts.newLeads7d > 0 ? `+${counts.newLeads7d} this week` : undefined}
          changeType="positive"
          icon={<Users className="w-6 h-6" />}
          iconColor="text-primary-600 dark:text-primary-400"
          bgColor="bg-primary-50 dark:bg-primary-950/30"
          href="/leads"
        />
        <StatCard
          title="Active Listings"
          value={counts?.activeListings?.toString() || '0'}
          change={counts && counts.activeListings > 0 ? `+${counts.activeListings} active` : undefined}
          changeType="positive"
          icon={<Home className="w-6 h-6" />}
          iconColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          href="/listings"
        />
        <StatCard
          title="Pending Follow-ups"
          value={counts?.pendingFollowUps?.toString() || '0'}
          change={counts && counts.pendingFollowUps > 0 ? `${counts.pendingFollowUps} pending` : undefined}
          changeType={counts && counts.pendingFollowUps > 0 ? 'negative' : 'neutral'}
          icon={<MessageSquare className="w-6 h-6" />}
          iconColor="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-950/30"
          href="/followups"
        />
        <StatCard
          title="Hot Leads"
          value={counts?.hotLeads?.toString() || '0'}
          change={counts && counts.hotLeads > 0 ? `${counts.hotLeads} hot` : undefined}
          changeType="positive"
          icon={<TrendingUp className="w-6 h-6" />}
          iconColor="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-950/30"
          href="/leads?status=Hot"
        />
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-border">
          <nav className="flex gap-1 p-1" aria-label="Dashboard tabs">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'listings', label: 'Recent Listings', icon: Home },
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
                  <Link to="/activity" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 border border-border bg-surface hover:bg-grey-50 dark:hover:bg-grey-800/30 rounded-xl transition-colors"
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          activity.type === 'lead' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
                          'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {activity.type === 'lead' ? <Users className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                          <p className="text-sm text-text-secondary mt-0.5">{activity.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`badge ${
                            activity.status === 'new' ? 'badge-primary' :
                            activity.status === 'pending' ? 'badge-warning' :
                            activity.status === 'completed' ? 'badge-success' :
                            'badge-danger'
                          }`}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                          </span>
                          <span className="text-xs text-text-tertiary whitespace-nowrap">{activity.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-text-secondary">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Breakdown */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Lead Pipeline</h3>
                  <div className="card p-6 bg-grey-50/50 dark:bg-grey-900/20">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-surface border border-border rounded-xl shadow-sm">
                        <p className="text-3xl font-bold text-danger-600 dark:text-danger-400">{counts?.hotLeads || 0}</p>
                        <p className="text-sm text-text-secondary">Hot Leads</p>
                      </div>
                      <div className="text-center p-4 bg-surface border border-border rounded-xl shadow-sm">
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{counts?.warmLeads || 0}</p>
                        <p className="text-sm text-text-secondary">Warm Leads</p>
                      </div>
                      <div className="text-center p-4 bg-surface border border-border rounded-xl shadow-sm">
                        <p className="text-3xl font-bold text-text-tertiary">{counts?.coldLeads || 0}</p>
                        <p className="text-sm text-text-secondary">Cold Leads</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-border bg-surface rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-text-primary">Total Leads</p>
                          <p className="text-xs text-text-tertiary">{counts?.totalLeads || 0} total</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-text-primary">{counts?.totalLeads || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-border bg-surface rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-text-primary">New This Week</p>
                          <p className="text-xs text-text-tertiary">Last 7 days</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{counts?.newLeads7d || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="card p-6 bg-gradient-to-br from-primary-50 to-amber-50 dark:from-primary-900/10 dark:to-amber-900/10 border-primary-100 dark:border-primary-900/30">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-primary-600 dark:bg-primary-500 shadow-lg shadow-primary-500/20">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-text-primary mb-1">AI Insight</h4>
                      <p className="text-sm text-text-secondary leading-relaxed mb-4">
                        You have <strong className="text-text-primary font-bold">{counts?.pendingFollowUps || 0} pending follow-ups</strong> that need attention.
                        {counts?.hotLeads && counts.hotLeads > 0 ? (
                          <> Also <strong className="text-text-primary font-bold">{counts.hotLeads} hot leads</strong> are ready for immediate contact.</>
                        ) : null}
                      </p>
                      {counts && counts.pendingFollowUps > 0 ? (
                        <Link to="/followups" className="btn btn-primary btn-sm shadow-md">
                          <Plus className="w-3.5 h-3.5" />
                          View Follow-ups
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="search"
                    placeholder="Search listings..."
                    className="input max-w-xs"
                  />
                  <select className="input w-40">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Draft</option>
                    <option>Sold</option>
                  </select>
                  <button className="btn btn-secondary">
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </div>
                <Link to="/listings/new" className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  New Listing
                </Link>
              </div>

              <div className="table-container border border-border rounded-xl">
                <table className="table">
                  <thead>
                    <tr>
                      {['Property', 'Location', 'Price', 'Status', 'Created', 'Actions'].map((header, i) => (
                        <th key={i}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topListings.length > 0 ? (
                      topListings.map((listing) => (
                        <tr key={listing.id}>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center border border-primary-100 dark:border-primary-900/30">
                                <Home className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <p className="font-bold text-text-primary">{listing.title}</p>
                                <p className="text-xs text-text-tertiary">{listing.id.slice(0, 8)}</p>
                              </div>
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
                            <span className={getStatusBadge(listing.status)}>
                              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                            </span>
                          </td>
                          <td className="text-text-secondary">
                            {new Date(listing.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button className="btn btn-ghost btn-icon" title="View"><Eye className="w-4 h-4" /></button>
                              <button className="btn btn-ghost btn-icon" title="Edit"><Edit className="w-4 h-4" /></button>
                              <button className="btn btn-ghost btn-icon text-danger-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-text-secondary">
                          No listings yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="search"
                    placeholder="Search leads..."
                    className="input max-w-xs"
                  />
                  <select className="input w-40">
                    <option>All Status</option>
                    <option>Hot</option>
                    <option>Warm</option>
                    <option>Cold</option>
                  </select>
                </div>
                <Link to="/leads?action=new" className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  Add Lead
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentLeads.length > 0 ? (
                  recentLeads.map((lead) => (
                    <div key={lead.id} className="card card-hover p-6 border-border group">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-lg text-text-primary">{lead.name}</p>
                          <p className="text-xs text-text-tertiary font-mono">{lead.phone}</p>
                        </div>
                        <span className={`badge ${lead.score === 'Hot' ? 'badge-danger' : lead.score === 'Warm' ? 'badge-warning' : 'badge-secondary'}`}>
                          {lead.score || '—'}
                        </span>
                      </div>
                      <div className="space-y-2.5 text-sm text-text-secondary mb-5">
                        <div className="flex items-center gap-2.5"><MapPin className="w-3.5 h-3.5 text-text-tertiary" /> {lead.location || '—'}</div>
                        <div className="flex items-center gap-2.5"><Tag className="w-3.5 h-3.5 text-text-tertiary" /> {lead.unitType || '—'}</div>
                        <div className="flex items-center gap-2.5"><Clock className="w-3.5 h-3.5 text-text-tertiary" /> Last contact: {formatRelativeTime(lead.lastContactAt || lead.createdAt)}</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {lead.urgency && (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded uppercase tracking-wider border border-amber-100 dark:border-amber-900/30">{lead.urgency}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <button className="btn btn-ghost btn-sm flex-1 text-xs px-1">Message</button>
                        <button className="btn btn-ghost btn-sm flex-1 text-xs px-1">Call</button>
                        <button className="btn btn-primary btn-sm flex-1 text-xs px-1">Follow-up</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-text-secondary">
                    No leads yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}