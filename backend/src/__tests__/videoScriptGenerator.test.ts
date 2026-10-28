import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/llmClient', () => ({
  default: { generateCompletion: vi.fn() },
}));

import llmClient from '../utils/llmClient';
import videoScriptGenerator from '../services/videoScriptGenerator.service';
import type { Listing } from '../types';

const generateCompletion = llmClient.generateCompletion as unknown as ReturnType<typeof vi.fn>;

const listing = {
  id: 'l1',
  title: 'Rumah Test',
  location: 'Bandung',
  price: 1000000000,
  bedrooms: 3,
  bathrooms: 2,
  land_area: 100,
  building_area: 120,
  property_type: 'Rumah',
  status: 'active',
  additional_info: null,
  description: null,
  created_at: new Date(),
  updated_at: new Date(),
} as unknown as Listing;

describe('VideoScriptGenerator — Omni Flash JSON', () => {
  beforeEach(() => generateCompletion.mockReset());

  it('builds scenes with the six Omni prompt dimensions and a paste-ready prompt', async () => {
    // LLM failure forces the deterministic template fallback.
    generateCompletion.mockResolvedValue('');

    const res = await videoScriptGenerator.generate(listing, {
      style: 'cinematic',
      model: 'veo',
      aspectRatio: '9:16',
    });

    expect(res.scriptJson.model).toBe('gemini-omni-flash');
    expect(res.scriptJson.settings.video_style).toBe('Cinematic');
    expect(res.scriptJson.settings.aspect_ratio).toBe('9:16');
    expect(res.scriptJson.scenes).toHaveLength(5);

    const scene = res.scriptJson.scenes[0];
    for (const key of [
      'shot_framing_and_motion',
      'style',
      'lighting',
      'location',
      'action',
      'text_rendering',
      'audio',
      'preservation',
      'negative',
      'prompt',
    ]) {
      expect(scene).toHaveProperty(key);
    }
    expect(scene.prompt).toContain('In a single continuous shot');
    expect(scene.prompt).toContain('Camera:');
    expect(scene.prompt).toContain('Preservation:');
    expect(scene.prompt).toContain('Avoid:');
    expect(scene.audio.dialogue).toBeNull();
    expect(res.scriptJson.constraints.reference_identity).toMatch(/reference images/);
    expect(res.scriptJson.constraints.voice_over).toMatch(/voice-over/);
    expect(scene.preservation).toMatch(/Do not change the model, objects, or faces/);
    expect(scene.negative).toMatch(/Do not alter the model, objects, or faces/);
  });

  it('forbids changing house design, interior, environment, and the model face in prompt and JSON', async () => {
    generateCompletion.mockResolvedValue('[Visual: Exterior shot.]\nVO: Selamat datang.');

    const res = await videoScriptGenerator.generate(listing, {
      style: 'cinematic',
      model: 'veo',
      voiceOver: { enabled: true, gender: 'wanita', language: 'indonesia', ageRange: 'dewasa' },
    });

    const lock = /house design|interior|environment|model'?s? face/i;
    expect(res.scriptJson.constraints.reference_identity).toMatch(lock);
    expect(res.scriptJson.constraints.reference_identity).toMatch(/Do not change the house design, interior, environment, or the model's face/i);

    for (const scene of res.scriptJson.scenes) {
      expect(scene.preservation).toMatch(/house design/i);
      expect(scene.preservation).toMatch(/interior/i);
      expect(scene.preservation).toMatch(/environment/i);
      expect(scene.preservation).toMatch(/model'?s? face/i);
      expect(scene.negative).toMatch(/house design/i);
      expect(scene.negative).toMatch(/interior/i);
      expect(scene.negative).toMatch(/environment/i);
      expect(scene.negative).toMatch(/model'?s? face/i);
      expect(scene.prompt).toMatch(/Do not change the house design, interior, environment, or the model's face/i);
    }

    const [systemPrompt, userPrompt] = generateCompletion.mock.calls[0];
    expect(systemPrompt).toMatch(/Do not change the house design, interior, environment, or the model's face/i);
    expect(userPrompt).toMatch(/Do not change the house design, interior, environment, or the model's face/i);
    expect(res.script).toMatch(/Do not change the house design, interior, environment, or the model's face/i);
  });

  it('forces voice over with a gender for the Talking Head style', async () => {
    generateCompletion.mockResolvedValue('');

    const res = await videoScriptGenerator.generate(listing, {
      style: 'talking_head',
      model: 'veo',
      voiceOver: { enabled: false },
    });

    expect(res.voiceOver?.enabled).toBe(true);
    expect(res.scriptJson.settings.voice_over.enabled).toBe(true);
    expect(res.scriptJson.settings.voice_over.gender).toBe('wanita');
    expect(res.scriptJson.scenes[0].audio.dialogue).not.toBeNull();
    expect(res.scriptJson.scenes[0].audio.dialogue?.speaker).toContain('Female');
    expect(res.scriptJson.settings.voice_over.language).toBe('Bahasa Indonesia');
    expect(res.scriptJson.constraints.reference_identity).toMatch(/Do not change the model, objects, or faces/);
    expect(res.scriptJson.constraints.voice_over).toMatch(/Bahasa Indonesia/);
    expect(res.scriptJson.scenes[0].preservation).toMatch(/Do not change the model, objects, or faces/);
    expect(res.scriptJson.scenes[0].audio.dialogue?.text).toMatch(/Selamat datang/);
  });

  it('keeps visual prompts in English and speaks Indonesian VO matching gender and age', async () => {
    generateCompletion.mockResolvedValue('');

    const res = await videoScriptGenerator.generate(listing, {
      style: 'cinematic',
      model: 'veo',
      voiceOver: { enabled: true, gender: 'pria', language: 'indonesia', ageRange: 'senior' },
    });

    expect(res.voiceOver).toMatchObject({
      enabled: true,
      gender: 'pria',
      language: 'indonesia',
      ageRange: 'senior',
    });
    expect(res.scriptJson.settings.voice_over).toMatchObject({
      enabled: true,
      gender: 'pria',
      language: 'Bahasa Indonesia',
      age_range: '50+',
    });
    expect(res.scriptJson.scenes[0].audio.dialogue?.speaker).toMatch(/Male/);
    expect(res.scriptJson.scenes[0].audio.dialogue?.text).toMatch(/Selamat datang/);
    expect(res.voiceOverScript).toMatch(/Selamat datang/);
    expect(res.scriptJson.scenes[0].prompt).toContain('In a single continuous shot');
    expect(res.scriptJson.scenes[0].prompt).toContain('Camera:');
    expect(res.scriptJson.constraints.voice_over).toMatch(/Bahasa Indonesia|Indonesian/);
    expect(res.script).toMatch(/\[Visual:/);
    expect(res.script).not.toMatch(/Drone turun perlahan/);

    const overlays = res.scriptJson.scenes
      .map((s) => s.text_rendering?.content)
      .filter((text): text is string => Boolean(text));
    expect(overlays.join(' ')).toMatch(/LOKASI:/);
    expect(overlays.join(' ')).toMatch(/KAMAR TIDUR/);
    expect(overlays.join(' ')).toMatch(/KAMAR MANDI/);
    expect(overlays.join(' ')).toMatch(/HUBUNGI AGEN/);
    expect(overlays.join(' ')).not.toMatch(/LOCATION:/);
    expect(overlays.join(' ')).not.toMatch(/BEDROOMS/);
    expect(overlays.join(' ')).not.toMatch(/BATHROOMS/);
    expect(overlays.join(' ')).not.toMatch(/CONTACT THE AGENT/);
  });

  it('keeps English on-screen JSON overlays when spoken language is English', async () => {
    generateCompletion.mockResolvedValue('');

    const res = await videoScriptGenerator.generate(listing, {
      style: 'cinematic',
      model: 'veo',
      voiceOver: { enabled: true, gender: 'wanita', language: 'inggris', ageRange: 'dewasa' },
    });

    const overlays = res.scriptJson.scenes
      .map((s) => s.text_rendering?.content)
      .filter((text): text is string => Boolean(text));
    expect(overlays.join(' ')).toMatch(/LOCATION:/);
    expect(overlays.join(' ')).toMatch(/BEDROOMS/);
    expect(overlays.join(' ')).toMatch(/BATHROOMS/);
    expect(overlays.join(' ')).toMatch(/CONTACT THE AGENT/);
    expect(overlays.join(' ')).not.toMatch(/LOKASI:/);
    expect(overlays.join(' ')).not.toMatch(/KAMAR TIDUR/);
    expect(overlays.join(' ')).not.toMatch(/HUBUNGI AGEN/);
  });

  it('writes English visual instructions and Indonesian spoken lines in the Veo LLM prompt', async () => {
    generateCompletion.mockResolvedValue('[Visual: Exterior shot.]\nVO: Selamat datang.');

    await videoScriptGenerator.generate(listing, {
      style: 'cinematic',
      model: 'veo',
      voiceOver: { enabled: true, gender: 'wanita', language: 'indonesia', ageRange: 'dewasa_muda' },
    });

    const [systemPrompt, userPrompt] = generateCompletion.mock.calls[0];
    expect(systemPrompt).toMatch(/English/);
    expect(systemPrompt).toMatch(/Bahasa Indonesia/);
    expect(systemPrompt).toMatch(/wanita|female/i);
    expect(systemPrompt).toMatch(/20-30|dewasa_muda|young adult/i);
    expect(userPrompt).toMatch(/alternating \[Visual: \.\.\.\] and VO: \.\.\. blocks/);
    expect(userPrompt).toMatch(/Visual.+English|Write the \[Visual\].+English/i);

    const [voSystemPrompt] = generateCompletion.mock.calls[1];
    expect(voSystemPrompt).toMatch(/Bahasa Indonesia/);
    expect(voSystemPrompt).not.toMatch(/speaking in English/);
  });

  it('supports the UGC style', async () => {
    generateCompletion.mockResolvedValue('');

    const res = await videoScriptGenerator.generate(listing, {
      style: 'ugc',
      model: 'veo',
    });

    expect(res.scriptJson.settings.video_style).toBe('UGC');
    expect(res.scriptJson.scenes[0].prompt.toLowerCase()).toContain('selfie');
  });

  describe('scene 1 marketing hook', () => {
    it('randomly picks one marketing angle and opens scene 1 VO with its hook', async () => {
      generateCompletion.mockResolvedValue('');
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // -> marketing4

      const res = await videoScriptGenerator.generate(listing, {
        style: 'cinematic',
        model: 'veo',
        voiceOver: { enabled: true, gender: 'wanita', language: 'indonesia', ageRange: 'dewasa' },
      });

      expect(res.hook?.style).toBe('marketing4');
      expect(res.hook?.label).toMatch(/Marketing 4\.0/);
      expect(res.hook?.text.length).toBeGreaterThan(0);
      expect(res.scriptJson.hook?.style).toBe('marketing4');

      const spoken = res.scriptJson.scenes[0].audio.dialogue?.text || '';
      expect(spoken.startsWith(res.hook!.text)).toBe(true);
      expect(res.voiceOverScript).toContain(res.hook!.text);
    });

    it('honours an explicit marketing angle instead of randomising', async () => {
      generateCompletion.mockResolvedValue('');
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // would pick marketing4 if random were used

      const res = await videoScriptGenerator.generate(listing, {
        style: 'cinematic',
        model: 'veo',
        voiceOver: { enabled: true, gender: 'pria', language: 'indonesia', ageRange: 'dewasa' },
        hookStyle: 'marketing2',
      });

      expect(res.hook?.style).toBe('marketing2');
      expect(res.hook?.label).toMatch(/Marketing 2\.0/);
      expect(res.scriptJson.scenes[0].audio.dialogue?.text.startsWith(res.hook!.text)).toBe(true);
    });

    it('writes an English hook when the voice over language is English', async () => {
      generateCompletion.mockResolvedValue('');
      vi.spyOn(Math, 'random').mockReturnValue(0); // -> marketing2

      const res = await videoScriptGenerator.generate(listing, {
        style: 'cinematic',
        model: 'veo',
        voiceOver: { enabled: true, gender: 'wanita', language: 'inggris', ageRange: 'dewasa' },
      });

      expect(res.hook?.text).not.toMatch(/[Mm]asih/);
      expect(res.hook?.text).toMatch(/earch|home|Trending/i);
    });

    it('tells the LLM to open scene 1 with the chosen hook', async () => {
      generateCompletion.mockResolvedValue('[Visual: Exterior shot.]\nVO: Placeholder.');

      await videoScriptGenerator.generate(listing, {
        style: 'cinematic',
        model: 'veo',
        voiceOver: { enabled: true, gender: 'wanita', language: 'indonesia', ageRange: 'dewasa' },
        hookStyle: 'marketing3',
      });

      const [voSystemPrompt] = generateCompletion.mock.calls[1];
      expect(voSystemPrompt).toMatch(/Marketing 3\.0/);
      expect(voSystemPrompt).toMatch(/Scene 1/);
    });
  });
});
