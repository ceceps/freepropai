import { useEffect, useState, useCallback } from 'react';
import {
  X, MapPin, ExternalLink, Phone, User, Bed, Bath, Car, Maximize, FileText, Tag,
  Sparkles, Loader2, CheckCircle, Download, Home, AlertCircle,
} from 'lucide-react';
import { pipelineApi } from '../../services/api';
import ZoomableImage from '../common/ZoomableImage';
import PipelineListingAnalysis from './PipelineListingAnalysis';
import { formatCompactIDR, formatDateTime } from '../../utils/format';
import type { PipelineListingDetail } from '../../types';

interface ScrapedListingDetailProps {
  listingId: string;
  onClose: () => void;
  onImported?: (listingId: string) => void;
}

export default function ScrapedListingDetail({ listingId, onClose, onImported }: ScrapedListingDetailProps) {
  const [detail, setDetail] = useState<PipelineListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string; mainListingId?: string } | null>(null);

  const refreshDetail = useCallback(async () => {
    try {
      const res = await pipelineApi.getListing(listingId);
      if (res.success && res.data) setDetail(res.data);
    } catch {
      /* keep stale */
    }
  }, [listingId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    pipelineApi
      .getListing(listingId)
      .then((res) => {
        if (active && res.success && res.data) setDetail(res.data);
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.error || 'Failed to load listing');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const specs = detail
    ? [
        { icon: Bed, label: 'Bedrooms', value: detail.bedrooms },
        { icon: Bath, label: 'Bathrooms', value: detail.bathrooms },
        { icon: Car, label: 'Garage', value: detail.garage },
        { icon: Maximize, label: 'Building / Land', value: detail.lb || detail.lt ? `${detail.lb ?? '-'} / ${detail.lt ?? '-'} m²` : null },
      ].filter((s) => s.value !== null && s.value !== undefined)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl h-dvh max-h-dvh bg-surface overflow-y-auto overscroll-contain shadow-2xl animate-fade-in pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface border-b border-border">
          <h3 className="text-base font-semibold text-text-primary truncate">Scraped Listing Detail</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close detail">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-text-tertiary animate-pulse">Loading listing...</div>
        ) : error ? (
          <div className="m-5 card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4">{error}</div>
        ) : detail ? (
          <div className="p-4 sm:p-5 pb-12 space-y-6">
            {detail.featureImage && (
              <ZoomableImage
                src={detail.featureImage}
                alt={detail.title || 'Listing photo'}
                className="w-full h-64 rounded-xl"
                variant="corner"
              />
            )}

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">{detail.title || 'Untitled listing'}</h2>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{formatCompactIDR(detail.price)}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                {detail.sourceName && <span className="badge badge-info">{detail.sourceName}</span>}
                {detail.marketStatus && <span className="badge badge-secondary">{detail.marketStatus}</span>}
                {detail.propertyType && <span className="badge badge-secondary">{detail.propertyType}</span>}
                {detail.certificate && <span className="badge badge-secondary">{detail.certificate}</span>}
              </div>
            </div>

            {/* ── Import to Listings ── */}
            <div
              className={`card p-4 space-y-3 ${
                detail.imported
                  ? 'bg-gradient-to-br from-success-50 to-grey-50/40 dark:from-success-950/30 dark:to-grey-900/60 border-success-200 dark:border-success-800'
                  : 'bg-gradient-to-br from-grey-50 to-blue-50/40 dark:from-grey-900/60 dark:to-blue-950/20 border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      detail.imported
                        ? 'bg-success-100 dark:bg-success-900/40'
                        : 'bg-blue-100 dark:bg-blue-900/40'
                    }`}
                  >
                    {detail.imported ? (
                      <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
                    ) : (
                      <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {detail.imported ? 'Imported to Listings' : 'Import to Listings'}
                    </h4>
                    <p className="text-xs text-text-tertiary truncate">
                      {detail.imported
                        ? 'This property is already in your main listings database'
                        : 'Copy this property to your main listings database'}
                    </p>
                  </div>
                </div>
                {detail.imported ? (
                  <a
                    href="/listings"
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>View</span>
                  </a>
                ) : (
                  <button
                    onClick={async () => {
                      setImportLoading(true);
                      setImportMsg(null);
                      try {
                        const res = await pipelineApi.importPipelineListing(listingId);
                        if (res.success && res.data) {
                          setImportMsg({
                            type: 'success',
                            text: `"${res.data.title}" imported successfully.`,
                            mainListingId: res.data.mainListingId,
                          });
                          // Self-reload to refresh data
                          await refreshDetail();
                          onImported?.(listingId);
                        } else {
                          setImportMsg({ type: 'error', text: 'Failed to import listing.' });
                        }
                      } catch (err: any) {
                        const msg = err?.response?.data?.error || err?.message || 'Import failed';
                        setImportMsg({ type: 'error', text: msg });
                      } finally {
                        setImportLoading(false);
                      }
                    }}
                    disabled={importLoading}
                    className="btn btn-primary btn-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Import</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {importMsg && (
                <div
                  className={`text-xs p-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                    importMsg.type === 'success'
                      ? 'bg-success-50 dark:bg-success-950/30 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800'
                      : 'bg-danger-50 dark:bg-danger-950/30 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800'
                  }`}
                >
                  {importMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1">{importMsg.text}</span>
                  {importMsg.mainListingId && (
                    <a
                      href="/listings"
                      className="flex items-center gap-1 font-semibold underline whitespace-nowrap hover:opacity-80"
                    >
                      <Home className="w-3 h-3" /> View
                    </a>
                  )}
                </div>
              )}
            </div>

            {(specs.length > 0 || detail.pricePerM2) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="card p-3 text-center">
                    <spec.icon className="w-4 h-4 mx-auto text-primary-600 dark:text-primary-400 mb-1" />
                    <p className="text-sm font-semibold text-text-primary">{spec.value}</p>
                    <p className="text-xs text-text-tertiary">{spec.label}</p>
                  </div>
                ))}
                {detail.pricePerM2 && (
                  <div className="card p-3 text-center">
                    <Tag className="w-4 h-4 mx-auto text-primary-600 dark:text-primary-400 mb-1" />
                    <p className="text-sm font-semibold text-text-primary">{formatCompactIDR(detail.pricePerM2)}</p>
                    <p className="text-xs text-text-tertiary">per m²</p>
                  </div>
                )}
              </div>
            )}

            {detail.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" /> Description
                </h4>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{detail.description}</p>
              </div>
            )}

            {detail.features && detail.features.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.features.map((feature) => (
                    <span key={feature} className="badge badge-secondary">{feature}</span>
                  ))}
                </div>
              </div>
            )}

            {(detail.agentName || detail.agentPhone || detail.agency) && (
              <div className="card p-4 space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">Agent</h4>
                {detail.agentName && (
                  <p className="text-sm text-text-secondary flex items-center gap-2">
                    <User className="w-4 h-4 text-text-tertiary" /> {detail.agentName}
                  </p>
                )}
                {detail.agency && <p className="text-sm text-text-secondary">{detail.agency}</p>}
                {detail.agentPhone && (
                  <p className="text-sm text-text-secondary flex items-center gap-2">
                    <Phone className="w-4 h-4 text-text-tertiary" /> {detail.agentPhone}
                  </p>
                )}
                <a
                  href={detail.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> View source listing
                </a>
              </div>
            )}

            {detail.analysis && (
              <PipelineListingAnalysis
                analysis={{
                  ...detail.analysis,
                  listingTitle: detail.analysis.listingTitle || detail.title,
                  listingPrice: detail.analysis.listingPrice ?? detail.price,
                }}
              />
            )}

            {/* ── AI Calendar Generator ── */}
            <div className="card p-4 space-y-3 bg-gradient-to-r from-primary-50/50 to-grey-50 dark:from-primary-950/20 dark:to-grey-900/40 border-primary-100 dark:border-primary-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" /> AI Content Calendar Generator
                  </h4>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Generate 8 variated AI hooks & captions tailored to this property
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setGenerateLoading(true);
                    setGenerateMsg(null);
                    try {
                      const res = await pipelineApi.generateCalendarForListing(listingId);
                      if (res.success && res.data) {
                        setGenerateMsg({
                          type: 'success',
                          text: `Generated ${res.data.inserted} calendar items starting from ${res.data.from}!`,
                        });
                        await refreshDetail();
                      } else {
                        setGenerateMsg({ type: 'error', text: 'Failed to generate calendar content' });
                      }
                    } catch (err: any) {
                      setGenerateMsg({ type: 'error', text: err?.response?.data?.error || 'Error generating calendar content' });
                    } finally {
                      setGenerateLoading(false);
                    }
                  }}
                  disabled={generateLoading}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 whitespace-nowrap"
                >
                  {generateLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {generateLoading ? 'Generating...' : 'Generate Calendar'}
                </button>
              </div>

              {generateMsg && (
                <div
                  className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                    generateMsg.type === 'success'
                      ? 'bg-success-50 dark:bg-success-950/30 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800'
                      : 'bg-danger-50 dark:bg-danger-950/30 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800'
                  }`}
                >
                  {generateMsg.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{generateMsg.text}</span>
                </div>
              )}
            </div>

            {/* ── Pipeline Activity ── */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text-primary">Pipeline Activity</h4>
              <p className="text-xs text-text-tertiary">
                Promo items: {detail.promoContent.length} · Calendar items: {detail.calendar.length} · Scraped: {formatDateTime(detail.scrapedAt)}
              </p>
              <p className="text-xs text-text-tertiary flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Source ID: {detail.sourceId ?? '-'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
