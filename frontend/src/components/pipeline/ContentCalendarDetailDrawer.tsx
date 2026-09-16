import { useEffect, useState } from 'react';
import { X, Copy, Check, Video, Image as ImageIcon, CalendarDays, Layers, User, ExternalLink } from 'lucide-react';
import { pipelineApi } from '../../services/api';
import ZoomableImage from '../common/ZoomableImage';
import { formatDate } from '../../utils/format';
import type { PipelineCalendarDetail, PipelinePosterSpec, PipelineVideoMeta } from '../../types';

const VIDEO_PLATFORMS = new Set(['tiktok', 'youtube_shorts', 'instagram_story']);

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  posted: 'badge-info',
};

export const isVideoPlatform = (platform?: string | null): boolean =>
  Boolean(platform && VIDEO_PLATFORMS.has(platform));

function renderScalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable in this context */
    }
  };

  return (
    <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function ImagePromptSection({ spec }: { spec: PipelinePosterSpec | null }) {
  if (!spec || Object.keys(spec).length === 0) {
    return <p className="text-sm text-text-tertiary">No image generator spec available for this item.</p>;
  }

  const elements = Array.isArray(spec.elements) ? spec.elements : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {spec.ratio && <span className="badge badge-secondary">{spec.ratio}</span>}
        {spec.width && spec.height && (
          <span className="badge badge-secondary">{spec.width} x {spec.height}px</span>
        )}
        <CopyButton value={JSON.stringify(spec, null, 2)} label="Copy JSON" />
      </div>

      {spec.public_url && (
        <ZoomableImage
          src={spec.public_url}
          alt="Generated poster"
          className="w-full h-56 rounded-xl"
          variant="corner"
        />
      )}

      {elements.length > 0 && (
        <div className="space-y-2">
          {elements.map((element, index) => (
            <div key={index} className="card p-3 space-y-1">
              <p className="text-xs font-semibold uppercase text-text-tertiary">
                {renderScalar((element as Record<string, unknown>).type)}
              </p>
              {Object.entries(element)
                .filter(([key]) => key !== 'type')
                .map(([key, value]) => (
                  <p key={key} className="text-sm text-text-secondary break-words">
                    <span className="text-text-tertiary">{key.replace(/_/g, ' ')}: </span>
                    {renderScalar(value)}
                  </p>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoScriptSection({ script, meta }: { script: string | null; meta: PipelineVideoMeta | null }) {
  const storyboard = Array.isArray(meta?.storyboard) ? meta!.storyboard! : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {meta?.ratio && <span className="badge badge-secondary">{meta.ratio}</span>}
        {meta?.duration_s && <span className="badge badge-secondary">{meta.duration_s}s</span>}
        {meta?.vo_profile && <span className="badge badge-secondary">{meta.vo_profile}</span>}
        {script && <CopyButton value={script} label="Copy script" />}
      </div>

      {script ? (
        <pre className="bg-grey-50 dark:bg-grey-900/40 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-text-secondary max-h-72 overflow-y-auto">
          {script}
        </pre>
      ) : (
        <p className="text-sm text-text-tertiary">No video script stored for this item.</p>
      )}

      {storyboard.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grey-50 dark:bg-grey-900/40 text-text-tertiary">
                <tr>
                  <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Time</th>
                  <th className="text-left font-medium px-3 py-2">Visual</th>
                  <th className="text-left font-medium px-3 py-2">Voice over</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {storyboard.map((shot, index) => (
                  <tr key={index} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-text-secondary">{shot.time || shot.shot || '-'}</td>
                    <td className="px-3 py-2 text-text-secondary">{shot.visual || '-'}</td>
                    <td className="px-3 py-2 text-text-secondary">{shot.vo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface ContentCalendarDetailDrawerProps {
  calendarId: string;
  onClose: () => void;
}

export default function ContentCalendarDetailDrawer({ calendarId, onClose }: ContentCalendarDetailDrawerProps) {
  const [detail, setDetail] = useState<PipelineCalendarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    pipelineApi
      .getContentCalendarItem(calendarId)
      .then((res) => {
        if (active && res.success && res.data) setDetail(res.data);
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.error || 'Failed to load content item');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [calendarId]);

  const caption = detail?.promo?.captionHpsc || detail?.captionDraft || '';
  const isVideo = isVideoPlatform(detail?.platform);
  const assetFiles = detail?.assetFiles?.filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-surface overflow-y-auto shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">Content Plan</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close content detail">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-text-tertiary animate-pulse">Loading content plan...</div>
        ) : error ? (
          <div className="m-5 card border-danger-200 bg-danger-50 dark:bg-danger-950/20 text-danger-700 p-4">{error}</div>
        ) : detail ? (
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-primary capitalize">{detail.platform}</span>
              <span className="badge badge-secondary capitalize">{detail.contentType?.replace(/_/g, ' ')}</span>
              <span className={`badge ${STATUS_BADGE[detail.approvalStatus || 'pending'] || 'badge-secondary'}`}>
                {detail.approvalStatus || 'pending'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                <CalendarDays className="w-3.5 h-3.5" /> {formatDate(detail.date)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {detail.listingFeatureImage ? (
                <img src={detail.listingFeatureImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-grey-100 dark:bg-grey-800 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-5 h-5 text-text-tertiary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{detail.listingTitle || 'Untitled listing'}</p>
                {detail.approvedByName && (
                  <p className="text-xs text-text-tertiary inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {detail.approvedByName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-text-primary">Hook</h2>
                {detail.hook && <CopyButton value={detail.hook} />}
              </div>
              <p className="text-base text-text-primary">{detail.hook || '-'}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-text-primary">Caption</h4>
                {caption && <CopyButton value={caption} />}
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{caption || 'No caption available.'}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
                {isVideo ? <Video className="w-4 h-4 text-primary-600 dark:text-primary-400" /> : <ImageIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                {isVideo ? 'Video Script' : 'Image Generator Prompt'}
              </h4>
              {isVideo ? (
                <VideoScriptSection script={detail.promo?.videoScript ?? null} meta={detail.promo?.videoMeta ?? null} />
              ) : (
                <ImagePromptSection spec={detail.promo?.posterSpec ?? null} />
              )}
            </div>

            {detail.disclosureTags && detail.disclosureTags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">Disclosure tags</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.disclosureTags.map((tag) => (
                    <span key={tag} className="badge badge-secondary">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {assetFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">Assets</h4>
                <div className="space-y-1">
                  {assetFiles.map((file) => (
                    <a
                      key={file}
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> {file.split('/').pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
