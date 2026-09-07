import { useState, useEffect } from 'react';
import {
  Search, Plus, Phone,
  Clock, Eye, Edit, Trash2, ArrowUpRight,
  Sparkles, AlertCircle, X
} from 'lucide-react';
import { leadApi, followUpApi } from '../services/api';
import type { Lead, CreateLeadData } from '../types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  // Selected / Form States
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addData, setAddData] = useState<CreateLeadData>({ name: '', phone: '', score: 'Warm', urgency: 'flexible' });
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [scheduleData, setScheduleData] = useState({ contextMessage: '', scheduledForDays: 1 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await leadApi.getAll();
      if (response.success && response.data) {
        setLeads(response.data);
      } else {
        setError(response.error || 'Failed to fetch leads');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addData.name || !addData.phone) return;
    setSubmitting(true);
    try {
      const response = await leadApi.create(addData);
      if (response.success && response.data) {
        setLeads((prev) => [response.data!, ...prev]);
        setIsAddModalOpen(false);
        setAddData({ name: '', phone: '', score: 'Warm', urgency: 'flexible' });
      } else {
        alert(response.error || 'Failed to add lead');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const response = await leadApi.update(selectedLead.id, editData);
      if (response.success && response.data) {
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? response.data! : l)));
        setIsEditModalOpen(false);
        setSelectedLead(null);
      } else {
        alert(response.error || 'Failed to update lead');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const response = await leadApi.delete(id);
      if (response.success) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert(response.error || 'Failed to delete lead');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const response = await followUpApi.generate({
        leadId: selectedLead.id,
        contextMessage: scheduleData.contextMessage || undefined,
        scheduledForDays: scheduleData.scheduledForDays,
      });
      if (response.success) {
        alert('Follow-up scheduled successfully!');
        setIsScheduleModalOpen(false);
        setScheduleData({ contextMessage: '', scheduledForDays: 1 });
        setSelectedLead(null);
      } else {
        alert(response.error || 'Failed to schedule follow-up');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      (lead.location && lead.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.unitType && lead.unitType.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || lead.score === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getScoreBadge = (score: Lead['score']) => {
    switch (score) {
      case 'Hot': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Warm': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Cold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400';
    }
  };

  const formatPrice = (price?: number | null) => {
    if (price === undefined || price === null) return '-';
    if (price >= 1_000_000_000) {
      return `Rp ${(price / 1_000_000_000).toFixed(1)} M`;
    }
    if (price >= 1_000_000) {
      return `Rp ${(price / 1_000_000).toFixed(0)} Jt`;
    }
    return `Rp ${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">Leads Management</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Add and manage leads with WhatsApp contact details and track follow-ups.
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Leads
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary-dark" />
            <input
              type="search"
              placeholder="Search leads by name, phone, location, property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="All">All Lead Score</option>
            <option value="Hot">Hot Leads</option>
            <option value="Warm">Warm Leads</option>
            <option value="Cold">Cold Leads</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={fetchLeads} className="btn btn-secondary mt-4">Retry</button>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-12 h-12 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-text-primary-dark">No leads found</h3>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Try adjusting your search filters or add a new lead.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border dark:border-border-dark bg-accent/50 dark:bg-accent-dark/50">
                  {['Lead', 'Score', 'Requirement', 'Budget', 'Urgency', 'Created', 'Actions'].map((header, i) => (
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
                        <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark flex items-center gap-1 mt-0.5">
                          <Phone className="w-3.5 h-3.5 inline" /> {lead.phone}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadge(lead.score)}`}>
                        {lead.score}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                      <div>
                        <p className="font-medium text-text-primary dark:text-text-primary-dark">{lead.unitType || 'Any Property'}</p>
                        <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-0.5">{lead.location || 'Any Location'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                      {lead.budgetMin || lead.budgetMax ? (
                        <span>
                          {lead.budgetMin ? formatPrice(Number(lead.budgetMin)) : 'Min'} - {lead.budgetMax ? formatPrice(Number(lead.budgetMax)) : 'Max'}
                        </span>
                      ) : (
                        <span className="text-text-tertiary dark:text-text-tertiary-dark">Flexible</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark capitalize">
                      {lead.urgency}
                    </td>
                    <td className="py-4 px-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                      {new Date(lead.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedLead(lead); setIsViewModalOpen(true); }}
                          className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                        </button>
                        <button
                          onClick={() => { setSelectedLead(lead); setEditData(lead); setIsEditModalOpen(true); }}
                          className="p-2 rounded-lg hover:bg-accent dark:hover:bg-accent-dark transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-text-tertiary dark:text-text-tertiary-dark" />
                        </button>
                        <button
                          onClick={() => { setSelectedLead(lead); setIsScheduleModalOpen(true); }}
                          className="p-2 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                          title="Schedule Follow-up"
                        >
                          <ArrowUpRight className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border dark:border-border-dark flex items-center justify-between">
            <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark">
              Showing {filteredLeads.length} of {leads.length} leads
            </p>
          </div>
        </div>
      )}

      {/* 1. Add Leads Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-500" /> Add Leads
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={addData.name}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">WhatsApp Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0812345678"
                  value={addData.phone}
                  onChange={(e) => setAddData({ ...addData, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Min Budget</label>
                  <input
                    type="number"
                    placeholder="e.g. 500000000"
                    value={addData.budgetMin ?? ''}
                    onChange={(e) => setAddData({ ...addData, budgetMin: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Max Budget</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000000"
                    value={addData.budgetMax ?? ''}
                    onChange={(e) => setAddData({ ...addData, budgetMax: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Unit Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Rumah"
                    value={addData.unitType || ''}
                    onChange={(e) => setAddData({ ...addData, unitType: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Batam Centre"
                    value={addData.location || ''}
                    onChange={(e) => setAddData({ ...addData, location: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Lead Score</label>
                  <select
                    value={addData.score || 'Warm'}
                    onChange={(e) => setAddData({ ...addData, score: e.target.value as any })}
                    className="input"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="label">Urgency</label>
                  <select
                    value={addData.urgency || 'flexible'}
                    onChange={(e) => setAddData({ ...addData, urgency: e.target.value as any })}
                    className="input"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="soon">Soon</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Requirement summary, preferences, etc."
                  value={addData.notes || ''}
                  onChange={(e) => setAddData({ ...addData, notes: e.target.value })}
                  className="input text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border-dark">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Adding...' : 'Add Leads'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View Lead Details Modal */}
      {isViewModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold">Lead Profile: {selectedLead.name}</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-tertiary uppercase">Name</p>
                  <p className="font-semibold text-text-primary dark:text-text-primary-dark">{selectedLead.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase">Phone</p>
                  <p className="font-semibold text-text-primary dark:text-text-primary-dark">{selectedLead.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase">Property Type</p>
                  <p className="font-semibold text-text-primary dark:text-text-primary-dark">{selectedLead.unitType || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase">Preferred Location</p>
                  <p className="font-semibold text-text-primary dark:text-text-primary-dark">{selectedLead.location || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase">Budget Range</p>
                  <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                    {selectedLead.budgetMin || selectedLead.budgetMax ? (
                      <span>
                        {selectedLead.budgetMin ? formatPrice(Number(selectedLead.budgetMin)) : 'Min'} - {selectedLead.budgetMax ? formatPrice(Number(selectedLead.budgetMax)) : 'Max'}
                      </span>
                    ) : 'Flexible'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase">Lead Score & Urgency</p>
                  <p className="font-semibold flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${getScoreBadge(selectedLead.score)}`}>{selectedLead.score}</span>
                    <span className="capitalize text-sm text-text-secondary">({selectedLead.urgency})</span>
                  </p>
                </div>
              </div>

              {selectedLead.notes && (
                <div>
                  <p className="text-xs text-text-tertiary uppercase mb-1">AI Reasoning & Notes</p>
                  <div className="p-3 bg-accent/30 dark:bg-accent-dark/30 rounded-lg text-sm text-text-secondary border border-border dark:border-border-dark whitespace-pre-wrap">
                    {selectedLead.notes}
                  </div>
                </div>
              )}

              {selectedLead.rawChatText && (
                <div>
                  <p className="text-xs text-text-tertiary uppercase mb-1">Raw Chat Message</p>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-xs font-mono text-text-tertiary border border-border dark:border-border-dark max-h-40 overflow-y-auto">
                    {selectedLead.rawChatText}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border dark:border-border-dark flex justify-end gap-3">
              <button onClick={() => { setIsViewModalOpen(false); setEditData(selectedLead); setIsEditModalOpen(true); }} className="btn btn-secondary">
                Edit Lead
              </button>
              <button onClick={() => setIsViewModalOpen(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Lead Modal */}
      {isEditModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold">Edit Lead Info</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLead} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  required
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="text"
                  required
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Min Budget</label>
                  <input
                    type="number"
                    value={editData.budgetMin || ''}
                    onChange={(e) => setEditData({ ...editData, budgetMin: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Max Budget</label>
                  <input
                    type="number"
                    value={editData.budgetMax || ''}
                    onChange={(e) => setEditData({ ...editData, budgetMax: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Unit Type</label>
                  <input
                    type="text"
                    value={editData.unitType || ''}
                    onChange={(e) => setEditData({ ...editData, unitType: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Lead Score</label>
                  <select
                    value={editData.score || 'Warm'}
                    onChange={(e) => setEditData({ ...editData, score: e.target.value as any })}
                    className="input"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="label">Urgency</label>
                  <select
                    value={editData.urgency || 'flexible'}
                    onChange={(e) => setEditData({ ...editData, urgency: e.target.value as any })}
                    className="input"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="soon">Soon</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes / Requirements Summary</label>
                <textarea
                  rows={3}
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  className="input text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border-dark">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Schedule Follow-up Modal */}
      {isScheduleModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" /> Schedule AI Follow-up
              </h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="p-6 space-y-4">
              <div className="p-3 bg-accent/30 dark:bg-accent-dark/30 rounded-lg text-sm border border-border dark:border-border-dark">
                <p className="font-semibold text-text-primary dark:text-text-primary-dark">Scheduling for: {selectedLead.name}</p>
                <p className="text-xs text-text-secondary mt-1">AI will compose a context-aware property recommendation message based on the lead profile.</p>
              </div>
              <div>
                <label className="label">Custom Context (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Recommend the new Batam Residence Villa that fits their budget..."
                  value={scheduleData.contextMessage}
                  onChange={(e) => setScheduleData({ ...scheduleData, contextMessage: e.target.value })}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label">Schedule For (Days from now)</label>
                <select
                  value={scheduleData.scheduledForDays}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledForDays: Number(e.target.value) })}
                  className="input"
                >
                  <option value={1}>Tomorrow (1 Day)</option>
                  <option value={2}>In 2 Days</option>
                  <option value={3}>In 3 Days</option>
                  <option value={5}>In 5 Days</option>
                  <option value={7}>In 1 Week (7 Days)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border-dark">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Composing...' : 'Schedule AI Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
