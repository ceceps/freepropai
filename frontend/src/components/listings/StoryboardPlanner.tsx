import { useState } from 'react';
import { Sparkles, Film, Copy, Check, AlertCircle, Layers, UserCheck } from 'lucide-react';
import { listingApi } from '../../services/api';
import type { ListingWithDetails, StoryboardPlannerResult, StoryboardFormOptions } from '../../types';

interface StoryboardPlannerProps {
  listing: ListingWithDetails;
}

export default function StoryboardPlanner({ listing }: StoryboardPlannerProps) {
  const [options, setOptions] = useState<StoryboardFormOptions>({
    video_style: 'Cinematic',
    ai_video_model: 'Google Veo 3 / Omni Flash',
    aspect_ratio: '9:16',
    resolution: '1080x1920',
    voice_over: true,
    gender: 'Wanita',
    language: 'Bahasa Indonesia',
    age_range: '30-45',
    model_reference_available: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryboardPlannerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listingApi.generateStoryboard(listing.id, options);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || res.message || 'Gagal membuat Storyboard');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat membuat Storyboard');
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form Card */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Film className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-text-primary text-base">Storyboard Planner Config</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Gaya Video (Style)</label>
            <select
              value={options.video_style}
              onChange={(e) => setOptions({ ...options, video_style: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Cinematic">Cinematic</option>
              <option value="Aerial / Drone">Aerial / Drone</option>
              <option value="VO + Walkthrough">VO + Walkthrough</option>
              <option value="Modern Minimalist">Modern Minimalist</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">AI Video Model</label>
            <select
              value={options.ai_video_model}
              onChange={(e) => setOptions({ ...options, ai_video_model: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Google Veo 3 / Omni Flash">Google Veo 3 / Omni Flash</option>
              <option value="Runway (Gen-3/4)">Runway (Gen-3/4)</option>
              <option value="Pika 2.0">Pika 2.0</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Rasio (Aspect Ratio)</label>
            <select
              value={options.aspect_ratio}
              onChange={(e) => {
                const ratio = e.target.value;
                const res = ratio === '9:16' ? '1080x1920' : ratio === '16:9' ? '1920x1080' : '1080x1080';
                setOptions({ ...options, aspect_ratio: ratio, resolution: res });
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="9:16">9:16 (Portrait / Reels)</option>
              <option value="16:9">16:9 (Landscape / YouTube)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Gender Model</label>
            <select
              value={options.gender}
              onChange={(e) => setOptions({ ...options, gender: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Wanita">Wanita</option>
              <option value="Pria">Pria</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Rentang Usia Model</label>
            <select
              value={options.age_range}
              onChange={(e) => setOptions({ ...options, age_range: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="20-30">20-30 Tahun</option>
              <option value="30-45">30-45 Tahun</option>
              <option value="45+">45+ Tahun</option>
            </select>
          </div>

          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary">
              <input
                type="checkbox"
                checked={options.voice_over}
                onChange={(e) => setOptions({ ...options, voice_over: e.target.checked })}
                className="w-4 h-4 accent-primary-500 rounded"
              />
              Aktifkan Voice Over (VO)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary">
              <input
                type="checkbox"
                checked={options.model_reference_available}
                onChange={(e) => setOptions({ ...options, model_reference_available: e.target.checked })}
                className="w-4 h-4 accent-primary-500 rounded"
              />
              Foto Referensi Model Tersedia
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Merencanakan Storyboard...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Storyboard Plan
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-6">
          {/* Metadata Header Card */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="font-semibold text-text-primary text-base">{result.meta.listing_title}</h4>
                <p className="text-xs text-text-secondary">Lokasi: {result.meta.location}</p>
              </div>
              <button
                onClick={copyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-grey-100 dark:bg-grey-800 hover:bg-grey-200 text-text-primary rounded-lg text-xs font-medium transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Copy JSON'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-background p-2.5 rounded-lg border border-border">
                <span className="text-text-secondary block">Gaya / Model:</span>
                <span className="font-medium text-text-primary">{result.meta.video_style} ({result.meta.aspect_ratio})</span>
              </div>
              <div className="bg-background p-2.5 rounded-lg border border-border">
                <span className="text-text-secondary block">Total Scene & Durasi:</span>
                <span className="font-medium text-text-primary">{result.meta.total_scenes} Scene ({result.meta.total_duration_sec}s)</span>
              </div>
              <div className="bg-background p-2.5 rounded-lg border border-border">
                <span className="text-text-secondary block">Voice Over (VO):</span>
                <span className="font-medium text-text-primary">{result.meta.voice_over ? 'Aktif' : 'Non-aktif'}</span>
              </div>
              <div className="bg-background p-2.5 rounded-lg border border-border">
                <span className="text-text-secondary block">Target Model:</span>
                <span className="font-medium text-text-primary">{result.meta.gender}, {result.meta.age_range} thn</span>
              </div>
            </div>
          </div>

          {/* Render Sheets */}
          {result.sheets.map((sheet) => (
            <div key={sheet.sheet_no} className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Layers className="w-4 h-4 text-primary-500" />
                <h4 className="font-semibold text-text-primary text-sm">Sheet #{sheet.sheet_no} ({sheet.scenes.length} Scenes)</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-background border-b border-border text-text-secondary">
                      <th className="p-2.5 font-semibold w-12 text-center">No</th>
                      <th className="p-2.5 font-semibold">Frame & Visual Note</th>
                      {result.meta.voice_over && <th className="p-2.5 font-semibold">Voice Over (VO)</th>}
                      <th className="p-2.5 font-semibold">Overlay Text</th>
                      <th className="p-2.5 font-semibold">Camera Motion</th>
                      <th className="p-2.5 font-semibold text-center w-16">Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    {sheet.scenes.map((scene) => (
                      <tr key={scene.scene_no} className="hover:bg-background/50 transition-colors">
                        <td className="p-2.5 text-center font-bold text-primary-600">{scene.scene_no}</td>
                        <td className="p-2.5 space-y-1 max-w-xs">
                          <p className="font-medium">{scene.visual_note}</p>
                          <p className="text-[11px] text-text-secondary font-mono bg-background p-1.5 rounded border border-border">
                            {scene.frame_prompt}
                          </p>
                          {scene.model_present && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-medium">
                              <UserCheck className="w-3 h-3" /> Model: {scene.model_action} ({scene.model_position})
                            </span>
                          )}
                        </td>
                        {result.meta.voice_over && <td className="p-2.5 text-text-secondary max-w-xs">{scene.vo_text || '-'}</td>}
                        <td className="p-2.5 font-medium">{scene.overlay_text || '-'}</td>
                        <td className="p-2.5 text-text-secondary">{scene.camera_motion}</td>
                        <td className="p-2.5 text-center font-mono">{scene.duration_sec}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}