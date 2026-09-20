import { describe, it, expect } from 'vitest';
import storyboardPlanner from '../services/storyboardPlanner.service';
import type { ListingWithDetails } from '../types';

describe('StoryboardPlannerService Unit Tests', () => {
  const sampleListing: ListingWithDetails = {
    id: 'e0d4b91e-6f6e-4cdb-b488-a4355e63c6c5',
    title: 'Rumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol',
    description: 'Rumah 2 lantai readystock',
    property_type: 'rumah',
    price: 975000000,
    location: 'Ngamprah Bandung Barat',
    bedrooms: 3,
    bathrooms: 2,
    land_area: 72,
    building_area: 100,
    status: 'available',
    additional_info: 'Dekat KCIC Whoosh Padalarang',
    source_url: 'https://www.acehome.co.id/project/detail/9f1c3ad7-d2b6-43e5-b641-eae0f5c9924e',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    photos: [
      {
        id: 'photo_1',
        listing_id: 'e0d4b91e-6f6e-4cdb-b488-a4355e63c6c5',
        photo_url: 'http://example.com/photo1.jpg',
        is_featured: true,
        created_at: new Date().toISOString(),
      },
    ],
    descriptions: [],
    analyses: [],
  };

  it('should generate a valid Storyboard planner result matching output schema', async () => {
    const result = await storyboardPlanner.planStoryboard(sampleListing, {
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

    expect(result).toHaveProperty('meta');
    expect(result.meta.listing_title).toBe('Rumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol');
    expect(result.meta.aspect_ratio).toBe('9:16');
    expect(result.meta.resolution).toBe('1080x1920');
    expect(result.meta.voice_over).toBe(true);

    expect(result.meta.columns).toEqual(['scene_no', 'frame', 'vo_text', 'overlay_text', 'camera_motion', 'duration_sec']);
    expect(result.sheets).toBeInstanceOf(Array);
    expect(result.sheets.length).toBeGreaterThan(0);

    const firstScene = result.sheets[0].scenes[0];
    expect(firstScene).toHaveProperty('scene_no');
    expect(firstScene).toHaveProperty('photo_id');
    expect(firstScene).toHaveProperty('frame_prompt');
    expect(firstScene.frame_prompt).toContain('Aspect ratio 9:16');
  });

  it('should exclude vo_text from columns when voice_over is false', async () => {
    const result = await storyboardPlanner.planStoryboard(sampleListing, {
      voice_over: false,
    });

    expect(result.meta.voice_over).toBe(false);
    expect(result.meta.columns).toEqual(['scene_no', 'frame', 'camera_motion', 'duration_sec']);
  });
});
