import { Link } from 'react-router-dom';
import {
  Search, Filter, Plus, Phone, Mail,
  Tag, Clock, Eye, Edit, Trash2, ArrowUpRight
} from 'lucide-react';
import { useState } from 'react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Hot' | 'Warm' | 'Cold';
  source: string;
  lastContact: string;
  tags: string[];
}

const mockLeads: Lead[] = [
  { id: 'LD-001', name: 'John Doe', email: 'john@example.com', phone: '+62 812-3456-7890', status: 'Hot', source: 'Website', lastContact: 'Today', tags: ['Villa', 'Kemang', 'Urgent'] },
  { id: 'LD-002', name: 'Sarah Wilson', email: 'sarah@company.com', phone: '+62 813-9876-5432', status: 'Warm', source: 'Referral', lastContact: '2 days ago', tags: ['Apartment', 'SCBD'] },
  { id: 'LD-003', name: 'Michael Chen', email: 'mchen@email.com', phone: '+62 811-5555-1234', status: 'Hot', source: 'Social Media', lastContact: 'Yesterday', tags: ['House', 'Pondok Indah', 'Investment'] },
  { id: 'LD-004', name: 'Emily Park', email: 'emily.park@mail.com', phone: '+62 812-4444-9999', status: 'Cold', source: 'Website', lastContact: '1 week ago', tags: ['Land', 'Bogor'] },
  { id: 'LD-005', name: 'David Kim', email: 'david.kim@corp.com', phone: '+62 813-7777-8888', status: 'Warm', source: 'Event', lastContact: '3 days ago', tags: ['Commercial', 'Sudirman'] },
  { id: 'LD-006', name: 'Lisa Tan', email: 'lisa.tan@startup.io', phone: '+62 811-2222-3333', status: 'Hot', source: 'Referral', lastContact: 'Today', tags: ['Condo', 'Kuningan', 'Rental'] },
  { id: 'LD-007', name: 'Robert Brown', email: 'robert@brown.com', phone: '+62 812-1111-2222', status: 'Warm', source: 'Website', lastContact: '4 days ago', tags: ['Townhouse', 'Cipete'] },
  { id: 'LD-008', name: 'Jennifer Lee', email: 'jlee@mail.com', phone: '+62 813-3333-4444', status: 'Cold', source: 'Social Media', lastContact: '2 weeks ago', tags: ['Land', 'Bintaro'] },
];

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  const filteredLeads = mockLeads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'Hot': return 'badge-danger';
      case 'Warm': return 'badge-yellow';
      case 'Cold': return 'badge-neutral';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">Leads Management</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Track and manage all your property leads in one place.
          </p>
        </div>
        <Link to="/leads/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add New Lead
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary-dark" />
            <input
              type="search"
              placeholder="Search leads by name, email, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="All">All Status</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="recent">Most Recent</option>
            <option value="name">Name A-Z</option>
            <option value="status">Status</option>
          </select>
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border dark:border-border-dark bg-accent/50 dark:bg-accent-dark/50">
                {['Lead', 'Contact', 'Status', 'Source', 'Last Contact', 'Tags', 'Actions'].map((header, i) => (
                  <th key={i} className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-text-tertiary-dark uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border-dark">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-accent/50 dark:hover:bg-accent-dark/50 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-text-primary dark:text-text-primary-dark">{lead.name}</p>
                      <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">{lead.id}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {lead.email}</div>
                      <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.phone}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`badge ${getStatusBadge(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                    <Tag className="w-3.5 h-3.5 inline mr-1" />
                    {lead.source}
                  </td>
                  <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {lead.lastContact}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag, ti) => (
                        <span key={ti} className="badge badge-primary text-xs">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors" title="View details">
                        <Eye className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors" title="Edit">
                        <Edit className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors" title="Create follow-up">
                        <ArrowUpRight className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
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

        {/* Pagination */}
        <div className="p-4 border-t border-border dark:border-border-dark flex items-center justify-between">
          <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">
            Showing {filteredLeads.length} of {mockLeads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" disabled>Previous</button>
            <button className="btn btn-primary btn-sm">1</button>
            <button className="btn btn-ghost btn-sm">2</button>
            <button className="btn btn-ghost btn-sm">3</button>
            <button className="btn btn-ghost btn-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
