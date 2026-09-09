import llmClient from '../utils/llmClient';
import type { Listing } from '../types';

export const VIDEO_STYLES = {
  cinematic: {
    label: 'Cinematic',
    description: 'Film-like look, dramatic golden-hour light, slow motion, high-end real estate videography.',
  },
  aerial: {
    label: 'Aerial / Drone',
    description: 'Sweeping drone establishing shots, neighborhood context, rooftop-to-garden reveal.',
  },
  lifestyle: {
    label: 'Lifestyle',
    description: 'Warm family moments, natural daylight, inviting atmosphere, people softly present.',
  },
  walkthrough: {
    label: 'Walkthrough',
    description: 'Smooth room-by-room gimbal tour, doorway-to-doorway flow, architecture-focused.',
  },
} as const;

export const VIDEO_MODELS = {
  runway: { label: 'Runway (Gen-3/4)', note: 'Short descriptive prompts, strong camera language.' },
  veo: { label: 'Google Veo 3 / Omni Flash', note: 'Scene-based natural language, clear subject and motion, native audio + voice over.' },
  pika: { label: 'Pika 2.0', note: 'Compact prompts, bold motion and style words.' },
  kling: { label: 'Kling AI 2.0', note: 'Detailed scene descriptions with camera movement.' },
  sora: { label: 'Sora (OpenAI)', note: 'Rich cinematic language, coherent multi-shot continuity.' },
} as const;

export const ASPECT_RATIO_MAP: Record<string, { resolution: string; label: string }> = {
  '16:9': { resolution: '1920x1080', label: '16:9 Landscape' },
  '9:16': { resolution: '1080x1920', label: '9:16 Portrait' },
  '4:5': { resolution: '1080x1350', label: '4:5 Social' },
};

export type VideoStyle = keyof typeof VIDEO_STYLES;
export type VideoModel = keyof typeof VIDEO_MODELS;

export interface VoiceOverConfig {
  enabled: boolean;
  gender?: 'pria' | 'wanita';
  language?: 'indonesia' | 'inggris';
  ageRange?: 'anak' | 'remaja' | 'dewasa_muda' | 'dewasa' | 'senior';
}

export interface VideoScriptOptions {
  style?: string;
  model?: string;
  aspectRatio?: string;
  voiceOver?: VoiceOverConfig;
  customInstructions?: string;
}

export interface VideoOnScreenText {
  content: string;
  style: string;
  animation: string;
}

export interface VideoTransition {
  in: string;
  out: string;
}

export interface VideoSceneVisuals {
  description: string;
  camera: string;
  on_screen_text: VideoOnScreenText | null;
}

export interface VideoSceneAudio {
  ambient?: string;
  effects?: string;
  voice_over?: {
    text: string;
    style: string;
  };
}

export interface VideoScriptScene {
  scene_number: number;
  duration_seconds: number;
  transition: VideoTransition;
  visuals: VideoSceneVisuals;
  audio: VideoSceneAudio;
}

export interface VideoScriptJson {
  project: string;
  settings: {
    total_duration_seconds: number;
    resolution: string;
    aspect_ratio: string;
  };
  scenes: VideoScriptScene[];
}

export interface VideoScriptResult {
  style: string;
  model: string;
  aspectRatio: string;
  voiceOver?: VoiceOverConfig;
  script: string;
  voiceOverScript: string | null;
  scriptJson: VideoScriptJson;
}

const DEFAULT_STYLE: VideoStyle = 'cinematic';
const DEFAULT_MODEL: VideoModel = 'runway';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

interface ScenePlan {
  scene: number;
  title: string;
  durationSeconds: number;
}

class VideoScriptGeneratorService {
  async generate(listing: Listing, options: VideoScriptOptions = {}): Promise<VideoScriptResult> {
    const style = this.resolveStyle(options.style);
    const model = this.resolveModel(options.model);
    const aspectRatio = options.aspectRatio && options.aspectRatio in ASPECT_RATIO_MAP ? options.aspectRatio : '16:9';
    const voiceOver = options.voiceOver && options.voiceOver.enabled ? options.voiceOver : { enabled: false };
    const customInstructions = (options.customInstructions || '').trim();

    const plan = this.buildScenePlan(listing);

    let script = '';
    let scriptFromLlm = false;
    try {
      script = await llmClient.generateCompletion(
        this.buildSystemPrompt(style, model, plan),
        this.buildUserPrompt(listing, style, model, aspectRatio, voiceOver, customInstructions, plan),
        { temperature: 0.7, maxTokens: 2500 }
      );
      if (!script || script.trim().length === 0) {
        throw new Error('LLM returned an empty video prompt');
      }
      scriptFromLlm = true;
    } catch (error) {
      console.warn('⚠️ LLM video prompt generation failed, using template-based fallback:', error);
      script = this.buildFallbackScript(listing, style, model, aspectRatio, voiceOver, customInstructions, plan);
    }

    let voiceOverScript: string | null = null;
    const narrationsByScene = new Map<number, string>();
    if (voiceOver.enabled) {
      try {
        voiceOverScript = await llmClient.generateCompletion(
          this.buildVoiceOverSystemPrompt(style, voiceOver, plan),
          this.buildVoiceOverUserPrompt(listing, scriptFromLlm ? script : '', plan),
          { temperature: 0.7, maxTokens: 2000 }
        );
        if (!voiceOverScript || voiceOverScript.trim().length === 0) {
          throw new Error('LLM returned an empty voice over script');
        }
        this.applyNarrationsFromScript(voiceOverScript, narrationsByScene);
      } catch (error) {
        console.warn('⚠️ LLM voice over generation failed, using template-based fallback:', error);
        voiceOverScript = this.buildFallbackVoiceOver(listing, voiceOver, plan);
      }
    }

    const scriptJson = this.buildSceneJson(listing, style, model, aspectRatio, voiceOver, plan, narrationsByScene);

    return {
      style,
      model,
      aspectRatio,
      voiceOver: voiceOver.enabled ? voiceOver : undefined,
      script,
      voiceOverScript,
      scriptJson,
    };
  }

  private resolveStyle(value?: string): VideoStyle {
    if (value && value in VIDEO_STYLES) return value as VideoStyle;
    return DEFAULT_STYLE;
  }

  private resolveModel(value?: string): VideoModel {
    if (value && value in VIDEO_MODELS) return value as VideoModel;
    return DEFAULT_MODEL;
  }

  /**
   * Deterministic scene plan shared by LLM prompts and template fallbacks so
   * the voice-over narration always lines up with the visual scenes.
   */
  private buildScenePlan(listing: Listing): ScenePlan[] {
    const type = listing.property_type || 'Rumah';
    const defaultPlan: ScenePlan[] = [
      { scene: 1, title: `Establishing Shot — ${type} Exterior`, durationSeconds: 4 },
      { scene: 2, title: 'Entrance & Living Area', durationSeconds: 5 },
      { scene: 3, title: 'Bedrooms & Interior Details', durationSeconds: 5 },
      { scene: 4, title: 'Bathrooms & Amenities', durationSeconds: 4 },
      { scene: 5, title: 'Outro & Call to Action', durationSeconds: 4 },
    ];
    return defaultPlan;
  }

  private buildSystemPrompt(style: VideoStyle, model: VideoModel, plan: ScenePlan[]): string {
    const styleInfo = VIDEO_STYLES[style];
    const modelInfo = VIDEO_MODELS[model];
    const scenes = plan
      .map((s) => `Scene ${s.scene}: "${s.title}" — target ~${s.durationSeconds} seconds`)
      .join('\n');

    return `You are an expert AI video prompt engineer for real estate listings.

Generate ONE text-to-video generation prompt in English, optimized for the AI video model: ${modelInfo.label}. ${modelInfo.note}

Visual style — "${styleInfo.label}": ${styleInfo.description}

The prompt MUST follow this exact 5-scene structure with per-scene durations:
${scenes}

Rules:
- Start with the property headline line: "Cinematic real estate video showcase of "<TITLE>" located in <LOCATION>." when the style is Cinematic; adapt the opening line to the chosen style otherwise.
- For every scene write: [Scene N — Scene Title — mm:ss] followed by 1-2 detailed camera/shoot sentences (subject, movement, light, mood) in English.
- Keep the whole prompt under ~220 words.
- Never invent rooms, fixtures, or numbers that are not present in the property details.
- End with a "Style:" line describing resolution, fps, grade, and camera gear consistent with the chosen style.
- Output only the prompt block, no commentary.`;
  }

  private buildUserPrompt(
    listing: Listing,
    style: VideoStyle,
    model: VideoModel,
    aspectRatio: string,
    voiceOver: VoiceOverConfig,
    customInstructions: string,
    plan: ScenePlan[]
  ): string {
    const lines: string[] = [
      'Property Details:',
      `Title: ${listing.title}`,
      `Price: Rp ${listing.price}`,
      `Location: ${listing.location}`,
      `Land/Building: ${listing.land_area || '-'} m² / ${listing.building_area || '-'} m²`,
      `Bedrooms/Bathrooms: ${listing.bedrooms || '-'} / ${listing.bathrooms || '-'}`,
      `Property Type: ${listing.property_type || 'Rumah'}`,
      `Key Features: ${listing.additional_info || 'None'}`,
      `Total Photos Available: ${(listing as any).photos?.length ?? 0}`,
      '',
      `Style: ${style} (${VIDEO_STYLES[style].label})`,
      `Target Model: ${model} (${VIDEO_MODELS[model].label})`,
      `Aspect Ratio: ${aspectRatio} (${ASPECT_RATIO_MAP[aspectRatio]?.resolution || '1920x1080'})`,
    ];

    if (voiceOver.enabled) {
      lines.push(`Voice Over: ${voiceOver.gender || 'wanita'}, ${voiceOver.language || 'indonesia'}, usia: ${voiceOver.ageRange || 'dewasa'}`);
    } else {
      lines.push('Voice Over: Tanpa VO');
    }

    lines.push(
      `Scene structure to follow (${plan.length} scenes with durations):`,
      ...plan.map((s) => `  - Scene ${s.scene} "${s.title}" (~${s.durationSeconds}s)`)
    );

    if (customInstructions) {
      lines.push('', `Additional User Instructions: ${customInstructions}`);
    }

    lines.push('', 'Generate the video generation prompt in English for optimal AI video model performance.');
    return lines.join('\n');
  }

  private buildVoiceOverSystemPrompt(style: VideoStyle, voiceOver: VoiceOverConfig, plan: ScenePlan[]): string {
    const scenes = plan.map((s) => `Scene ${s.scene}: "${s.title}"`).join('\n');
    const langStr = voiceOver.language === 'inggris' ? 'English' : 'Bahasa Indonesia';
    const genderStr = voiceOver.gender === 'pria' ? 'male' : 'female';
    const ageMap: Record<string, string> = {
      anak: 'child',
      remaja: 'teen',
      dewasa_muda: 'young adult (20-30 yo)',
      dewasa: 'adult (30-45 yo)',
      senior: 'senior (> 50 yo)',
    };
    const ageStr = ageMap[voiceOver.ageRange || 'dewasa'] || 'adult';

    return `You are a professional real estate voice-over narrator (${genderStr}, ${ageStr}) speaking in ${langStr}.

Write a voice-over narration script in ${langStr} for a ${VIDEO_STYLES[style].label.toLowerCase()} property video. The narration must match the exact scene structure below, one narration per scene:

${scenes}

Rules:
- Speak in natural, warm, professional tone suitable for a ${genderStr} ${ageStr} narrator.
- Each scene block starts with [Scene N — Scene Title] then 1-2 short spoken sentences that fit the scene duration.
- Do not read out camera directions or timing; those are visual notes, not narration.
- Never invent specs or numbers not present in the property details.
- Close the last scene with a friendly call to action to contact the agent.
- Output only the narration script, no commentary.`;
  }

  private buildVoiceOverUserPrompt(listing: Listing, generatedScript: string, plan: ScenePlan[]): string {
    const specLine = [
      listing.bedrooms ? `${listing.bedrooms} kamar tidur` : '',
      listing.bathrooms ? `${listing.bathrooms} kamar mandi` : '',
      listing.land_area ? `tanah ${listing.land_area} m²` : '',
      listing.building_area ? `bangunan ${listing.building_area} m²` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const priceText = listing.price >= 1000000000
      ? `${(listing.price / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} miliar`
      : `${(listing.price / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} juta`;

    const lines: string[] = [
      'Property yang akan dinarasikan:',
      `Judul: ${listing.title}`,
      `Lokasi: ${listing.location}`,
      `Tipe: ${listing.property_type || 'Rumah'}`,
      specLine ? `Spesifikasi: ${specLine}` : '',
      `Harga: sekitar Rp ${priceText}`,
      listing.additional_info ? `Fitur utama: ${listing.additional_info}` : '',
      '',
      `Tulis narasi voice over per scene dengan struktur ini (${plan.length} scene):`,
      ...plan.map((s) => `  - Scene ${s.scene} "${s.title}" (~${s.durationSeconds}s)`),
    ];

    if (generatedScript) {
      lines.push('', 'Sebagai referensi, berikut video prompt yang sudah dibuat untuk properti ini:', '');
      lines.push(generatedScript);
    }

    lines.push('', 'Keluarkan hanya naskah voice over, tanpa komentar tambahan.');
    return lines.join('\n');
  }

  private buildFallbackScript(
    listing: Listing,
    style: VideoStyle,
    model: VideoModel,
    aspectRatio: string,
    voiceOver: VoiceOverConfig,
    customInstructions: string,
    plan: ScenePlan[]
  ): string {
    const priceFormatted = IDR.format(listing.price);
    const styleInfo = VIDEO_STYLES[style];
    const modelInfo = VIDEO_MODELS[model];
    const type = listing.property_type || 'Rumah';
    const scenes: Record<number, string> = {
      1: `Drone footage slowly descending towards the front exterior of the ${type}, showing the architectural layout under soft warm golden hour sunlight. Smooth tilt down.`,
      2: `Slow motion steadycam entry through the main door. Smooth pan showcasing the spacious living room, highlighting the clean design, high ceilings, and natural light pouring in from the windows.`,
      3: `Gimbal glide shot into the main bedroom (${listing.bedrooms || 2} bedrooms total). Focus on the interior spacing and modern finishes.`,
      4: `Slow slider shot showcasing the bathroom (${listing.bathrooms || 1} bathrooms total), highlighting clean fixtures and premium tile work.`,
      5: `Elegant transition to the backyard/garden area or a high-angle view of the property. Text overlay: "For Sale - ${priceFormatted}". Smooth fade out.`,
    };

    const blocks = plan.map((s) => {
      const totalStart = plan
        .slice(0, s.scene - 1)
        .reduce((acc, x) => acc + x.durationSeconds, 0);
      const startMin = Math.floor(totalStart / 60);
      const startSec = totalStart % 60;
      const endMin = Math.floor((totalStart + s.durationSeconds) / 60);
      const endSec = (totalStart + s.durationSeconds) % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `[Scene ${s.scene}: ${s.title} — ${startMin}:${pad(startSec)}-${endMin}:${pad(endSec)}]\n${scenes[s.scene] || scenes[5]}`;
    });

    const opening = style === 'cinematic'
      ? `Cinematic real estate video showcase of "${listing.title}" located in ${listing.location}.`
      : `${styleInfo.label} real estate video of "${listing.title}" located in ${listing.location}.`;

    return `${opening}\n\n${blocks.join('\n\n')}\n\nStyle: ${ASPECT_RATIO_MAP[aspectRatio]?.resolution || '1920x1080'} resolution (${aspectRatio}), architectural photography style, ${styleInfo.description} Model note: ${modelInfo.note} 24fps, warm color grade, DJI gimbal movements, soft natural lighting.${customInstructions ? `\n\nUser Notes: ${customInstructions}` : ''}`;
  }

  private buildFallbackVoiceOver(listing: Listing, voiceOver: VoiceOverConfig, plan: ScenePlan[]): string {
    const formatHeader = (s: ScenePlan, start: number) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const startMin = Math.floor(start / 60);
      const startSec = start % 60;
      const endMin = Math.floor((start + s.durationSeconds) / 60);
      const endSec = (start + s.durationSeconds) % 60;
      return `[Scene ${s.scene}: ${s.title} — ${startMin}:${pad(startSec)}-${endMin}:${pad(endSec)}]`;
    };

    return plan
      .map((s) => {
        const start = plan.slice(0, s.scene - 1).reduce((acc, x) => acc + x.durationSeconds, 0);
        return `${formatHeader(s, start)}\n${this.fallbackNarration(listing, s.scene, voiceOver)}`;
      })
      .join('\n\n');
  }

  private fallbackNarration(listing: Listing, sceneNumber: number, voiceOver?: VoiceOverConfig): string {
    const isEn = voiceOver?.language === 'inggris';
    const specLine = isEn
      ? [
          listing.bedrooms ? `${listing.bedrooms} bedrooms` : '',
          listing.bathrooms ? `${listing.bathrooms} bathrooms` : '',
          listing.land_area ? `land area ${listing.land_area} sqm` : '',
          listing.building_area ? `building area ${listing.building_area} sqm` : '',
        ].filter(Boolean).join(', ')
      : [
          listing.bedrooms ? `${listing.bedrooms} kamar tidur` : '',
          listing.bathrooms ? `${listing.bathrooms} kamar mandi` : '',
          listing.land_area ? `luas tanah ${listing.land_area} m²` : '',
          listing.building_area ? `luas bangunan ${listing.building_area} m²` : '',
        ].filter(Boolean).join(', ');

    const priceText = listing.price >= 1000000000
      ? `${(listing.price / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${isEn ? 'billion' : 'miliar'}`
      : `${(listing.price / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} ${isEn ? 'million' : 'juta'}`;

    if (isEn) {
      const narrationsEn: Record<number, string> = {
        1: `Welcome to ${listing.title} located in ${listing.location}. ${specLine ? `This property features ${specLine}. ` : ''}Right from the entrance, it radiates elegance and care.`,
        2: `As you step inside, you'll feel the spacious living area bathed in soft natural light. Clean, modern, and perfectly suited for family life.`,
        3: `${listing.bedrooms || ''} comfortable bedrooms await inside, designed with space efficiency and a warm welcoming feel.`,
        4: `The bathrooms and amenities are equally pristine, using premium materials built to last.`,
        5: `Offered at approximately Rp ${priceText}. Don't miss out — contact our agent today for a private tour.`,
      };
      return narrationsEn[sceneNumber] || narrationsEn[5];
    }

    const narrationsId: Record<number, string> = {
      1: `Selamat datang di ${listing.title} yang berlokasi di ${listing.location}. ${specLine ? `Properti ini hadir dengan ${specLine}. ` : ''}Dari luar saja, kesannya sudah mewah dan terawat.`,
      2: `Begitu masuk, Anda akan merasakan ruang keluarga yang luas dengan pencahayaan alami yang melimpah. Desainnya bersih, modern, dan sangat nyaman untuk keluarga.`,
      3: `${listing.bedrooms || ''} kamar tidur tersedia di dalamnya${listing.bedrooms ? ' ' : ', '}dengan penataan ruang yang efisien dan kesan hangat di setiap sudutnya.`,
      4: `Kamar mandi dan area amenities-nya juga tidak kalah rapi, menggunakan material berkualitas yang mudah dirawat.`,
      5: `Harga penawaran sekitar Rp ${priceText}. Jangan sampai kehabisan — hubungi agen kami sekarang untuk jadwal survey lokasi.`,
    };

    return narrationsId[sceneNumber] || narrationsId[5];
  }

  private applyNarrationsFromScript(voiceOverScript: string, target: Map<number, string>): void {
    const blockRe = /\[Scene\s*(\d+)[^\]]*\]\s*([\s\S]*?)(?=\n\s*\[Scene|\s*$)/gi;
    for (const match of voiceOverScript.matchAll(blockRe)) {
      const sceneNumber = parseInt(match[1], 10);
      if (!sceneNumber) continue;
      const body = (match[2] || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      if (body) target.set(sceneNumber, body);
    }
  }

  /**
   * Multi-scene structured JSON document matching user specification:
   * {
   *   "project": "...",
   *   "settings": { "total_duration_seconds": 30, "resolution": "1080x1920", "aspect_ratio": "9:16" },
   *   "scenes": [
   *     {
   *       "scene_number": 1,
   *       "duration_seconds": 3,
   *       "transition": { "in": "...", "out": "..." },
   *       "visuals": { "description": "...", "camera": "...", "on_screen_text": { ... } | null },
   *       "audio": { "ambient": "...", "effects": "...", "voice_over": { "text": "...", "style": "..." } }
   *     }
   *   ]
   * }
   */
  private buildSceneJson(
    listing: Listing,
    style: VideoStyle,
    model: VideoModel,
    aspectRatio: string,
    voiceOver: VoiceOverConfig,
    plan: ScenePlan[],
    narrationsByScene: Map<number, string>
  ): VideoScriptJson {
    const type = listing.property_type || 'Rumah';
    const totalDuration = plan.reduce((acc, s) => acc + s.durationSeconds, 0);
    const aspectInfo = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP['16:9'];

    const genderLabel = voiceOver.gender === 'pria' ? 'Male' : 'Female';
    const langLabel = voiceOver.language === 'inggris' ? 'English' : 'Indonesian';
    const ageMapLabel: Record<string, string> = {
      anak: 'Child',
      remaja: 'Teenager',
      dewasa_muda: 'Young Adult (20-30)',
      dewasa: 'Adult (30-45)',
      senior: 'Senior (>50)',
    };
    const ageLabel = ageMapLabel[voiceOver.ageRange || 'dewasa'] || 'Adult';
    const voiceOverStyle = `${langLabel} ${genderLabel} voice (${ageLabel}), clear cinematic tone, warm narration`;

    const transitions: VideoTransition[] = [
      { in: 'Fade from pitch black with smooth lighting entry', out: 'Fast whip pan right' },
      { in: 'Fast whip pan right, matching scene 1 speed', out: 'Cross dissolve through soft daylight blur' },
      { in: 'Cut on action through doorway arch', out: 'Speed ramp acceleration blur' },
      { in: 'Speed ramp deceleration into smooth gimbal glide', out: 'Match cut on architectural line' },
      { in: 'Soft crossfade into wide establishing view', out: 'Fade to quiet elegant dark frame' },
    ];

    const onScreenTexts: Array<VideoOnScreenText | null> = [
      { content: `${listing.title.toUpperCase()}`, style: 'Bold elegant sans-serif font, stark white glow', animation: 'Flicker on, smooth tracking' },
      { content: `LOKASI: ${listing.location.toUpperCase()}`, style: 'Minimalist clean typography, subtle cyan accent', animation: 'Pop up sharply on beat, stays centered' },
      { content: listing.bedrooms ? `${listing.bedrooms} KAMAR TIDUR | ${listing.bathrooms || 1} KAMAR MANDI` : 'DESAIN MODERN & SIAP HUNI', style: 'Italic bold modern font, neon white glow', animation: 'Fades in smoothly from bottom third' },
      null,
      { content: `HUBUNGI AGEN SEKARANG`, style: 'Cinematic elegant serif font, glowing gold, large scale', animation: 'Expands slowly from center (zoom in)' },
    ];

    const scenes: VideoScriptScene[] = plan.map((s, idx) => {
      const narration = narrationsByScene.get(s.scene);
      const visual = this.buildSceneVisual(s.scene, listing, style, type);
      const trans = transitions[idx] || { in: 'Soft crossfade', out: 'Fade to black' };
      const ost = onScreenTexts[idx] || null;

      const audio: VideoSceneAudio = {
        ambient: visual.ambient,
        effects: visual.effects,
      };

      if (voiceOver.enabled) {
        audio.voice_over = {
          text: narration && narration.length > 0
            ? narration
            : this.fallbackNarration(listing, s.scene, voiceOver),
          style: voiceOverStyle,
        };
      }

      return {
        scene_number: s.scene,
        duration_seconds: s.durationSeconds,
        transition: trans,
        visuals: {
          description: `${visual.subject}. ${visual.action}.`,
          camera: `${visual.camera}, ${visual.lens}`,
          on_screen_text: ost,
        },
        audio,
      };
    });

    const slugTitle = listing.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return {
      project: `${slugTitle || 'property'}_video_campaign_${aspectRatio.replace(':', 'x')}`,
      settings: {
        total_duration_seconds: totalDuration,
        resolution: aspectInfo.resolution,
        aspect_ratio: aspectRatio,
      },
      scenes,
    };
  }

  private buildSceneVisual(sceneNumber: number, listing: Listing, style: VideoStyle, type: string) {
    const mood = {
      cinematic: 'premium and inviting',
      aerial: 'spacious and cinematic',
      lifestyle: 'warm and welcoming',
      walkthrough: 'clean and inviting',
    }[style];
    const light = {
      cinematic: 'soft golden-hour sunlight with gentle shadows',
      aerial: 'bright natural daylight, even exposure',
      lifestyle: 'warm natural light streaming through the windows',
      walkthrough: 'even, soft interior light with natural highlights',
    }[style];
    const atmosphere = {
      cinematic: 'serene, high-end real estate ambience',
      aerial: 'open, elevated, neighborhood-wide perspective',
      lifestyle: 'cozy, lived-in and family friendly',
      walkthrough: 'organized, easy to follow, no clutter',
    }[style];

    switch (sceneNumber) {
      case 1:
        return {
          subject: `The ${type} facade of ${listing.title}, fully framed at street level in ${listing.location}`,
          action: 'The house sits still while the camera slowly reveals it from street level',
          expression: mood,
          setting: `Quiet residential street frontage in ${listing.location}`,
          lighting: light,
          atmosphere,
          camera: 'slow drone push-in descending from above the roofline to eye level',
          lens: '24mm',
          ambient: 'distant city hum, light wind, faint birdsong',
          effects: 'gentle breeze, leaves rustling softly',
        };
      case 2:
        return {
          subject: `The open-plan living and entrance area with high ceilings and generous natural light`,
          action: 'camera glides through the front door into the living space',
          expression: 'bright, airy and spacious',
          setting: `Combined living and dining area of ${listing.title} in ${listing.location}`,
          lighting: light,
          atmosphere,
          camera: 'smooth gimbal dolly through the entrance door into the living room',
          lens: '35mm',
          ambient: 'quiet indoor room tone',
          effects: 'front door opening, soft footsteps on the floor',
        };
      case 3:
        return {
          subject: `The master bedroom${listing.bedrooms ? `, one of ${listing.bedrooms} total bedrooms` : ''} with modern neutral finishes`,
          action: 'camera drifts slowly along the bed and window wall',
          expression: 'calm, cozy and private',
          setting: `Master bedroom interior with warm natural finishes`,
          lighting: light,
          atmosphere,
          camera: 'slow lateral slider shot across the bed towards the window',
          lens: '35mm',
          ambient: 'quiet, soft interior ambience',
          effects: 'soft footsteps on the floor, faint fabric movement',
        };
      case 4:
        return {
          subject: `The bathroom${listing.bathrooms ? `, one of ${listing.bathrooms} total bathrooms` : ''} with clean fixtures and premium tiles`,
          action: 'camera tilts down across the vanity and fixtures',
          expression: 'clean, fresh and spotless',
          setting: `Bathroom and amenities area`,
          lighting: light,
          atmosphere,
          camera: 'slow slider across the vanity, tilting to the shower area',
          lens: '35mm',
          ambient: 'soft water echo in the tiled space',
          effects: 'faucet trickling gently',
        };
      default:
        return {
          subject: `The complete ${type} overview at dusk with warm interior lights on`,
          action: 'camera pulls up and away to reveal the whole property and neighborhood',
          expression: 'memorable, premium and complete',
          setting: `Elevated overview of ${listing.title} and its surroundings in ${listing.location}`,
          lighting: 'soft dusk light with warm interior glow',
          atmosphere,
          camera: 'crane up and backward reveal ending on a wide aerial of the neighborhood',
          lens: '24mm',
          ambient: 'calm evening ambience, faint neighborhood sounds',
          effects: 'none, music bed reserved for the end card',
        };
    }
  }
}

export default new VideoScriptGeneratorService();
