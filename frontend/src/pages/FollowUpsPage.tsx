import {
  MessageSquare, Search, Plus, Phone, Mail, MapPin,
  Clock, CheckCircle, AlertCircle, XCircle,
  User, Calendar, RotateCcw, Eye, Edit, Trash2
} from 'lucide-react';
import { useState } from 'react';

interface FollowUp {
  id: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  type: 'call' | 'email' | 'meeting' | 'site_visit';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  scheduledAt: string;
  completedAt?: string;
  notes: string;
  assignedTo: string;
}

const mockFollowUps: FollowUp[] = [
  { id: 'FU-001', leadName: 'John Doe', leadEmail: 'john@example.com', leadPhone: '+62 812-3456-7890', type: 'call', status: 'overdue', priority: 'high', scheduledAt: '2024-01-15 10:00', notes: 'Discuss villa options in Kemang', assignedTo: 'Admin' },
  { id: 'FU-002', leadName: 'Sarah Wilson', leadEmail: 'sarah@company.com', leadPhone: '+62 813-9876-5432', type: 'email', status: 'pending', priority: 'medium', scheduledAt: '2024-01-16 14:00', notes: 'Send apartment listings in SCBD', assignedTo: 'Admin' },
  { id: 'FU-003', leadName: 'Michael Chen', leadEmail: 'mchen@email.com', leadPhone: '+62 811-5555-1234', type: 'meeting', status: 'pending', priority: 'high', scheduledAt: '2024-01-17 09:00', notes: 'Site visit for Pondok Indah house', assignedTo: 'Admin' },
  { id: 'FU-004', leadName: 'Emily Park', leadEmail: 'emily.park@mail.com', leadPhone: '+62 812-4444-9999', type: 'call', status: 'completed', priority: 'low', scheduledAt: '2024-01-14 16:00', completedAt: '2024-01-14 16:30', notes: 'Follow up on land inquiry in Bogor', assignedTo: 'Admin' },
  { id: 'FU-005', leadName: 'David Kim', leadEmail: 'david.kim@corp.com', leadPhone: '+62 813-7777-8888', type: 'site_visit', status: 'pending', priority: 'medium', scheduledAt: '2024-01-18 11:00', notes: 'Show commercial property in Sudirman', assignedTo: 'Admin' },
  { id: 'FU-006', leadName: 'Lisa Tan', leadEmail: 'lisa.tan@startup.io', leadPhone: '+62 811-2222-3333', type: 'call', status: 'pending', priority: 'high', scheduledAt: '2024-01-16 15:00', notes: 'Discuss condo rental in Kuningan', assignedTo: 'Admin' },
];

export default function FollowUpsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const filteredFollowUps = mockFollowUps.filter(fu => {
    const matchesSearch = fu.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fu.leadEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fu.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || fu.status === statusFilter;
    const matchesType = typeFilter === 'All' || fu.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusConfig = (status: FollowUp['status']) => {
    switch (status) {
      case 'pending': return { badge: 'badge-primary', icon: Clock, label: 'Pending' };
      case 'completed': return { badge: 'badge-success', icon: CheckCircle, label: 'Completed' };
      case 'overdue': return { badge: 'badge-danger', icon: AlertCircle, label: 'Overdue' };
      case 'cancelled': return { badge: 'badge-neutral', icon: XCircle, label: 'Cancelled' };
    }
  };

  const getTypeConfig = (type: FollowUp['type']) => {
    switch (type) {
      case 'call': return { icon: Phone, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Call' };
      case 'email': return { icon: Mail, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Email' };
      case 'meeting': return { icon: User, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Meeting' };
      case 'site_visit': return { icon: MapPin, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Site Visit' };
    }
  };

  const getPriorityConfig = (priority: FollowUp['priority']) => {
    switch (priority) {
      case 'high': return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
      case 'medium': return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
      case 'low': return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">Follow-ups</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage and track all your follow-up activities.
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: mockFollowUps.filter(f => f.status === 'pending').length, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-primary-900/30', icon: Clock },
          { label: 'Overdue', count: mockFollowUps.filter(f => f.status === 'overdue').length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: AlertCircle },
          { label: 'Completed', count: mockFollowUps.filter(f => f.status === 'completed').length, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
          { label: 'This Week', count: mockFollowUps.filter(f => f.status === 'pending' || f.status === 'overdue').length, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{stat.count}</p>
              </div>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary-dark" />
            <input
              type="search"
              placeholder="Search follow-ups by lead, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-36"
          >
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-full sm:w-36"
          >
            <option value="All">All Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="site_visit">Site Visit</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-accent dark:hover:bg-accent-dark'}`}
              title="Table view"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-accent dark:hover:bg-accent-dark'}`}
              title="Card view"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="card overflow-hidden">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border dark:border-border-dark bg-accent/50 dark:bg-accent-dark/50">
                  {['Follow-up', 'Lead', 'Type', 'Status', 'Priority', 'Scheduled', 'Assigned', 'Actions'].map((header, i) => (
                    <th key={i} className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-text-tertiary-dark uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border-dark">
                {filteredFollowUps.map((fu) => {
                  const statusConfig = getStatusConfig(fu.status);
                  const typeConfig = getTypeConfig(fu.type);
                  const priorityConfig = getPriorityConfig(fu.priority);
                  const StatusIcon = statusConfig.icon;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <tr key={fu.id} className="hover:bg-accent/50 dark:hover:bg-accent-dark/50 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-text-primary dark:text-text-primary-dark">{fu.id}</p>
                          <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark line-clamp-1">{fu.notes}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="font-medium text-text-primary dark:text-text-primary-dark">{fu.leadName}</p>
                          <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">{fu.leadEmail}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge ${statusConfig.badge} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge text-xs ${priorityConfig.bg} ${priorityConfig.color}`}>
                          {fu.priority.charAt(0).toUpperCase() + fu.priority.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {fu.scheduledAt}
                      </td>
                      <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">{fu.assignedTo}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <button className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors" title="View">
                            <Eye className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors" title="Edit">
                            <Edit className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                          </button>
                          {fu.status === 'pending' || fu.status === 'overdue' ? (
                            <button className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors" title="Mark complete">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </button>
                          ) : null}
                          <button className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFollowUps.map((fu) => {
                const statusConfig = getStatusConfig(fu.status);
                const typeConfig = getTypeConfig(fu.type);
                const priorityConfig = getPriorityConfig(fu.priority);
                const StatusIcon = statusConfig.icon;
                const TypeIcon = typeConfig.icon;

                return (
                  <div key={fu.id} className="card card-hover p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`badge ${statusConfig.badge} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                      <span className={`badge text-xs ${priorityConfig.bg} ${priorityConfig.color}`}>
                        {fu.priority.charAt(0).toUpperCase() + fu.priority.slice(1)}
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="font-medium text-text-primary dark:text-text-primary-dark">{fu.leadName}</p>
                      <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">{fu.leadEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig.label}
                      </span>
                      <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fu.scheduledAt}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-4 line-clamp-2">{fu.notes}</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-border dark:border-border-dark">
                      <button className="btn btn-ghost btn-sm flex-1"><Eye className="w-3.5 h-3.5" /> View</button>
                      <button className="btn btn-ghost btn-sm flex-1"><Edit className="w-3.5 h-3.5" /> Edit</button>
                      {(fu.status === 'pending' || fu.status === 'overdue') && (
                        <button className="btn btn-success btn-sm flex-1"><CheckCircle className="w-3.5 h-3.5" /> Complete</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
