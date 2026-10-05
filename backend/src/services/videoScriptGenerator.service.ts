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
  ugc: {
    label: 'UGC',
    description: 'Authentic user-generated content: handheld selfie-style, a real person talking straight to camera, casual and native to TikTok/Reels.',
  },
  talking_head: {
    label: 'Talking Head',
    description: 'Presenter-led video: one person speaking directly to camera in medium close-up, natural delivery, minimal camera movement.',
  },
} as const;

export const VIDEO_MODELS = {
  runway: { label: 'Runway (Gen-3/4)', note: 'Short descriptive prompts, strong camera language.' },
  veo: { label: 'Google Veo 3 / Omni Flash', note: 'Structured [Visual]/VO scene prompts with native audio + voice over.' },
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

export interface VideoSceneDialogue {
  speaker: string;
  text: string;
  delivery: string;
}

export interface VideoSceneAudio {
  ambient: string;
  music: string;
  dialogue: VideoSceneDialogue | null;
}

/**
 * Per-scene JSON aligned with the official Gemini Omni Flash prompt framework.
 * The six prompt dimensions (shot framing & motion, style, lighting, location,
 * action, text rendering) plus audio, preservation and negative rules map 1:1
 * to the fields below. `prompt` is the ready-to-paste plain-language prompt.
 */
export interface VideoScriptScene {
  scene_number: number;
  duration_seconds: number;
  shot_framing_and_motion: string;
  style: string;
  lighting: string;
  location: string;
  action: string;
  text_rendering: VideoOnScreenText | null;
  audio: VideoSceneAudio;
  preservation: string;
  negative: string;
  prompt: string;
}

export interface VideoScriptJson {
  project: string;
  model: string;
  settings: {
    video_style: string;
    aspect_ratio: string;
    resolution: string;
    total_duration_seconds: number;
    voice_over: {
      enabled: boolean;
      gender: string | null;
      language: string;
      age_range: string | null;
    };
  };
  constraints: {
    reference_identity: string;
    voice_over: string;
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

const MUSIC_BY_STYLE: Record<VideoStyle, string> = {
  cinematic: 'warm cinematic orchestral bed with soft piano',
  aerial: 'uplifting ambient pad with light percussion',
  lifestyle: 'warm acoustic guitar, feel-good family tone',
  walkthrough: 'minimal lo-fi beat, unobtrusive',
  ugc: 'trendy upbeat TikTok-style beat, casual energy',
  talking_head: 'soft corporate-friendly background bed, low volume',
};

interface SceneVisual {
  subject: string;
  action: string;
  expression: string;
  setting: string;
  lighting: string;
  atmosphere: string;
  camera: string;
  lens: string;
  ambient: string;
  effects: string;
}

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
    let voiceOver: VoiceOverConfig = options.voiceOver && options.voiceOver.enabled ? options.voiceOver : { enabled: false };
    // Talking Head is presenter-led: a narrator (with a gender) is mandatory.
    if (style === 'talking_head') {
      voiceOver = { ...voiceOver, enabled: true, gender: voiceOver.gender || 'wanita' };
    }
    const customInstructions = (options.customInstructions || '').trim();

    const plan = this.buildScenePlan(listing);

    // Veo / Omni use a dedicated [Visual]/VO alternating prompt so the native
    // audio voice-over is embedded directly in the generation prompt.
    const isVeo = model === 'veo';
    if (voiceOver.enabled) {
      voiceOver = { ...voiceOver, language: 'inggris' };
    }
    const promptLanguage: 'indonesia' | 'inggris' = voiceOver.enabled ? 'inggris' : 'indonesia';

    let script = '';
    let scriptFromLlm = false;
    try {
      script = await llmClient.generateCompletion(
        isVeo
          ? this.buildVeoSystemPrompt(style, model, plan, voiceOver, promptLanguage)
          : this.buildSystemPrompt(style, model, plan),
        isVeo
          ? this.buildVeoUserPrompt(listing, style, model, aspectRatio, voiceOver, customInstructions, plan, promptLanguage)
          : this.buildUserPrompt(listing, style, model, aspectRatio, voiceOver, customInstructions, plan),
        { temperature: isVeo ? 0.75 : 0.7, maxTokens: 2500 }
      );
      if (!script || script.trim().length === 0) {
        throw new Error('LLM returned an empty video prompt');
      }
      scriptFromLlm = true;
    } catch (error) {
      console.warn('⚠️ LLM video prompt generation failed, using template-based fallback:', error);
      script = isVeo
        ? this.buildVeoFallbackScript(listing, aspectRatio, voiceOver, customInstructions, plan, promptLanguage)
        : this.buildFallbackScript(listing, style, model, aspectRatio, voiceOver, customInstructions, plan);
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

  /**
   * Veo 3 / Omni Flash prompt writer. These models generate native audio, so the
   * prompt alternates a visual block with the spoken line for every scene.
   */
  private buildVeoSystemPrompt(
    style: VideoStyle,
    model: VideoModel,
    plan: ScenePlan[],
    voiceOver: VoiceOverConfig,
    language: 'indonesia' | 'inggris'
  ): string {
    const langLabel = language === 'inggris' ? 'English' : 'Bahasa Indonesia';
    const styleInfo = VIDEO_STYLES[style];
    const modelInfo = VIDEO_MODELS[model];
    const scenes = plan
      .map((s) => `Scene ${s.scene}: "${s.title}" (target ~${s.durationSeconds} seconds)`)
      .join('\n');
    const voiceRule = voiceOver.enabled
      ? `Narator: ${voiceOver.gender === 'pria' ? 'pria' : 'wanita'}, bahasa ${langLabel}, usia ${voiceOver.ageRange || 'dewasa'}.`
      : 'Tidak ada preferensi narator; gunakan suara netral yang ramah.';

    const structureRule = voiceOver.enabled
      ? `The prompt MUST alternate a visual block and a spoken line for every scene, using EXACTLY these labels:

[Visual: <camera, subject, movement, lighting and mood — 1-2 sentences>]
VO: <spoken narration for that scene — 1-2 sentences that fit the scene duration>`
      : `The prompt MUST contain one visual block per scene, using EXACTLY this label:

[Visual: <camera, subject, movement, lighting and mood — 1-2 sentences>]`;

    return `You are an expert AI video prompt engineer for real estate listings, writing a ready-to-paste prompt for ${modelInfo.label} (${modelInfo.note}).

Write the prompt in ${langLabel}.

${structureRule}

Visual style — "${styleInfo.label}": ${styleInfo.description}

Scene order and target duration:
${scenes}

Rules:
- Start directly with the first [Visual: ...] block — no title, no heading.
- Follow every [Visual: ...] block immediately with its line, in scene order.${voiceOver.enabled ? '' : ' Do not add VO lines.'}
- In each [Visual] block, describe cinematic camera work (handheld POV, drone, gimbal, slide, tilt) and what is on screen.
- ${voiceOver.enabled ? 'The VO must sound like a real person speaking naturally (casual, engaging, not a stiff ad read) and must fit the scene duration. ' : ''}Never invent rooms, fixtures, specs, or numbers that are not present in the property details.
- ${voiceRule}
- ${voiceOver.enabled ? 'End the last scene\'s VO with a friendly call to action.' : 'Keep the visuals grounded in the provided property details.'}
- Output only the prompt blocks ([Visual]${voiceOver.enabled ? '/VO' : ''}). No commentary, no extra headings.`;
  }

  private buildVeoUserPrompt(
    listing: Listing,
    style: VideoStyle,
    model: VideoModel,
    aspectRatio: string,
    voiceOver: VoiceOverConfig,
    customInstructions: string,
    plan: ScenePlan[],
    language: 'indonesia' | 'inggris'
  ): string {
    const langLabel = language === 'inggris' ? 'English' : 'Bahasa Indonesia';
    const lines: string[] = [
      'Property Details:',
      `Title: ${listing.title}`,
      `Price: ${IDR.format(listing.price)}`,
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

    lines.push(
      '',
      `Write the prompt in ${langLabel} using ${voiceOver.enabled ? 'alternating [Visual: ...] and VO: ... blocks' : 'one [Visual: ...] block per scene'}, in scene order.`,
      'Output only the [Visual]/blocks prompt.'
    );
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

    return `You are a professional real estate voice-over narrator (${genderStr}, ${ageStr}) speaking in English.

Write a voice-over narration script in English for a ${VIDEO_STYLES[style].label.toLowerCase()} property video. The narration must match the exact scene structure below, one narration per scene:

${scenes}

Rules:
- Speak in natural, warm, professional tone suitable for a ${genderStr} ${ageStr} narrator.
- Always write the spoken lines in English, even if the property details are in Indonesian.
- Each scene block starts with [Scene N — Scene Title] then 1-2 short spoken sentences that fit the scene duration.
- Do not read out camera directions or timing; those are visual notes, not narration.
- Never invent specs or numbers not present in the property details.
- Do not rewrite or replace a voice-over that has already been defined for a scene.
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
      'Property to narrate:',
      `Title: ${listing.title}`,
      `Location: ${listing.location}`,
      `Type: ${listing.property_type || 'Rumah'}`,
      specLine ? `Specs: ${specLine}` : '',
      `Price: about Rp ${priceText}`,
      listing.additional_info ? `Key features: ${listing.additional_info}` : '',
      '',
      `Write the English voice-over narration per scene with this structure (${plan.length} scenes):`,
      ...plan.map((s) => `  - Scene ${s.scene} "${s.title}" (~${s.durationSeconds}s)`),
    ];

    if (generatedScript) {
      lines.push('', 'For reference, here is the video prompt already created for this property:', '');
      lines.push(generatedScript);
    }

    lines.push('', 'Output only the English voice-over script, with no extra commentary.');
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

  /**
   * Veo/Omni fallback used when the LLM is unavailable. Produces the same
   * [Visual]/VO alternating structure as the LLM prompt so the format stays
   * consistent for the user's clipboard.
   */
  private buildVeoFallbackScript(
    listing: Listing,
    aspectRatio: string,
    voiceOver: VoiceOverConfig,
    customInstructions: string,
    plan: ScenePlan[],
    language: 'indonesia' | 'inggris'
  ): string {
    const priceFormatted = IDR.format(listing.price);
    const type = listing.property_type || 'Rumah';
    const isEn = language === 'inggris';

    const visualsId: Record<number, string> = {
      1: `Drone turun perlahan ke arah fasad depan ${type} dengan pencahayaan golden hour yang hangat. Tilt halus memperlihatkan ${listing.title} di ${listing.location} secara utuh.`,
      2: `Kamera handheld POV masuk melalui pintu utama ke ruang tamu yang lapang, plafon tinggi, dan cahaya alami yang melimpah. Panahan gimbal halus.`,
      3: `Gimbal glide perlahan menyusuri kamar tidur utama${listing.bedrooms ? ` (total ${listing.bedrooms} kamar)` : ''}, menonjolkan tata ruang rapi dan finishing modern.`,
      4: `Slider shot perlahan melewati kamar mandi${listing.bathrooms ? ` (total ${listing.bathrooms} kamar mandi)` : ''} dengan fixture bersih dan material premium.`,
      5: `Kamera terangkat perlahan memperlihatkan keseluruhan properti dan lingkungan sekitar saat senja. Teks di layar: "Dijual - ${priceFormatted}".`,
    };
    const visualsEn: Record<number, string> = {
      1: `Drone slowly descending toward the front facade of the ${type} in warm golden-hour light. A smooth tilt reveals ${listing.title} in ${listing.location}.`,
      2: `Handheld POV camera enters through the front door into a spacious living room with high ceilings and abundant natural light. Smooth gimbal pan.`,
      3: `Slow gimbal glide along the master bedroom${listing.bedrooms ? ` (${listing.bedrooms} bedrooms in total)` : ''}, highlighting efficient layout and modern finishes.`,
      4: `Slow slider shot across the bathroom${listing.bathrooms ? ` (${listing.bathrooms} bathrooms in total)` : ''} with clean fixtures and premium materials.`,
      5: `Camera rises to a wide reveal of the whole property and its surroundings at dusk. On-screen text: "For Sale - ${priceFormatted}".`,
    };

    const visuals = isEn ? visualsEn : visualsId;
    const withVoice = voiceOver.enabled;

    const blocks = plan.map((s) => {
      const visual = visuals[s.scene] || visuals[5];
      if (!withVoice) return `[Visual: ${visual}]`;
      const narration = this.fallbackNarration(listing, s.scene, voiceOver);
      return `[Visual: ${visual}]\nVO: ${narration}`;
    });

    const header = isEn
      ? `Structured video prompt for ${listing.title} in ${listing.location} (${ASPECT_RATIO_MAP[aspectRatio]?.resolution || '1920x1080'}, ${aspectRatio}).`
      : `Prompt video terstruktur untuk ${listing.title} di ${listing.location} (${ASPECT_RATIO_MAP[aspectRatio]?.resolution || '1920x1080'}, ${aspectRatio}).`;

    const note = customInstructions
      ? isEn
        ? `\n\nUser Notes: ${customInstructions}`
        : `\n\nCatatan Pengguna: ${customInstructions}`
      : '';

    return `${header}\n\n${blocks.join('\n\n')}${note}`;
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
   * Per-scene structured JSON aligned with the official Gemini Omni Flash prompt
   * framework. Each scene exposes the six prompt dimensions (shot framing &
   * motion, style, lighting, location, action, text rendering) plus audio,
   * preservation and negative rules, and a ready-to-paste `prompt` string.
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
    const styleInfo = VIDEO_STYLES[style];

    const genderLabel = voiceOver.gender === 'pria' ? 'Male' : 'Female';
    const langLabel = 'English';
    const ageMapLabel: Record<string, string> = {
      anak: 'Child',
      remaja: 'Teen',
      dewasa_muda: '20-30',
      dewasa: '30-45',
      senior: '50+',
    };
    const ageLabel = ageMapLabel[voiceOver.ageRange || 'dewasa'] || 'Adult';
    const speaker = `${genderLabel} (${ageLabel})`;
    const dialogueDelivery = `${langLabel}, natural conversational delivery, warm and clear`;
    const music = MUSIC_BY_STYLE[style];

    const onScreenTexts: Array<VideoOnScreenText | null> = [
      { content: `${listing.title.toUpperCase()}`, style: 'Bold elegant sans-serif font, stark white glow', animation: 'Flicker on, smooth tracking' },
      { content: `LOCATION: ${listing.location.toUpperCase()}`, style: 'Minimalist clean typography, subtle cyan accent', animation: 'Pop up sharply on beat, stays centered' },
      { content: listing.bedrooms ? `${listing.bedrooms} BEDROOMS | ${listing.bathrooms || 1} BATHROOMS` : 'MODERN DESIGN & READY TO MOVE IN', style: 'Italic bold modern font, neon white glow', animation: 'Fades in smoothly from bottom third' },
      null,
      { content: `CONTACT THE AGENT NOW`, style: 'Cinematic elegant serif font, glowing gold, large scale', animation: 'Expands slowly from center (zoom in)' },
    ];

    const scenes: VideoScriptScene[] = plan.map((s, idx) => {
      const visual = this.buildSceneVisual(s.scene, listing, style, type);
      const narration = narrationsByScene.get(s.scene)
        || (voiceOver.enabled ? this.fallbackNarration(listing, s.scene, voiceOver) : null);
      const ost = onScreenTexts[idx] || null;

      const shot = `${visual.camera}, ${visual.lens}`;
      const action = `${visual.subject}. ${visual.action}.`;
      const sceneStyle = `${styleInfo.label} — ${styleInfo.description}`;
      const audio: VideoSceneAudio = {
        ambient: visual.ambient,
        music,
        dialogue: voiceOver.enabled && narration
          ? { speaker, text: narration, delivery: dialogueDelivery }
          : null,
      };
      const preservation = this.buildPreservation(style);
      const negative = this.buildNegative();
      const prompt = this.buildOmniScenePrompt({
        shot,
        action,
        location: visual.setting,
        lighting: visual.lighting,
        sceneStyle,
        audio,
        onScreenText: ost,
        preservation,
        negative,
      });

      return {
        scene_number: s.scene,
        duration_seconds: s.durationSeconds,
        shot_framing_and_motion: shot,
        style: sceneStyle,
        lighting: visual.lighting,
        location: visual.setting,
        action,
        text_rendering: ost,
        audio,
        preservation,
        negative,
        prompt,
      };
    });

    const slugTitle = listing.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return {
      project: `${slugTitle || 'property'}_video_campaign_${aspectRatio.replace(':', 'x')}`,
      model: model === 'veo' ? 'gemini-omni-flash' : VIDEO_MODELS[model].label,
      settings: {
        video_style: styleInfo.label,
        aspect_ratio: aspectRatio,
        resolution: aspectInfo.resolution,
        total_duration_seconds: totalDuration,
        voice_over: {
          enabled: voiceOver.enabled,
          gender: voiceOver.enabled ? (voiceOver.gender || 'wanita') : null,
          language: langLabel,
          age_range: voiceOver.enabled ? ageLabel : null,
        },
      },
      constraints: {
        reference_identity: this.REFERENCE_IDENTITY_CONSTRAINT,
        voice_over: this.VOICE_OVER_CONSTRAINT,
      },
      scenes,
    };
  }

  private readonly REFERENCE_IDENTITY_CONSTRAINT =
    'Do not change the model, objects, or faces from the reference images. Preserve identity, facial features, body shape, clothing, and every object exactly as shown in the reference photos.';

  private readonly VOICE_OVER_CONSTRAINT =
    'Do not rewrite, paraphrase, translate, or replace the defined voice-over. Speak the voice-over text exactly as written, in English.';

  /** Presenter identity/outfit must stay stable in presenter-led styles. */
  private buildPreservation(style: VideoStyle): string {
    const identity = this.REFERENCE_IDENTITY_CONSTRAINT;
    const voice = this.VOICE_OVER_CONSTRAINT;
    const property = 'Keep the property layout, materials, colors, and fixtures exactly unchanged.';
    if (style === 'talking_head' || style === 'ugc') {
      return `${identity} ${property} Keep the same presenter identity, face, hairstyle, and outfit across all scenes. ${voice}`;
    }
    return `${identity} ${property} ${voice}`;
  }

  private buildNegative(): string {
    return 'Do not alter the model, objects, or faces from the reference images. Do not change the defined English voice-over. No readable text, no logos, no watermarks, no extra people, no distorted architecture, no invented property features, no scene cuts.';
  }

  private buildOmniScenePrompt(args: {
    shot: string;
    action: string;
    location: string;
    lighting: string;
    sceneStyle: string;
    audio: VideoSceneAudio;
    onScreenText: VideoOnScreenText | null;
    preservation: string;
    negative: string;
  }): string {
    const { shot, action, location, lighting, sceneStyle, audio, onScreenText, preservation, negative } = args;
    const audioLine = audio.dialogue
      ? `${audio.music}; ${audio.ambient}; dialogue (${audio.dialogue.speaker}): "${audio.dialogue.text}"`
      : `${audio.music}; ${audio.ambient}; no dialogue`;
    const parts = [
      `In a single continuous shot, ${action} in ${location}.`,
      `Camera: ${shot}.`,
      `Style: ${sceneStyle}.`,
      `Lighting: ${lighting}.`,
      `Audio: ${audioLine}.`,
    ];
    if (onScreenText) {
      parts.push(`On-screen text: "${onScreenText.content}" (${onScreenText.style}, ${onScreenText.animation}).`);
    }
    parts.push(`Preservation: ${preservation}.`);
    parts.push(`Avoid: ${negative}.`);
    return parts.join(' ');
  }

  private buildSceneVisual(sceneNumber: number, listing: Listing, style: VideoStyle, type: string): SceneVisual {
    const maps = this.styleMaps(style);
    if (style === 'talking_head') return this.talkingHeadVisual(sceneNumber, listing, maps);
    if (style === 'ugc') return this.ugcVisual(sceneNumber, listing, maps);
    return this.propertyBrollVisual(sceneNumber, listing, style, type, maps);
  }

  private styleMaps(style: VideoStyle): { mood: string; light: string; atmosphere: string } {
    const mood: Record<VideoStyle, string> = {
      cinematic: 'premium and inviting',
      aerial: 'spacious and cinematic',
      lifestyle: 'warm and welcoming',
      walkthrough: 'clean and inviting',
      ugc: 'authentic and energetic',
      talking_head: 'confident and trustworthy',
    };
    const light: Record<VideoStyle, string> = {
      cinematic: 'soft golden-hour sunlight with gentle shadows',
      aerial: 'bright natural daylight, even exposure',
      lifestyle: 'warm natural light streaming through the windows',
      walkthrough: 'even, soft interior light with natural highlights',
      ugc: 'natural daylight or soft ring light, casual smartphone exposure',
      talking_head: 'soft key light on the presenter with gentle fill and clean background separation',
    };
    const atmosphere: Record<VideoStyle, string> = {
      cinematic: 'serene, high-end real estate ambience',
      aerial: 'open, elevated, neighborhood-wide perspective',
      lifestyle: 'cozy, lived-in and family friendly',
      walkthrough: 'organized, easy to follow, no clutter',
      ugc: 'raw, friendly, unpolished-but-real vibe',
      talking_head: 'professional, approachable, presenter-led',
    };
    return { mood: mood[style], light: light[style], atmosphere: atmosphere[style] };
  }

  private talkingHeadVisual(
    sceneNumber: number,
    listing: Listing,
    maps: { mood: string; light: string; atmosphere: string }
  ): SceneVisual {
    const presenter = 'a friendly Indonesian property agent';
    if (sceneNumber === 1) {
      return {
        subject: `${presenter} standing in front of ${listing.title}`,
        action: 'the presenter looks straight into the lens and delivers a short, punchy hook about the property',
        expression: 'confident and welcoming',
        setting: `Front yard of ${listing.title} in ${listing.location}`,
        lighting: maps.light,
        atmosphere: maps.atmosphere,
        camera: 'locked-off medium close-up with a subtle handheld drift',
        lens: '50mm',
        ambient: 'quiet outdoor room tone, light breeze',
        effects: 'none, clean audio for dialogue',
      };
    }
    if (sceneNumber >= 5) {
      return {
        subject: `${presenter} framed in medium close-up`,
        action: 'the presenter smiles, delivers the call to action, and gestures invitingly toward the property',
        expression: 'warm and inviting',
        setting: `Interior of ${listing.title} in ${listing.location}`,
        lighting: maps.light,
        atmosphere: maps.atmosphere,
        camera: 'gentle push-in on a medium close-up',
        lens: '50mm',
        ambient: 'soft indoor room tone',
        effects: 'none, clean audio for dialogue',
      };
    }
    return this.propertyBrollVisual(sceneNumber, listing, 'talking_head', listing.property_type || 'Rumah', maps);
  }

  private ugcVisual(
    sceneNumber: number,
    listing: Listing,
    maps: { mood: string; light: string; atmosphere: string }
  ): SceneVisual {
    if (sceneNumber === 1) {
      return {
        subject: `a young property agent filming a handheld selfie video at ${listing.title}`,
        action: 'the presenter holds the phone at arm\'s length, talks to the front camera, and points at the property behind them',
        expression: 'energetic and casual',
        setting: `Driveway of ${listing.title} in ${listing.location}`,
        lighting: maps.light,
        atmosphere: maps.atmosphere,
        camera: 'handheld selfie POV with natural smartphone zoom',
        lens: 'smartphone wide',
        ambient: 'outdoor ambience, faint traffic',
        effects: 'slight handheld shake, natural phone microphone',
      };
    }
    if (sceneNumber >= 5) {
      return {
        subject: 'the same presenter back on a handheld selfie shot',
        action: 'the presenter gives a quick call to action to camera and invites viewers to book a viewing',
        expression: 'friendly and direct',
        setting: `Interior of ${listing.title} in ${listing.location}`,
        lighting: maps.light,
        atmosphere: maps.atmosphere,
        camera: 'handheld selfie close-up with a slight walking motion',
        lens: 'smartphone wide',
        ambient: 'indoor room tone',
        effects: 'natural handheld shake',
      };
    }
    return this.propertyBrollVisual(sceneNumber, listing, 'ugc', listing.property_type || 'Rumah', maps);
  }

  private propertyBrollVisual(
    sceneNumber: number,
    listing: Listing,
    style: VideoStyle,
    type: string,
    maps: { mood: string; light: string; atmosphere: string }
  ): SceneVisual {
    const { mood, light, atmosphere } = maps;
    const handheld = style === 'ugc';
    const cameraPrefix = handheld ? 'handheld phone camera' : '';
    const cam = (base: string) => (cameraPrefix ? `${cameraPrefix}, ${base}` : base);

    switch (sceneNumber) {
      case 1:
        return {
          subject: `The ${type} facade of ${listing.title}, fully framed at street level in ${listing.location}`,
          action: 'The house sits still while the camera slowly reveals it from street level',
          expression: mood,
          setting: `Quiet residential street frontage in ${listing.location}`,
          lighting: light,
          atmosphere,
          camera: cam('slow push-in descending from above the roofline to eye level'),
          lens: handheld ? 'smartphone wide' : '24mm',
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
          camera: cam('smooth dolly through the entrance door into the living room'),
          lens: handheld ? 'smartphone wide' : '35mm',
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
          camera: cam('slow lateral slider shot across the bed towards the window'),
          lens: handheld ? 'smartphone wide' : '35mm',
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
          camera: cam('slow slider across the vanity, tilting to the shower area'),
          lens: handheld ? 'smartphone wide' : '35mm',
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
          camera: cam('crane up and backward reveal ending on a wide aerial of the neighborhood'),
          lens: handheld ? 'smartphone wide' : '24mm',
          ambient: 'calm evening ambience, faint neighborhood sounds',
          effects: 'none, music bed reserved for the end card',
        };
    }
  }
}

export default new VideoScriptGeneratorService();
