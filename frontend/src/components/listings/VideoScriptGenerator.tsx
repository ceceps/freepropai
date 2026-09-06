import { useState, useEffect, useMemo } from 'react';
import { Video, Mic, Sparkles, Copy, Check, Info, Braces, Save, Trash2, Edit3, Bookmark, Eye, RefreshCw } from 'lucide-react';
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
  { value: 'veo', label: 'Google Veo 3 / Omni Flash' },
  { value: 'pika', label: 'Pika 2.0' },
  { value: 'kling', label: 'Kling AI 2.0' },
  { value: 'sora', label: 'Sora (OpenAI)' },
];

const FORMAT_OPTIONS: { value: AspectRatio; label: string; resolution: string }[] = [
  { value: '16:9', label: '16:9 Landscape', resolution: '1920x1080' },
  { value: '9:16', label: '9:16 Portrait', resolution: '1080x1920' },
  { value: '4:5', label: '4:5 Social', resolution: '1080x1350' },
];

type VOOption = 'tanpa' | 'custom';

const VO_PRESET_OPTIONS: { value: VOOption; label: string }[] = [
  { value: 'tanpa', label: 'Tanpa VO (Silent video)' },
  { value: 'custom', label: 'Dengan Voice Over...' },
];

const GENDER_OPTIONS: { value: VOGender; label: string }[] = [
  { value: 'pria', label: 'Pria' },
  { value: 'wanita', label: 'Wanita' },
];

const LANGUAGE_OPTIONS: { value: VOLanguage; label: string }[] = [
  { value: 'indonesia', label: 'Bahasa Indonesia' },
  { value: 'inggris', label: 'English' },
];

const AGE_RANGE_OPTIONS: { value: VOAgeRange; label: string }[] = [
  { value: 'anak', label: 'Anak-anak' },
  { value: 'remaja', label: 'Remaja (13-17 thn)' },
  { value: 'dewasa_muda', label: 'Dewasa Muda (20-30 thn)' },
  { value: 'dewasa', label: 'Dewasa (30-45 thn)' },
  { value: 'senior', label: 'Senior (> 50 thn)' },
];

type OutputFormat = 'prompt' | 'json';

export default function VideoScriptGenerator({ listing }: VideoScriptGeneratorProps) {
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [model, setModel] = useState<VideoModel>('runway');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [voPreset, setVoPreset] = useState<VOOption>('tanpa');
  const [voGender, setVoGender] = useState<VOGender>('wanita');
  const [voLanguage, setVoLanguage] = useState<VOLanguage>('indonesia');
  const [voAgeRange, setVoAgeRange] = useState<VOAgeRange>('dewasa');
  const [customInstructions, setCustomInstructions] = useState('');
  
  const [result, setResult] = useState<VideoScriptResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'prompt' | 'voiceover' | 'json' | null>(null);
  const [format, setFormat] = useState<OutputFormat>('prompt');

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

  const jsonText = useMemo(
    () => (result?.scriptJson ? JSON.stringify(result.scriptJson, null, 2) : ''),
    [result]
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
      console.error('Failed to load saved video scripts:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    setStyle('cinematic');
    setModel('runway');
    setAspectRatio('16:9');
    setVoPreset('tanpa');
    setVoGender('wanita');
    setVoLanguage('indonesia');
    setVoAgeRange('dewasa');
    setCustomInstructions('');
    setResult(null);
    setError(null);
    setFormat('prompt');
    setActiveSavedScript(null);
    fetchSavedScripts();
  }, [listing.id]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setActiveSavedScript(null);

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

      const res = await listingApi.saveVideoScript(listing.id, {
        name: savingName.trim(),
        style,
        model,
        aspectRatio,
        customInstructions,
        voiceOver,
        script: result.script,
        voiceOverScript: result.voiceOverScript,
        scriptJson: result.scriptJson,
      });

      if (res.success && res.data) {
        setShowSaveModal(false);
        setSavingName('');
        setActiveSavedScript(res.data);
        await fetchSavedScripts();
      }
    } catch (err: any) {
      console.error('Failed to save video script:', err);
      setError(err.response?.data?.error || 'Failed to save video script');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSaved = (script: VideoScriptRecord) => {
    setActiveSavedScript(script);
    setStyle(script.style as VideoStyle);
    setModel(script.model as VideoModel);
    setAspectRatio(script.aspect_ratio as AspectRatio);
    if (script.include_voice_over) {
      setVoPreset('custom');
      if (script.voice_gender) setVoGender(script.voice_gender as VOGender);
      if (script.voice_language) setVoLanguage(script.voice_language as VOLanguage);
      if (script.voice_age) setVoAgeRange(script.voice_age as VOAgeRange);
    } else {
      setVoPreset('tanpa');
    }
    setCustomInstructions(script.custom_instructions || '');
    setResult({
      listingId: listing.id,
      style: script.style as VideoStyle,
      model: script.model as VideoModel,
      aspectRatio: script.aspect_ratio as AspectRatio,
      script: script.script,
      voiceOverScript: script.voice_over_script,
      scriptJson: script.script_json,
    });
    // Scroll to top of generator
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteSaved = async (scriptId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus skrip video yang tersimpan ini?')) return;
    try {
      const res = await listingApi.deleteVideoScript(scriptId);
      if (res.success) {
        if (activeSavedScript?.id === scriptId) {
          setActiveSavedScript(null);
        }
        await fetchSavedScripts();
      }
    } catch (err) {
      console.error('Failed to delete video script:', err);
    }
  };

  const handleStartEditing = (script: VideoScriptRecord) => {
    setEditingScriptId(script.id);
    setEditingScriptText(script.script);
    setEditingVoText(script.voice_over_script || '');
  };

  const handleSaveEditedScript = async (scriptId: string) => {
    try {
      setIsUpdatingScript(true);
      const res = await listingApi.updateVideoScript(scriptId, {
        script: editingScriptText,
        voiceOverScript: editingVoText || null,
      });
      if (res.success && res.data) {
        setEditingScriptId(null);
        if (activeSavedScript?.id === scriptId) {
          setActiveSavedScript(res.data);
          setResult({
            listingId: listing.id,
            style: res.data.style as VideoStyle,
            model: res.data.model as VideoModel,
            aspectRatio: res.data.aspect_ratio as AspectRatio,
            script: res.data.script,
            voiceOverScript: res.data.voice_over_script,
            scriptJson: res.data.script_json,
          });
        }
        await fetchSavedScripts();
      }
    } catch (err) {
      console.error('Failed to update script:', err);
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setCustomInstructions('');
    setError(null);
    setActiveSavedScript(null);
  };

  const handleCopy = async (text: string, key: 'prompt' | 'voiceover' | 'json') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (copyError) {
      console.error('Failed to copy:', copyError);
    }
  };

  const hasResult = result !== null;
  const noPhotos = listing.photos.length === 0;

  // Keyboard shortcuts: Cmd/Ctrl+Enter to generate, Esc to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter or Ctrl+Enter to generate video script
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!isGenerating && !noPhotos && !showSaveModal && !editingScriptId) {
          e.preventDefault();
          handleGenerate();
        }
      }

      // Esc to close save modal or exit edit mode
      if (e.key === 'Escape') {
        if (showSaveModal) {
          e.preventDefault();
          setShowSaveModal(false);
        } else if (editingScriptId) {
          e.preventDefault();
          setEditingScriptId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, noPhotos, showSaveModal, editingScriptId, handleGenerate]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h4 className="text-large font-semibold text-text-primary dark:text-text-primary flex items-center gap-2">
            <Video className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            AI Video Generator
          </h4>
          <p className="text-sm text-text-tertiary mt-0.5">
            Buat ide visual video & skrip voice over per-scene, disesuaikan untuk {MODEL_OPTIONS.find(m => m.value === model)?.label || 'AI video tools'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasResult && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || noPhotos}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
          )}
          {!hasResult && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || noPhotos}
              className="btn btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isGenerating ? 'Generating...' : 'Generate Video Prompt'}</span>
            </button>
          )}
        </div>
      </div>

      {noPhotos && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 p-4 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">Video prompt creation requires at least one property photo for visual reference.</p>
        </div>
      )}

      {/* Generator Controls Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Video style */}
        <div className="space-y-2">
          <label htmlFor="video-style" className="block text-sm font-medium text-text-secondary">
            Video style
          </label>
          <select
            id="video-style"
            value={style}
            onChange={(e) => setStyle(e.target.value as VideoStyle)}
            disabled={isGenerating}
            className="w-full"
          >
            {STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary">
            {STYLE_OPTIONS.find(s => s.value === style)?.hint}
          </p>
        </div>

        {/* AI model */}
        <div className="space-y-2">
          <label htmlFor="video-model" className="block text-sm font-medium text-text-secondary">
            AI video model
          </label>
          <select
            id="video-model"
            value={model}
            onChange={(e) => setModel(e.target.value as VideoModel)}
            disabled={isGenerating}
            className="w-full"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary">The prompt is optimized for the selected model.</p>
        </div>

        {/* Format video */}
        <div className="space-y-2">
          <label htmlFor="video-format" className="block text-sm font-medium text-text-secondary">
            Format video
          </label>
          <select
            id="video-format"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            disabled={isGenerating}
            className="w-full"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label} ({opt.resolution})</option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary">Controls the output resolution and orientation.</p>
        </div>

        {/* Voice Over Select */}
        <div className="space-y-2">
          <label htmlFor="video-vo" className="block text-sm font-medium text-text-secondary">
            Voice Over (Voice Over)
          </label>
          <select
            id="video-vo"
            value={voPreset}
            onChange={(e) => setVoPreset(e.target.value as VOOption)}
            disabled={isGenerating}
            className="w-full"
          >
            {VO_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary">
            {includeVoiceOver
              ? 'Narration script will be generated per scene.'
              : 'Silent video without narration.'}
          </p>
        </div>
      </div>

      {/* Voice Over Sub-options */}
      {includeVoiceOver && (
        <div className="grid gap-4 md:grid-cols-3 p-4 rounded-xl border border-border bg-grey-50 dark:bg-grey-800/40">
          <div className="space-y-2">
            <label htmlFor="vo-gender" className="block text-sm font-medium text-text-secondary">Gender</label>
            <select
              id="vo-gender"
              value={voGender}
              onChange={(e) => setVoGender(e.target.value as VOGender)}
              disabled={isGenerating}
              className="w-full"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="vo-language" className="block text-sm font-medium text-text-secondary">Bahasa</label>
            <select
              id="vo-language"
              value={voLanguage}
              onChange={(e) => setVoLanguage(e.target.value as VOLanguage)}
              disabled={isGenerating}
              className="w-full"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="vo-age" className="block text-sm font-medium text-text-secondary">Range Usia</label>
            <select
              id="vo-age"
              value={voAgeRange}
              onChange={(e) => setVoAgeRange(e.target.value as VOAgeRange)}
              disabled={isGenerating}
              className="w-full"
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
          Custom Instructions (optional)
        </label>
        <textarea
          id="video-custom-instructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          disabled={isGenerating}
          placeholder="e.g. Focus on the living room and garden, make it feel cozy and warm, target young families..."
          rows={2}
          className="w-full"
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="card border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      {/* Generating State */}
      {isGenerating ? (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl animate-pulse">
          <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            Creating cinematic video prompt{includeVoiceOver ? ' & voice-over script' : ''}...
          </p>
          <p className="text-sm text-text-tertiary mt-1">This can take a few seconds.</p>
        </div>
      ) : hasResult && result ? (
        <div className="space-y-4">
          {/* Active Banner if loaded from saved */}
          {activeSavedScript && (
            <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                Melihat versi tersimpan: <strong className="font-semibold">{activeSavedScript.name}</strong>
              </span>
              <button
                onClick={() => handleStartEditing(activeSavedScript)}
                className="btn btn-ghost btn-sm flex items-center gap-1 text-primary-600 dark:text-primary-400"
              >
                <Edit3 className="w-4 h-4" /> Edit Skrip Ini
              </button>
            </div>
          )}

          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Output format"
              className="inline-flex rounded-lg border border-border bg-grey-100 dark:bg-grey-900 p-1"
            >
              {(['prompt', 'json'] as OutputFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  role="tab"
                  aria-selected={format === fmt}
                  aria-label={fmt === 'prompt' ? 'Prompt format' : 'JSON format'}
                  onClick={() => setFormat(fmt)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    format === fmt
                      ? 'bg-white dark:bg-grey-800 text-text-primary shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {fmt === 'prompt' ? 'Prompt' : 'JSON'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSavingName(`${STYLE_OPTIONS.find(s => s.value === style)?.label || 'Cinematic'} - ${aspectRatio}`);
                  setShowSaveModal(true);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Simpan Versi
              </button>

              <button onClick={handleClear} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                Clear
              </button>
            </div>
          </div>

          {/* Save Modal */}
          {showSaveModal && (
            <div className="p-4 border border-border bg-white dark:bg-grey-900 rounded-xl shadow-lg space-y-3 text-text-secondary">
              <h5 className="font-semibold text-sm text-text-primary dark:text-text-secondary">
                Simpan Versi Skrip Video
              </h5>
              <p className="text-xs text-text-tertiary">
                Beri nama versi ini untuk mempermudah pencarian di daftar versi tersimpan.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={savingName}
                  onChange={(e) => setSavingName(e.target.value)}
                  placeholder="e.g. Versi 1 - TikTok 9:16 Cinematic"
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-white dark:bg-grey-800 text-grey-900 dark:text-grey-100 border border-grey-300 dark:border-grey-600 placeholder-grey-400 dark:placeholder-grey-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving || !savingName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* JSON or PROMPT VIEW */}
          {format === 'json' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Braces className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  Multi-Scene JSON
                  <span className="text-text-tertiary font-normal">(structured)</span>
                </h5>
                <button
                  onClick={() => handleCopy(jsonText, 'json')}
                  className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-grey-100 dark:hover:bg-grey-800 transition-colors"
                  title="Copy JSON"
                >
                  {copied === 'json' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <pre className="bg-grey-50 dark:bg-grey-900/40 border border-border p-5 rounded-xl font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
                {jsonText}
              </pre>
            </div>
          ) : (
            <>
              {/* Video prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    Video Prompt <span className="text-text-tertiary font-normal">(English)</span>
                  </h5>
                  <button
                    onClick={() => handleCopy(result.script, 'prompt')}
                    className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-grey-100 dark:hover:bg-grey-800 transition-colors"
                    title="Copy prompt"
                  >
                    {copied === 'prompt' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative bg-grey-50 dark:bg-grey-900/40 border border-border p-5 rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {result.script}
                </div>
              </div>

              {/* Voice over */}
              {includeVoiceOver && result.voiceOverScript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Voice Over Script{' '}
                      <span className="text-text-tertiary font-normal">
                        ({voLanguage === 'indonesia' ? 'Bahasa Indonesia' : 'English'} - {voGender === 'pria' ? 'Pria' : 'Wanita'} - {AGE_RANGE_OPTIONS.find(a => a.value === voAgeRange)?.label || 'Dewasa'})
                      </span>
                    </h5>
                    <button
                      onClick={() => handleCopy(result.voiceOverScript!, 'voiceover')}
                      className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-grey-100 dark:hover:bg-grey-800 transition-colors"
                      title="Copy voice over script"
                    >
                      {copied === 'voiceover' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="relative bg-grey-50 dark:bg-grey-900/40 border border-border p-5 rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {result.voiceOverScript}
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-text-tertiary">
            *The prompt uses {result.scriptJson.scenes.length} scenes ({result.scriptJson.settings.total_duration_seconds}s total), optimized for{' '}
            {MODEL_OPTIONS.find(m => m.value === model)?.label}. Format: {result.scriptJson.settings.resolution} ({result.scriptJson.settings.aspect_ratio}).
          </p>
        </div>
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
          <Video className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary mb-2">No prompt generated yet.</p>
          <p className="text-sm text-text-tertiary">
            Pilih style, format video, AI video model{includeVoiceOver ? ' dan konfigurasi voice-over' : ''}, lalu klik "Generate Video Prompt".
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* SAVED VIDEO SCRIPTS LIST SECTION                             */}
      {/* ============================================================ */}
      <div className="pt-6 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-semibold text-text-primary dark:text-text-primary flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Daftar Skrip Video Tersimpan ({savedScripts.length})
          </h4>
          {isLoadingSaved && <span className="text-xs text-text-tertiary animate-pulse">Loading...</span>}
        </div>

        {savedScripts.length === 0 ? (
          <div className="p-6 border border-dashed border-border rounded-xl text-center text-text-tertiary text-sm">
            Belum ada skrip video yang disimpan untuk properti ini. Klik "Simpan Versi" setelah membuat prompt di atas.
          </div>
        ) : (
          <div className="space-y-3">
            {savedScripts.map((saved) => {
              const isEditingThis = editingScriptId === saved.id;
              const isLoadedActive = activeSavedScript?.id === saved.id;

              return (
                <div
                  key={saved.id}
                  className={`card p-4 transition-all border ${
                    isLoadedActive
                      ? 'border-primary-500 ring-2 ring-primary-300/40 dark:ring-primary-900/40'
                      : 'border-border hover:border-grey-300 dark:hover:border-grey-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <h5 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                        {saved.name}
                        {isLoadedActive && (
                          <span className="badge badge-success text-xs">Active View</span>
                        )}
                      </h5>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-tertiary">
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
                          <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-medium">
                            VO: {saved.voice_language === 'inggris' ? 'EN' : 'ID'} ({saved.voice_gender || 'wanita'}, {saved.voice_age || 'dewasa'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-grey-100 dark:bg-grey-800 text-text-tertiary">
                            Tanpa VO
                          </span>
                        )}
                        <span>• {new Date(saved.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadSaved(saved)}
                        className="btn btn-secondary btn-sm flex items-center gap-1"
                        title="Buka / Tampilkan di generator"
                      >
                        <Eye className="w-3.5 h-3.5" /> Tampilkan
                      </button>

                      <button
                        onClick={() => handleStartEditing(saved)}
                        className="btn btn-ghost btn-sm p-1.5 text-text-tertiary hover:text-primary-600"
                        title="Edit Teks Skrip"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSaved(saved.id)}
                        className="btn btn-ghost btn-sm p-1.5 text-text-tertiary hover:text-red-600"
                        title="Hapus Versi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Editing inline form */}
                  {isEditingThis ? (
                    <div className="mt-3 p-3 bg-grey-50 dark:bg-grey-800/60 rounded-lg space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Edit Video Prompt (English)
                        </label>
                        <textarea
                          value={editingScriptText}
                          onChange={(e) => setEditingScriptText(e.target.value)}
                          rows={4}
                          className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white dark:bg-grey-800 text-grey-900 dark:text-grey-100 border border-grey-300 dark:border-grey-600 placeholder-grey-400 dark:placeholder-grey-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {saved.include_voice_over && (
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1">
                            Edit Voice Over Script
                          </label>
                          <textarea
                            value={editingVoText}
                            onChange={(e) => setEditingVoText(e.target.value)}
                            rows={4}
                            className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white dark:bg-grey-800 text-grey-900 dark:text-grey-100 border border-grey-300 dark:border-grey-600 placeholder-grey-400 dark:placeholder-grey-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEditedScript(saved.id)}
                          disabled={isUpdatingScript}
                          className="btn btn-primary btn-sm"
                        >
                          {isUpdatingScript ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                        <button
                          onClick={() => setEditingScriptId(null)}
                          className="btn btn-secondary btn-sm"
                        >
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
