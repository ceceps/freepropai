import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Home, TrendingUp, ArrowUpRight,
  Plus, Download, LayoutDashboard, MapPin, Eye, Edit, Trash2,
  Phone, Tag, Clock, Zap, Activity, Filter
} from 'lucide-react';
import { useState } from 'react';

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

interface ActivityItem {
  id: number;
  type: 'lead' | 'followup' | 'listing' | 'system';
  title: string;
  description: string;
  time: string;
  status: 'new' | 'pending' | 'completed' | 'urgent';
}

const recentActivity: ActivityItem[] = [
  { id: 1, type: 'lead', title: 'New lead captured', description: 'John Doe from Jakarta Selatan', time: '2 min ago', status: 'new' },
  { id: 2, type: 'followup', title: 'Follow-up scheduled', description: 'Call with Sarah Wilson at 2:00 PM', time: '15 min ago', status: 'pending' },
  { id: 3, type: 'listing', title: 'Listing published', description: 'Luxury Villa in Kemang - ID: LP-2024-001', time: '1 hour ago', status: 'completed' },
  { id: 4, type: 'lead', title: 'Lead qualified', description: 'Michael Chen moved to Hot status', time: '3 hours ago', status: 'urgent' },
  { id: 5, type: 'system', title: 'AI description generated', description: '3 new property descriptions created', time: '5 hours ago', status: 'completed' },
];

const topListings = [
  { id: 'LP-2024-001', title: 'Luxury Villa Kemang', location: 'Kemang, South Jakarta', price: 'IDR 15.5B', status: 'Active', views: 1240, inquiries: 23 },
  { id: 'LP-2024-002', title: 'Modern Apartment SCBD', location: 'SCBD, South Jakarta', price: 'IDR 8.2B', status: 'Active', views: 980, inquiries: 18 },
  { id: 'LP-2024-003', title: 'Family House Pondok Indah', location: 'Pondok Indah, South Jakarta', price: 'IDR 12.0B', status: 'Pending', views: 756, inquiries: 12 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'leads'>('overview');

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">Dashboard</h1>
            <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
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
            value="1,247"
            change="+12.5%"
            changeType="positive"
            icon={<Users className="w-6 h-6" />}
            iconColor="text-primary-600 dark:text-primary-400"
            bgColor="bg-primary-100 dark:bg-primary-900/30"
            href="/leads"
          />
          <StatCard
            title="Active Listings"
            value="89"
            change="+3"
            changeType="positive"
            icon={<Home className="w-6 h-6" />}
            iconColor="text-green-600 dark:text-green-400"
            bgColor="bg-green-100 dark:bg-green-900/30"
            href="/listings"
          />
          <StatCard
            title="Pending Follow-ups"
            value="23"
            change="-5"
            changeType="positive"
            icon={<MessageSquare className="w-6 h-6" />}
            iconColor="text-yellow-600 dark:text-yellow-400"
            bgColor="bg-yellow-100 dark:bg-yellow-900/30"
            href="/followups"
          />
          <StatCard
            title="Conversion Rate"
            value="24.8%"
            change="+2.1%"
            changeType="positive"
            icon={<TrendingUp className="w-6 h-6" />}
            iconColor="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-100 dark:bg-purple-900/30"
          />
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="border-b border-border dark:border-border-dark">
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
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-text-secondary dark:text-text-secondary-dark hover:bg-accent dark:hover:bg-accent-dark hover:text-text-primary dark:hover:text-text-primary-dark'
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Recent Activity</h3>
                    <Link to="/activity" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 bg-accent/50 dark:bg-accent-dark/50 rounded-xl hover:bg-accent dark:hover:bg-accent-dark transition-colors"
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          activity.type === 'lead' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                          activity.type === 'followup' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                          activity.type === 'listing' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                          'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}>
                          {activity.type === 'lead' && <Users className="w-4 h-4" />}
                          {activity.type === 'followup' && <MessageSquare className="w-4 h-4" />}
                          {activity.type === 'listing' && <Home className="w-4 h-4" />}
                          {activity.type === 'system' && <Activity className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">{activity.title}</p>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-0.5">{activity.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge ${
                            activity.status === 'new' ? 'badge-primary' :
                            activity.status === 'pending' ? 'badge-yellow' :
                            activity.status === 'completed' ? 'badge-success' :
                            'badge-danger'
                          }`}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                          </span>
                          <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark whitespace-nowrap">{activity.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats & Charts Placeholder */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">Performance Overview</h3>
                    <div className="card p-6 h-full">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-accent/50 dark:bg-accent-dark/50 rounded-xl">
                          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">2,847</p>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">Total Views</p>
                        </div>
                        <div className="text-center p-4 bg-accent/50 dark:bg-accent-dark/50 rounded-xl">
                          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">156</p>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">Inquiries</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: 'Lead Response Time', value: '< 2 hours', trend: 'Excellent', color: 'text-green-600 dark:text-green-400' },
                          { label: 'Listing Quality Score', value: '94/100', trend: 'Above Average', color: 'text-blue-600 dark:text-blue-400' },
                          { label: 'AI Description Usage', value: '78%', trend: 'Increasing', color: 'text-purple-600 dark:text-purple-400' },
                          { label: 'Mobile Traffic', value: '67%', trend: 'Stable', color: 'text-orange-600 dark:text-orange-400' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-accent/30 dark:bg-accent-dark/30 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">{item.label}</p>
                              <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">{item.trend}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-text-primary dark:text-text-primary-dark">{item.value}</p>
                              <p className={`text-xs font-medium ${item.color}`}>{item.trend}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  <div className="card p-6 bg-gradient-to-br from-primary-50 to-yellow-50 dark:from-primary-900/20 dark:to-yellow-900/20 border-primary-200/50 dark:border-primary-800/50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-600 dark:bg-primary-500">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text-primary dark:text-text-primary-dark mb-1">AI Insight</h4>
                        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-3">
                          Your listings with AI-generated descriptions receive <strong className="text-text-primary dark:text-text-primary-dark">34% more inquiries</strong> on average.
                          Consider generating descriptions for your 12 listings without AI content.
                        </p>
                        <button className="btn btn-primary btn-sm">
                          <Plus className="w-3.5 h-3.5" />
                          Generate Descriptions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'listings' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="search"
                      placeholder="Search listings..."
                      className="input w-full sm:w-64"
                    />
                    <select className="input w-full sm:w-40">
                      <option>All Status</option>
                      <option>Active</option>
                      <option>Pending</option>
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

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border-dark">
                        {['Property', 'Location', 'Price', 'Status', 'Views', 'Inquiries', 'Actions'].map((header, i) => (
                          <th key={i} className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-text-tertiary-dark uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border-dark">
                      {topListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-accent/50 dark:hover:bg-accent-dark/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <Home className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <p className="font-medium text-text-primary dark:text-text-primary-dark">{listing.title}</p>
                                <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">{listing.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                            <MapPin className="w-3.5 h-3.5 inline mr-1" />
                            {listing.location}
                          </td>
                          <td className="py-4 px-4 text-sm font-medium text-text-primary dark:text-text-primary-dark">{listing.price}</td>
                          <td className="py-4 px-4">
                            <span className={`badge ${listing.status === 'Active' ? 'badge-success' : 'badge-yellow'}`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">{listing.views.toLocaleString()}</td>
                          <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">{listing.inquiries}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors" title="View">
                                <Eye className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                              </button>
                              <button className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors" title="Edit">
                                <Edit className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                              </button>
                              <button className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="search"
                      placeholder="Search leads..."
                      className="input w-full sm:w-64"
                    />
                    <select className="input w-full sm:w-40">
                      <option>All Status</option>
                      <option>Hot</option>
                      <option>Warm</option>
                      <option>Cold</option>
                    </select>
                  </div>
                  <Link to="/leads/new" className="btn btn-primary">
                    <Plus className="w-4 h-4" />
                    Add Lead
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'John Doe', email: 'john@example.com', phone: '+62 812-3456-7890', status: 'Hot', source: 'Website', lastContact: 'Today', tags: ['Villa', 'Kemang', 'Urgent'] },
                    { name: 'Sarah Wilson', email: 'sarah@company.com', phone: '+62 813-9876-5432', status: 'Warm', source: 'Referral', lastContact: '2 days ago', tags: ['Apartment', 'SCBD'] },
                    { name: 'Michael Chen', email: 'mchen@email.com', phone: '+62 811-5555-1234', status: 'Hot', source: 'Social Media', lastContact: 'Yesterday', tags: ['House', 'Pondok Indah', 'Investment'] },
                    { name: 'Emily Park', email: 'emily.park@mail.com', phone: '+62 812-4444-9999', status: 'Cold', source: 'Website', lastContact: '1 week ago', tags: ['Land', 'Bogor'] },
                    { name: 'David Kim', email: 'david.kim@corp.com', phone: '+62 813-7777-8888', status: 'Warm', source: 'Event', lastContact: '3 days ago', tags: ['Commercial', 'Sudirman'] },
                    { name: 'Lisa Tan', email: 'lisa.tan@startup.io', phone: '+62 811-2222-3333', status: 'Hot', source: 'Referral', lastContact: 'Today', tags: ['Condo', 'Kuningan', 'Rental'] },
                  ].map((lead, i) => (
                    <div key={i} className="card card-hover p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-text-primary dark:text-text-primary-dark">{lead.name}</p>
                          <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">{lead.email}</p>
                        </div>
                        <span className={`badge ${lead.status === 'Hot' ? 'badge-danger' : lead.status === 'Warm' ? 'badge-yellow' : 'badge-neutral'}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-text-secondary dark:text-text-secondary-dark mb-3">
                        <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.phone}</div>
                        <div className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {lead.source}</div>
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last contact: {lead.lastContact}</div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {lead.tags.map((tag, ti) => (
                          <span key={ti} className="badge badge-primary text-xs">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-sm flex-1"><MessageSquare className="w-3.5 h-3.5" /> Message</button>
                        <button className="btn btn-ghost btn-sm flex-1"><Phone className="w-3.5 h-3.5" /> Call</button>
                        <button className="btn btn-primary btn-sm flex-1"><ArrowUpRight className="w-3.5 h-3.5" /> Follow-up</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
