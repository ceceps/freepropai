import { useState, useEffect, useMemo } from 'react';
import { Video, Mic, Sparkles, Copy, Check, Info, Braces } from 'lucide-react';
import { listingApi } from '../../services/api';
import type { ListingWithDetails, VideoScriptOptions, VideoScriptResult, VideoStyle, VideoModel } from '../../types';

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

type OutputFormat = 'prompt' | 'json';

export default function VideoScriptGenerator({ listing }: VideoScriptGeneratorProps) {
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [model, setModel] = useState<VideoModel>('runway');
  const [includeVoiceOver, setIncludeVoiceOver] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [result, setResult] = useState<VideoScriptResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'prompt' | 'voiceover' | 'json' | null>(null);
  const [format, setFormat] = useState<OutputFormat>('prompt');

  const jsonText = useMemo(
    () => (result?.scriptJson ? JSON.stringify(result.scriptJson, null, 2) : ''),
    [result]
  );

  // Reset state when the listing changes
  useEffect(() => {
    setStyle('cinematic');
    setModel('runway');
    setIncludeVoiceOver(false);
    setCustomInstructions('');
    setResult(null);
    setError(null);
    setFormat('prompt');
  }, [listing.id]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const options: VideoScriptOptions = {
        style,
        model,
        includeVoiceOver,
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

  const handleClear = () => {
    setResult(null);
    setCustomInstructions('');
    setError(null);
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

  const FormatTabs = (
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
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h4 className="text-large font-semibold text-text-primary dark:text-text-primary">AI Video Generator</h4>
          <p className="text-sm text-text-tertiary mt-0.5">
            Cinematic scene prompt + Indonesian voice-over script, ready for {MODEL_OPTIONS.find(m => m.value === model)?.label || 'AI video tools'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasResult && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || noPhotos}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
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

      <div className="grid gap-5 md:grid-cols-2">
        {/* Video style */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-text-secondary">Video style</span>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStyle(opt.value)}
                disabled={isGenerating}
                title={opt.hint}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  style === opt.value
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                    : 'bg-transparent border-border dark:border-border text-text-secondary hover:bg-grey-50 dark:hover:bg-grey-800/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary">
            {STYLE_OPTIONS.find(s => s.value === style)?.hint}
          </p>
        </div>

        {/* AI model */}
        <div className="space-y-2">
          <label htmlFor="video-model" className="block text-sm font-medium text-text-secondary">AI video model</label>
          <select
            id="video-model"
            value={model}
            onChange={(e) => setModel(e.target.value as VideoModel)}
            disabled={isGenerating}
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary">The prompt is optimized for the selected model.</p>
        </div>
      </div>

      {/* Voice over toggle */}
      <div>
        <button
          type="button"
          role="switch"
          aria-checked={includeVoiceOver}
          onClick={() => setIncludeVoiceOver(v => !v)}
          disabled={isGenerating}
          className={`flex items-center gap-3 w-full p-4 rounded-xl border transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed ${
            includeVoiceOver
              ? 'border-primary-300 dark:border-primary-700 bg-primary-50/60 dark:bg-primary-900/20'
              : 'border-border dark:border-border bg-transparent hover:bg-grey-50 dark:hover:bg-grey-800/50'
          }`}
        >
          <span
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              includeVoiceOver ? 'bg-primary-600' : 'bg-grey-300 dark:bg-grey-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeVoiceOver ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2 font-medium text-text-primary">
              <Mic className="w-4 h-4" />
              Voice Over (Bahasa Indonesia)
            </span>
            <span className="block text-sm text-text-tertiary mt-0.5">
              Generate a per-scene narration script. Can be combined with any style, or left off for a silent video.
            </span>
          </span>
          {result?.voiceOverScript && includeVoiceOver && (
            <span className="badge badge-success flex-shrink-0">Included</span>
          )}
        </button>
      </div>

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
          rows={3}
        />
        <p className="text-xs text-text-tertiary">Add extra context to guide the AI prompt. Leave empty for default generation.</p>
      </div>

      {error && (
        <div className="card border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      {isGenerating ? (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl animate-pulse">
          <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            {includeVoiceOver ? 'Creating cinematic prompt & voice-over script...' : 'Creating cinematic video prompt...'}
          </p>
          <p className="text-sm text-text-tertiary mt-1">This can take a few seconds.</p>
        </div>
      ) : isGenerating ? (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl animate-pulse">
          <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            {includeVoiceOver ? 'Creating cinematic prompt & voice-over script...' : 'Creating cinematic video prompt...'}
          </p>
          <p className="text-sm text-text-tertiary mt-1">This can take a few seconds.</p>
        </div>
      ) : hasResult && result ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {FormatTabs}
            <button onClick={handleClear} className="btn btn-secondary flex items-center gap-2">
              Clear
            </button>
          </div>

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
              <p className="text-xs text-text-tertiary">
                One multi-scene JSON document ({result.scriptJson.scenes.length} scenes) following the structured prompt schema.
              </p>
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
                      Voice Over Script <span className="text-text-tertiary font-normal">(Bahasa Indonesia)</span>
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
            *The prompt uses {result.scriptJson.scenes.length} scenes with per-scene durations, optimized for{' '}
            {MODEL_OPTIONS.find(m => m.value === model)?.label}. Switch to the JSON tab for the structured multi-scene prompt.
          </p>
        </div>
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
          <Video className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary mb-2">No prompt generated yet.</p>
          <p className="text-sm text-text-tertiary">
            Pick a style, choose an AI video model{includeVoiceOver ? ' and a voice-over' : ''}, then click generate.
          </p>
        </div>
      )}
    </div>
  );
}
