import { useState, useEffect } from 'react';
import {
  MessageSquare, Search, Plus, Phone,
  Clock, CheckCircle, AlertCircle, XCircle,
  Calendar, Edit, Trash2, Check, X
} from 'lucide-react';
import { followUpApi, leadApi } from '../services/api';
import type { FollowUp, Lead } from '../types';

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  
  // Form/Selected States
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [editedDraft, setEditedDraft] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [composeData, setComposeData] = useState({ leadId: '', contextMessage: '', scheduledForDays: 1 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFollowUps();
    fetchLeads();
  }, []);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const response = await followUpApi.getQueue();
      if (response.success && response.data) {
        setFollowUps(response.data);
      } else {
        setError(response.error || 'Failed to fetch follow-ups');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await leadApi.getAll();
      if (response.success && response.data) {
        setLeads(response.data);
      }
    } catch (err) {
      console.error('Failed to load leads for compose dropdown:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await followUpApi.approve(id, 'Agent');
      if (response.success && response.data) {
        setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, ...response.data } : f)));
      } else {
        alert(response.error || 'Failed to approve');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    setSubmitting(true);
    try {
      const response = await followUpApi.reject(selectedFollowUp.id, rejectionReason);
      if (response.success && response.data) {
        setFollowUps((prev) => prev.map((f) => (f.id === selectedFollowUp.id ? { ...f, ...response.data } : f)));
        setIsRejectModalOpen(false);
        setSelectedFollowUp(null);
        setRejectionReason('');
      } else {
        alert(response.error || 'Failed to reject');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    setSubmitting(true);
    try {
      const response = await followUpApi.edit(selectedFollowUp.id, editedDraft);
      if (response.success && response.data) {
        setFollowUps((prev) => prev.map((f) => (f.id === selectedFollowUp.id ? { ...f, ...response.data } : f)));
        setIsEditModalOpen(false);
        setSelectedFollowUp(null);
        setEditedDraft('');
      } else {
        alert(response.error || 'Failed to update draft');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    try {
      const response = await followUpApi.delete(id);
      if (response.success) {
        setFollowUps((prev) => prev.filter((f) => f.id !== id));
      } else {
        alert(response.error || 'Failed to delete follow-up');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    }
  };

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.leadId) return;
    setSubmitting(true);
    try {
      const response = await followUpApi.generate(composeData);
      if (response.success && response.data) {
        // Fetch queue again to get the populated lead relation correctly
        await fetchFollowUps();
        setIsComposeModalOpen(false);
        setComposeData({ leadId: '', contextMessage: '', scheduledForDays: 1 });
      } else {
        alert(response.error || 'Failed to generate follow-up');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFollowUps = followUps.filter((fu) => {
    const leadName = fu.lead?.name || 'Unknown Lead';
    const matchesSearch =
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fu.messageDraft.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || fu.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: FollowUp['status']) => {
    switch (status) {
      case 'pending': return { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Pending' };
      case 'approved': return { badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Approved' };
      case 'rejected': return { badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Rejected' };
      case 'sent': return { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle, label: 'Sent' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">Follow-ups</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage and approve AI-generated WhatsApp follow-up recommendations.
          </p>
        </div>
        <button onClick={() => setIsComposeModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: followUps.filter(f => f.status === 'pending').length, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Clock },
          { label: 'Approved', count: followUps.filter(f => f.status === 'approved').length, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
          { label: 'Rejected', count: followUps.filter(f => f.status === 'rejected').length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
          { label: 'Total Queue', count: followUps.length, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-primary-900/30', icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mt-1">{stat.count}</p>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
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
              placeholder="Search follow-ups by lead name or message..."
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
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="sent">Sent</option>
          </select>
        </div>
      </div>

      {/* Follow-ups List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={fetchFollowUps} className="btn btn-secondary mt-4">Retry</button>
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-text-primary-dark">No follow-ups scheduled</h3>
          <p className="text-text-secondary dark:text-text-secondary-dark mt-1">
            Schedule a follow-up draft for any qualified lead to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFollowUps.map((fu) => {
            const config = getStatusConfig(fu.status);
            return (
              <div key={fu.id} className="card p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 border-l-4 border-l-primary-500">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-text-primary dark:text-text-primary-dark text-lg">
                      {fu.lead?.name || 'Unknown Lead'}
                    </h3>
                    {fu.lead?.phone && (
                      <span className="text-sm text-text-tertiary dark:text-text-tertiary-dark flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {fu.lead.phone}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.badge}`}>
                      {config && <config.icon className="w-3.5 h-3.5" />}
                      {config?.label}
                    </span>
                  </div>

                  <div className="p-3 bg-accent/30 dark:bg-accent-dark/30 rounded-lg text-sm text-text-secondary border border-border dark:border-border-dark whitespace-pre-wrap font-mono">
                    {fu.messageDraft}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary dark:text-text-tertiary-dark">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Scheduled for: {new Date(fu.scheduledFor).toLocaleDateString('id-ID')}
                    </span>
                    {fu.rejectionReason && (
                      <span className="text-red-500 font-medium">
                        Reason: {fu.rejectionReason}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-stretch gap-2 pt-2 md:pt-0">
                  {fu.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(fu.id)}
                        className="btn btn-primary flex items-center justify-center gap-1 py-1.5 px-3 text-sm"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => { setSelectedFollowUp(fu); setIsRejectModalOpen(true); }}
                        className="btn btn-secondary flex items-center justify-center gap-1 py-1.5 px-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedFollowUp(fu); setEditedDraft(fu.messageDraft); setIsEditModalOpen(true); }}
                    className="btn btn-ghost flex items-center justify-center gap-1 py-1.5 px-3 text-sm text-text-secondary"
                  >
                    <Edit className="w-4 h-4" /> Edit Draft
                  </button>
                  <button
                    onClick={() => handleDelete(fu.id)}
                    className="btn btn-ghost flex items-center justify-center gap-1 py-1.5 px-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Edit Draft Modal */}
      {isEditModalOpen && selectedFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold">Edit Message Draft</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditDraft} className="p-6 space-y-4">
              <div>
                <label className="label font-semibold text-text-primary dark:text-text-primary-dark">
                  Message Draft for {selectedFollowUp.lead?.name}
                </label>
                <textarea
                  required
                  rows={8}
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  className="input font-mono text-sm leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border-dark">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reject Modal */}
      {isRejectModalOpen && selectedFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Reject Follow-up Draft</h2>
              <button onClick={() => setIsRejectModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReject} className="p-6 space-y-4">
              <div>
                <label className="label">Rejection Reason</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Price details are incorrect, need more casual tone..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border-dark">
                <button type="button" onClick={() => setIsRejectModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary bg-red-600 hover:bg-red-700 text-white border-none">
                  {submitting ? 'Rejecting...' : 'Reject Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Compose Follow-up Modal */}
      {isComposeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-xl font-bold">Schedule AI Follow-up</h2>
              <button onClick={() => setIsComposeModalOpen(false)} className="p-1 hover:bg-accent dark:hover:bg-accent-dark rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCompose} className="p-6 space-y-4">
              <div>
                <label className="label">Select Lead</label>
                <select
                  required
                  value={composeData.leadId}
                  onChange={(e) => setComposeData({ ...composeData, leadId: e.target.value })}
                  className="input"
                >
                  <option value="">-- Choose a Qualified Lead --</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} ({lead.phone}) - {lead.score}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Custom Context / Instructions (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Recommend a cozy townhouse with 3 bedrooms in Batam Residence..."
                  value={composeData.contextMessage}
                  onChange={(e) => setComposeData({ ...composeData, contextMessage: e.target.value })}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label">Schedule For (Days from now)</label>
                <select
                  value={composeData.scheduledForDays}
                  onChange={(e) => setComposeData({ ...composeData, scheduledForDays: Number(e.target.value) })}
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
                <button type="button" onClick={() => setIsComposeModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Generating...' : 'Compose & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
