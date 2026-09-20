import { useState, useEffect, useMemo } from 'react';
import { Video, Mic, Sparkles, Copy, Check, Info, Braces, Save, Trash2, Edit3, Bookmark, Eye, RefreshCw, Film, AlertCircle, Layers, UserCheck } from 'lucide-react';
import { listingApi } from '../../services/api';
import type {
  ListingWithDetails,
  VideoScriptOptions,
  VideoScriptResult,
  VideoScriptRecord,
  VideoStyle,
  VideoModel,
  AspectRatio,
  VOGender,
  VOLanguage,
  VOAgeRange,
  VoiceOverConfig,
  StoryboardPlannerResult,
  StoryboardSheetOutput,
  StoryboardSceneOutput,
} from '../../types';

interface VideoScriptGeneratorProps {
  listing: ListingWithDetails;
}

const STYLE_OPTIONS: { value: VideoStyle; label: string; hint: string }[] = [
  { value: 'cinematic', label: 'Cinematic', hint: 'Film-like, golden-hour, high-end feel' },
  { value: 'aerial', label: 'Aerial / Drone', hint: 'Sweeping drone establishing shots' },
  { value: 'lifestyle', label: 'Lifestyle', hint: 'Warm, natural, family moments' },
  { value: 'walkthrough', label: 'Walkthrough', hint: 'Smooth room-by-room gimbal tour' },
];

const MODEL_OPTIONS: { value: VideoModel; label: string }[] = [
  { value: 'runway', label: 'Runway (Gen-3/4)' },
  { value: 'pika', label: 'Pika 2.0' },
  { value: 'veo', label: 'Google Veo 3 / Omni Flash' },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '16:9', label: '16:9 Landscape', icon: '📺' },
  { value: '9:16', label: '9:16 Vertical (Reels/TikTok)', icon: '📱' },
  { value: '4:5', label: '4:5 Portrait Feed', icon: '🖼️' },
];

const VO_OPTIONS: { value: VOOption; label: string }[] = [
  { value: 'tanpa', label: 'Tanpa Voice Over (Visual & Music saja)' },
  { value: 'custom', label: 'Voice Over Terpisah (Generate Script VO)' },
];

const GENDER_OPTIONS: { value: VOGender; label: string }[] = [
  { value: 'wanita', label: 'Wanita' },
  { value: 'pria', label: 'Pria' },
];

const LANGUAGE_OPTIONS: { value: VOLanguage; label: string }[] = [
  { value: 'indonesia', label: 'Bahasa Indonesia' },
  { value: 'inggris', label: 'English' },
];

const AGE_RANGE_OPTIONS: { value: VOAgeRange; label: string }[] = [
  { value: 'dewasa_muda', label: 'Muda (20 - 30 thn)' },
  { value: 'dewasa', label: 'Dewasa (30 - 45 thn)' },
  { value: 'senior', label: 'Senior (> 50 thn)' },
];

type VOOption = 'tanpa' | 'custom';

type OutputFormat = 'prompt' | 'json' | 'storyboard';

export default function VideoScriptGenerator({ listing }: VideoScriptGeneratorProps) {
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [model, setModel] = useState<VideoModel>('runway');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [voPreset, setVoPreset] = useState<VOOption>('tanpa');
  const [voGender, setVoGender] = useState<VOGender>('wanita');
  const [voLanguage, setVoLanguage] = useState<VOLanguage>('indonesia');
  const [voAgeRange, setVoAgeRange] = useState<VOAgeRange>('dewasa');
  const [customInstructions, setCustomInstructions] = useState('');
  const [modelRefAvailable, setModelRefAvailable] = useState(false);
  
  const [result, setResult] = useState<VideoScriptResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'prompt' | 'voiceover' | 'json' | 'storyboard' | null>(null);
  const [format, setFormat] = useState<OutputFormat>('prompt');

  // Storyboard state
  const [storyboardResult, setStoryboardResult] = useState<StoryboardPlannerResult | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);

  // Saved scripts state
  const [savedScripts, setSavedScripts] = useState<VideoScriptRecord[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savingName, setSavingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editingScriptText, setEditingScriptText] = useState('');
  const [editingVoText, setEditingVoText] = useState('');
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [activeSavedScript, setActiveSavedScript] = useState<VideoScriptRecord | null>(null);

  const includeVoiceOver = voPreset === 'custom';
  const isVeo = model === 'veo';
  const promptLanguageLabel = isVeo
    ? includeVoiceOver && voLanguage === 'inggris'
      ? 'English'
      : 'Bahasa Indonesia'
    : 'English';

  const jsonText = useMemo(
    () => (result?.scriptJson ? JSON.stringify(result.scriptJson, null, 2) : ''),
    [result]
  );

  const storyboardJsonText = useMemo(
    () => (storyboardResult ? JSON.stringify(storyboardResult, null, 2) : ''),
    [storyboardResult]
  );

  // Load saved scripts for this listing
  const fetchSavedScripts = async () => {
    try {
      setIsLoadingSaved(true);
      const res = await listingApi.getVideoScripts(listing.id);
      if (res.success && res.data) {
        setSavedScripts(res.data);
      }
    } catch (err) {
      console.error('Failed to load saved scripts:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedScripts();
  }, [listing.id]);

  const handleGenerateStoryboard = async (scriptJsonOverride?: any) => {
    try {
      setIsGeneratingStoryboard(true);
      setStoryboardError(null);
      const jsonToUse = scriptJsonOverride || result?.scriptJson;

      const styleMap: Record<string, string> = {
        aerial: 'Aerial / Drone',
        cinematic: 'Cinematic',
        walkthrough: 'VO + Walkthrough',
        lifestyle: 'Lifestyle',
      };

      const response = await listingApi.generateStoryboard(listing.id, {
        video_style: styleMap[style] || style,
        ai_video_model: model === 'veo' ? 'Google Veo 3 / Omni Flash' : model === 'pika' ? 'Pika 2.0' : 'Runway Gen-3/4',
        aspect_ratio: aspectRatio,
        resolution: aspectRatio === '9:16' ? '1080x1920' : aspectRatio === '4:5' ? '1080x1350' : '1920x1080',
        voice_over: includeVoiceOver,
        gender: voGender === 'wanita' ? 'Wanita' : 'Pria',
        language: voLanguage === 'indonesia' ? 'Bahasa Indonesia' : 'English',
        age_range: voAgeRange === 'dewasa_muda' ? '20-30' : voAgeRange === 'dewasa' ? '30-45' : '45+',
        model_reference_available: modelRefAvailable,
        video_json: jsonToUse,
      });

      if (response.success && response.data) {
        setStoryboardResult(response.data);
      } else if (response.error) {
        setStoryboardError(response.error);
      }
    } catch (err: any) {
      console.error('Failed to generate storyboard:', err);
      setStoryboardError(err.response?.data?.error || 'Gagal merencanakan storyboard');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setActiveSavedScript(null);
      setStoryboardResult(null);

      const voiceOver: VoiceOverConfig = includeVoiceOver
        ? { enabled: true, gender: voGender, language: voLanguage, ageRange: voAgeRange }
        : { enabled: false };

      const options: VideoScriptOptions = {
        style,
        model,
        aspectRatio,
        voiceOver,
        customInstructions: customInstructions.trim() || undefined,
      };

      const response = await listingApi.generateVideoScript(listing.id, options);
      if (response.success && response.data) {
        setResult(response.data);
        if (format === 'storyboard') {
          await handleGenerateStoryboard(response.data.scriptJson);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate video prompt:', err);
      setError(err.response?.data?.error || 'Failed to generate video prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result || !savingName.trim()) return;
    try {
      setIsSaving(true);
      const voiceOver = includeVoiceOver
        ? { enabled: true, gender: voGender, language: voLanguage, ageRange: voAgeRange }
        : { enabled: false };

      const response = await listingApi.saveVideoScript(listing.id, {
        name: savingName.trim(),
        style,
        model,
        aspectRatio,
        voiceOver,
        customInstructions: customInstructions.trim() || undefined,
        script: result.script,
        voiceOverScript: result.voiceOverScript,
        scriptJson: result.scriptJson,
      });

      if (response.success && response.data) {
        setSavedScripts([response.data, ...savedScripts]);
        setActiveSavedScript(response.data);
        setShowSaveModal(false);
        setSavingName('');
      }
    } catch (err) {
      console.error('Failed to save script version:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSaved = (saved: VideoScriptRecord) => {
    setStyle(saved.style as VideoStyle);
    setModel(saved.model as VideoModel);
    setAspectRatio(saved.aspect_ratio as AspectRatio);
    if (saved.include_voice_over) {
      setVoPreset('custom');
      setVoGender((saved.voice_gender as VOGender) || 'wanita');
      setVoLanguage((saved.voice_language as VOLanguage) || 'indonesia');
      setVoAgeRange((saved.voice_age as VOAgeRange) || 'dewasa');
    } else {
      setVoPreset('tanpa');
    }
    setCustomInstructions(saved.custom_instructions || '');

    setResult({
      listingId: listing.id,
      style: saved.style as VideoStyle,
      model: saved.model as VideoModel,
      aspectRatio: saved.aspect_ratio as AspectRatio,
      script: saved.script,
      voiceOverScript: saved.voice_over_script,
      scriptJson: saved.script_json,
    });
    setActiveSavedScript(saved);
  };

  const handleDeleteSaved = async (id: string) => {
    if (!confirm('Hapus versi skrip video ini?')) return;
    try {
      await listingApi.deleteVideoScript(id);
      setSavedScripts(savedScripts.filter((s) => s.id !== id));
      if (activeSavedScript?.id === id) {
        setActiveSavedScript(null);
      }
    } catch (err) {
      console.error('Failed to delete script:', err);
    }
  };

  const handleStartEditing = (saved: VideoScriptRecord) => {
    setEditingScriptId(saved.id);
    setEditingScriptText(saved.script);
    setEditingVoText(saved.voice_over_script || '');
  };

  const handleSaveEditedScript = async (id: string) => {
    try {
      setIsUpdatingScript(true);
      const res = await listingApi.updateVideoScript(id, {
        script: editingScriptText,
        voiceOverScript: editingVoText || undefined,
      });

      if (res.success && res.data) {
        setSavedScripts(savedScripts.map((s) => (s.id === id ? res.data! : s)));
        if (activeSavedScript?.id === id) {
          setActiveSavedScript(res.data);
          setResult((prev) => (prev ? { ...prev, script: editingScriptText, voiceOverScript: editingVoText } : null));
        }
        setEditingScriptId(null);
      }
    } catch (err) {
      console.error('Failed to update script:', err);
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const handleCopy = (text: string, target: 'prompt' | 'voiceover' | 'json' | 'storyboard') => {
    navigator.clipboard.writeText(text);
    setCopied(target);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClear = () => {
    setResult(null);
    setActiveSavedScript(null);
    setStoryboardResult(null);
  };

  const hasResult = Boolean(result);

  return (
    <div className="space-y-6">
      {/* Configuration Form Card */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h4 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              AI Video Marketing Generator & Storyboard
            </h4>
            <p className="text-xs text-text-tertiary mt-0.5">
              Hasilkan skrip video promo & rencana tabel storyboard terstruktur untuk TikTok, Instagram Reels, dan YouTube Shorts.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md hover:shadow-lg transition-all"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            {isGenerating ? 'Generating...' : 'Generate Video Script & Storyboard'}
          </button>
        </div>

        {/* Video Style Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">Gaya Video (Video Style)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStyle(opt.value)}
                disabled={isGenerating}
                className={`p-3 rounded-xl border text-left transition-all ${
                  style === opt.value
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'border-border bg-grey-50/50 dark:bg-grey-900/20 text-text-secondary hover:border-grey-300'
                }`}
              >
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className="text-xs text-text-tertiary mt-1">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Model AI & Aspect Ratio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model Generator */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Model AI Generator</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as VideoModel)}
              disabled={isGenerating}
              className="w-full"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Rasio Layar (Aspect Ratio)</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAspectRatio(opt.value)}
                  disabled={isGenerating}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    aspectRatio === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'border-border bg-grey-50 dark:bg-grey-900/20 text-text-secondary hover:border-grey-300'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Voice Over Options */}
        <div className="space-y-3 pt-2 border-t border-border">
          <label className="block text-sm font-medium text-text-secondary">Pengaturan Voice Over (VO)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVoPreset(opt.value)}
                disabled={isGenerating}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                  voPreset === opt.value
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300 font-semibold'
                    : 'border-border bg-grey-50/50 dark:bg-grey-900/20 text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed VO Config when active */}
        {includeVoiceOver && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-grey-50 dark:bg-grey-900/30 rounded-xl border border-border">
            <div>
              <label htmlFor="vo-gender" className="block text-xs font-medium text-text-secondary mb-1">
                Gender Model
              </label>
              <select
                id="vo-gender"
                value={voGender}
                onChange={(e) => setVoGender(e.target.value as VOGender)}
                disabled={isGenerating}
                className="w-full text-xs"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vo-lang" className="block text-xs font-medium text-text-secondary mb-1">
                Bahasa Narasi
              </label>
              <select
                id="vo-lang"
                value={voLanguage}
                onChange={(e) => setVoLanguage(e.target.value as VOLanguage)}
                disabled={isGenerating}
                className="w-full text-xs"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vo-age" className="block text-xs font-medium text-text-secondary mb-1">
                Usia Model Narator
              </label>
              <select
                id="vo-age"
                value={voAgeRange}
                onChange={(e) => setVoAgeRange(e.target.value as VOAgeRange)}
                disabled={isGenerating}
                className="w-full text-xs"
              >
                {AGE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Custom Instructions */}
        <div className="space-y-2">
          <label htmlFor="video-custom-instructions" className="block text-sm font-medium text-text-secondary">
            Instruksi Khusus / Tambahan (Opsional)
          </label>
          <textarea
            id="video-custom-instructions"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            disabled={isGenerating}
            placeholder="Contoh: Fokus ke area rooftop dan taman belakang, gaya bahasa santai anak muda..."
            rows={2}
            className="w-full text-xs"
          />
        </div>

        {/* Model Reference Availability Checkbox */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <input
            type="checkbox"
            id="modelRefAvailable"
            checked={modelRefAvailable}
            onChange={(e) => setModelRefAvailable(e.target.checked)}
            disabled={isGenerating}
            className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="modelRefAvailable" className="text-xs text-text-secondary cursor-pointer flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary-600" />
            <span>Foto Referensi Model Tersedia (Tampilkan agen/host pada scene darat di Storyboard Planner)</span>
          </label>
        </div>

        {/* Error display */}
        {error && (
          <div className="card border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 text-xs">
            {error}
          </div>
        )}

        {/* Generating State */}
        {isGenerating ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-xl animate-pulse">
            <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-3 animate-spin" />
            <p className="text-text-secondary font-medium text-sm">
              Memproses skrip video promo{includeVoiceOver ? ' & narasi voice-over' : ''}...
            </p>
            <p className="text-xs text-text-tertiary mt-1">Harap tunggu beberapa detik.</p>
          </div>
        ) : hasResult && result ? (
          <div className="space-y-4">
            {/* Active Banner if loaded from saved */}
            {activeSavedScript && (
              <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300 flex items-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  Melihat versi tersimpan: <strong className="font-semibold">{activeSavedScript.name}</strong>
                </span>
                <button
                  onClick={() => handleStartEditing(activeSavedScript)}
                  className="btn btn-ghost btn-sm flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Skrip Ini
                </button>
              </div>
            )}

            {/* Action Header & Output Format Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div
                role="tablist"
                aria-label="Output format"
                className="inline-flex rounded-lg border border-border bg-grey-100 dark:bg-grey-900 p-1"
              >
                {(['prompt', 'json', 'storyboard'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    role="tab"
                    aria-selected={format === fmt}
                    onClick={() => {
                      setFormat(fmt);
                      if (fmt === 'storyboard' && !storyboardResult && !isGeneratingStoryboard) {
                        handleGenerateStoryboard();
                      }
                    }}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      format === fmt
                        ? 'bg-white dark:bg-grey-800 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    {fmt === 'prompt' && <Video className="w-3.5 h-3.5" />}
                    {fmt === 'json' && <Braces className="w-3.5 h-3.5" />}
                    {fmt === 'storyboard' && <Film className="w-3.5 h-3.5 text-primary-500" />}
                    <span>{fmt === 'prompt' ? 'Prompt' : fmt === 'json' ? 'JSON' : 'Generate Storyboard'}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSavingName(`${STYLE_OPTIONS.find(s => s.value === style)?.label || 'Cinematic'} - ${aspectRatio}`);
                    setShowSaveModal(true);
                  }}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Versi
                </button>

                <button onClick={handleClear} className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs">
                  Clear
                </button>
              </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
              <div className="p-4 border border-border bg-white dark:bg-grey-900 rounded-xl shadow-lg space-y-3 text-text-secondary">
                <h5 className="font-semibold text-xs text-text-primary">Simpan Versi Skrip Video</h5>
                <p className="text-xs text-text-tertiary">
                  Beri nama versi ini untuk mempermudah pencarian di daftar versi tersimpan.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    placeholder="Nama versi skrip..."
                    className="flex-1 text-xs"
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !savingName.trim()}
                    className="btn btn-primary btn-sm text-xs"
                  >
                    {isSaving ? 'Simpan...' : 'Simpan'}
                  </button>
                  <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary btn-sm text-xs">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* SUB TAB: JSON VIEW */}
            {format === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                    <Braces className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    Multi-Scene JSON <span className="text-text-tertiary font-normal">(structured)</span>
                  </h5>
                  <button
                    onClick={() => handleCopy(jsonText, 'json')}
                    className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 transition-colors"
                    title="Copy JSON"
                  >
                    {copied === 'json' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <pre className="bg-grey-50 dark:bg-grey-900/40 border border-border p-4 rounded-xl font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
                  {jsonText}
                </pre>
              </div>
            )}

            {/* SUB TAB: PROMPT VIEW */}
            {format === 'prompt' && (
              <>
                {isVeo && (
                  <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 p-3 rounded-lg flex items-start gap-2 text-xs">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Format Veo/Omni: Setiap scene memasangkan blok <code>[Visual: ...]</code> dengan baris <code>VO: ...</code>
                      {includeVoiceOver ? ' untuk generate audio bawaan model AI.' : ' (hanya visual).'}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                      <Video className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Video Prompt <span className="text-text-tertiary font-normal">({promptLanguageLabel})</span>
                    </h5>
                    <button
                      onClick={() => handleCopy(result.script, 'prompt')}
                      className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 transition-colors"
                      title="Copy prompt"
                    >
                      {copied === 'prompt' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative bg-grey-50 dark:bg-grey-900/40 border border-border p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {result.script}
                  </div>
                </div>

                {includeVoiceOver && result.voiceOverScript && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                        <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        Voice Over Script{' '}
                        <span className="text-text-tertiary font-normal">
                          ({voLanguage === 'indonesia' ? 'Bahasa Indonesia' : 'English'} - {voGender === 'pria' ? 'Pria' : 'Wanita'})
                        </span>
                      </h5>
                      <button
                        onClick={() => handleCopy(result.voiceOverScript!, 'voiceover')}
                        className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 transition-colors"
                        title="Copy VO script"
                      >
                        {copied === 'voiceover' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative bg-grey-50 dark:bg-grey-900/40 border border-border p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {result.voiceOverScript}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* SUB TAB: STORYBOARD PLANNER VIEW */}
            {format === 'storyboard' && (
              <div className="space-y-4 pt-2">
                {isGeneratingStoryboard ? (
                  <div className="p-10 text-center border border-dashed border-border rounded-xl animate-pulse">
                    <Film className="w-8 h-8 text-primary-500 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs font-medium text-text-secondary">Merencanakan Storyboard Terstruktur...</p>
                    <p className="text-[11px] text-text-tertiary mt-1">Memetakan foto listing ke setiap scene & shot motion.</p>
                  </div>
                ) : storyboardError ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>{storyboardError}</span>
                    </div>
                    <button
                      onClick={() => handleGenerateStoryboard()}
                      className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Coba Lagi
                    </button>
                  </div>
                ) : storyboardResult ? (
                  <div className="space-y-6">
                    {/* Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-xl">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                            {storyboardResult.meta.listing_title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                            {storyboardResult.meta.video_style}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-tertiary flex items-center gap-3">
                          <span>📍 {storyboardResult.meta.location}</span>
                          <span>📐 {storyboardResult.meta.aspect_ratio} ({storyboardResult.meta.resolution})</span>
                          <span>⏱️ Total {storyboardResult.meta.total_duration_sec} dtk ({storyboardResult.meta.total_scenes} scene)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(storyboardJsonText, 'storyboard')}
                          className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                        >
                          {copied === 'storyboard' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy Storyboard JSON</span>
                        </button>
                        <button
                          onClick={() => handleGenerateStoryboard()}
                          className="btn btn-ghost btn-sm text-xs flex items-center gap-1 text-primary-600"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                        </button>
                      </div>
                    </div>

                    {/* Storyboard Sheets */}
                    {storyboardResult.sheets.map((sheet: StoryboardSheetOutput) => (
                      <div key={sheet.sheet_no} className="border border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-grey-900">
                        <div className="bg-grey-100 dark:bg-grey-800/80 px-4 py-2.5 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-primary-600" />
                            Sheet #{sheet.sheet_no} ({sheet.scenes.length} Scene)
                          </span>
                          <span className="text-[10px] text-text-tertiary">Maksimal 6 Scene / Tabel Render</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-grey-50 dark:bg-grey-800/40 border-b border-border text-text-tertiary uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 px-3 w-12 text-center">#</th>
                                <th className="py-2.5 px-3 w-40">Foto Reference</th>
                                <th className="py-2.5 px-3">Visual Note & Camera</th>
                                <th className="py-2.5 px-3 w-36">Model Action</th>
                                <th className="py-2.5 px-3 w-48">Voice Over / Overlay</th>
                                <th className="py-2.5 px-3 w-16 text-center">Durasi</th>
                                <th className="py-2.5 px-3 w-48">AI Frame Prompt</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {sheet.scenes.map((sc: StoryboardSceneOutput) => (
                                <tr key={sc.scene_no} className="hover:bg-grey-50/50 dark:hover:bg-grey-800/20">
                                  <td className="py-3 px-3 font-bold text-center text-primary-600">
                                    {sc.scene_no}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="space-y-1">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-grey-100 dark:bg-grey-800 text-text-secondary block w-max">
                                        📷 {sc.photo_id || 'no_photo'}
                                      </span>
                                      {sc.crop_hint && (
                                        <span className="text-[10px] text-text-tertiary block">
                                          Crop: <strong className="font-semibold">{sc.crop_hint}</strong>
                                        </span>
                                      )}
                                      {sc.needs_aerial_simulation && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 block w-max font-medium">
                                          Simulasi Aerial
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <p className="font-medium text-text-primary text-xs leading-snug">{sc.visual_note}</p>
                                    <span className="text-[10px] text-primary-600 dark:text-primary-400 block mt-1">
                                      🎥 Motion: {sc.camera_motion}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-text-secondary">
                                    {sc.model_present ? (
                                      <div className="space-y-0.5 text-[11px]">
                                        <div className="font-semibold text-green-700 dark:text-green-400">✓ Present</div>
                                        <div>{sc.model_action}</div>
                                        <div className="text-[10px] text-text-tertiary">Posisi: {sc.model_position}</div>
                                      </div>
                                    ) : (
                                      <span className="text-text-tertiary text-[11px] font-normal">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 space-y-1">
                                    {sc.vo_text && (
                                      <div className="text-[11px] text-text-secondary">
                                        <strong className="text-primary-600">VO:</strong> "{sc.vo_text}"
                                      </div>
                                    )}
                                    {sc.overlay_text && (
                                      <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/30 w-max">
                                        Text: {sc.overlay_text}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center font-semibold text-text-secondary">
                                    {sc.duration_sec}s
                                  </td>
                                  <td className="py-3 px-3">
                                    <p className="text-[10px] font-mono text-text-tertiary leading-tight bg-grey-50 dark:bg-grey-800/40 p-1.5 rounded border border-border">
                                      {sc.frame_prompt}
                                    </p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl space-y-3">
                    <Film className="w-8 h-8 text-text-tertiary mx-auto" />
                    <p className="text-xs text-text-secondary">
                      Klik tombol di bawah untuk menyusun tabel storyboard berdasarkan skrip video di atas.
                    </p>
                    <button
                      onClick={() => handleGenerateStoryboard()}
                      className="btn btn-primary btn-sm text-xs"
                    >
                      Generate Storyboard Rencana
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Saved Scripts List Card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Save className="w-4 h-4 text-primary-600" /> Versi Skrip Video Tersimpan ({savedScripts.length})
          </h4>
          <button
            onClick={fetchSavedScripts}
            disabled={isLoadingSaved}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-primary-600 transition-colors"
            title="Refresh versi"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingSaved ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {savedScripts.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">Belum ada versi skrip tersimpan untuk listing ini.</p>
        ) : (
          <div className="space-y-3">
            {savedScripts.map((saved) => {
              const isEditingThis = editingScriptId === saved.id;
              const isActive = activeSavedScript?.id === saved.id;

              return (
                <div
                  key={saved.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20'
                      : 'border-border bg-grey-50/50 dark:bg-grey-900/20 hover:border-grey-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-text-primary flex items-center gap-2">
                        {saved.name}
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold">
                            Aktif
                          </span>
                        )}
                      </h5>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-tertiary">
                        <span className="px-2 py-0.5 rounded bg-grey-100 dark:bg-grey-800 text-text-secondary font-medium">
                          {saved.style}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-grey-100 dark:bg-grey-800 text-text-secondary font-medium">
                          {saved.model}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-grey-100 dark:bg-grey-800 text-text-secondary font-medium">
                          {saved.aspect_ratio}
                        </span>
                        {saved.include_voice_over ? (
                          <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-medium">
                            VO: {saved.voice_language === 'inggris' ? 'EN' : 'ID'} ({saved.voice_gender || 'wanita'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-grey-100 dark:bg-grey-800 text-text-tertiary">
                            Tanpa VO
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadSaved(saved)}
                        className="btn btn-secondary btn-sm flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Tampilkan
                      </button>

                      <button
                        onClick={() => handleStartEditing(saved)}
                        className="btn btn-ghost btn-sm p-1.5 text-text-tertiary hover:text-primary-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSaved(saved.id)}
                        className="btn btn-ghost btn-sm p-1.5 text-text-tertiary hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditingThis ? (
                    <div className="mt-3 p-3 bg-grey-50 dark:bg-grey-800/60 rounded-lg space-y-3 text-xs">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Edit Video Prompt</label>
                        <textarea
                          value={editingScriptText}
                          onChange={(e) => setEditingScriptText(e.target.value)}
                          rows={4}
                          className="w-full text-xs font-mono"
                        />
                      </div>

                      {saved.include_voice_over && (
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1">Edit Voice Over Script</label>
                          <textarea
                            value={editingVoText}
                            onChange={(e) => setEditingVoText(e.target.value)}
                            rows={4}
                            className="w-full text-xs font-mono"
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEditedScript(saved.id)}
                          disabled={isUpdatingScript}
                          className="btn btn-primary btn-sm text-xs"
                        >
                          {isUpdatingScript ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button onClick={() => setEditingScriptId(null)} className="btn btn-secondary btn-sm text-xs">
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-text-secondary line-clamp-2 font-mono bg-grey-50 dark:bg-grey-900/30 p-2 rounded border border-border">
                      {saved.script}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
