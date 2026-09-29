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
    expect(res.scriptJson.scenes[0].audio.dialogue?.speaker).toContain('Wanita');
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
});
