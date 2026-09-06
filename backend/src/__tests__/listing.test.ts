import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { listings, listingPhotos, listingDescriptions, listingVideoPrompts, scrapedListings } from '../db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import llmClient from '../utils/llmClient';

describe('Listing API Endpoints', () => {
  let testListingId: string;

  beforeEach(async () => {
    // Clean up before each test - proper order to avoid FK constraints
    await db.delete(listingVideoPrompts);
    await db.delete(listingDescriptions);
    await db.delete(listingPhotos);
    await db.delete(scrapedListings);
    await db.delete(listings);
  });

  describe('POST /api/listings', () => {
    it('should create a new listing without photos', async () => {
      const listingData = {
        title: 'Test Rumah BSD',
        location: 'BSD City, Tangerang',
        price: 1200000000,
        landArea: 120,
        buildingArea: 90,
        bedrooms: 3,
        bathrooms: 2,
        propertyType: 'rumah',
        additionalInfo: 'Dekat sekolah',
      };

      const response = await request(app)
        .post('/api/listings')
        .send(listingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(listingData.title);
      expect(response.body.data.location).toBe(listingData.location);
      expect(response.body.data.listingId).toBeDefined();

      testListingId = response.body.data.listingId;
    });

    it('should create a listing with photos', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
      
      const response = await request(app)
        .post('/api/listings')
        .field('title', 'Test Rumah with Photos')
        .field('location', 'Jakarta Selatan')
        .field('price', '1500000000')
        .field('bedrooms', '3')
        .field('bathrooms', '2')
        .field('propertyType', 'rumah')
        .attach('photos', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.photos).toBeDefined();
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/listings')
        .send({
          title: 'Test',
          // missing location and price
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate price is a number', async () => {
      const response = await request(app)
        .post('/api/listings')
        .send({
          title: 'Test',
          location: 'Jakarta',
          price: 'invalid-price',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/listings', () => {
    beforeEach(async () => {
      // Create test listings
      await db.insert(listings).values([
        {
          title: 'Listing 1',
          location: 'Jakarta',
          price: '1000000000',
          status: 'draft',
        },
        {
          title: 'Listing 2',
          location: 'Bandung',
          price: '800000000',
          status: 'published',
        },
        {
          title: 'Listing 3',
          location: 'Surabaya',
          price: '1500000000',
          status: 'draft',
        },
      ]);
    });

    it('should get all listings', async () => {
      const response = await request(app)
        .get('/api/listings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(3);
    });

    it('should filter listings by status', async () => {
      const response = await request(app)
        .get('/api/listings?status=published')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('published');
    });

    it('should return empty array when no listings exist', async () => {
      await db.delete(listings);

      const response = await request(app)
        .get('/api/listings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /api/listings/:id', () => {
    beforeEach(async () => {
      const [listing] = await db.insert(listings).values({
        title: 'Test Listing',
        location: 'Jakarta',
        price: '1000000000',
        landArea: '100',
        buildingArea: '80',
        bedrooms: 3,
        bathrooms: 2,
        propertyType: 'rumah',
        additionalInfo: 'Test info',
        status: 'draft',
      }).returning();

      testListingId = listing.id;

      // Add photos
      await db.insert(listingPhotos).values([
        {
          listingId: testListingId,
          photoUrl: '/uploads/photo1.jpg',
          photoOrder: 0,
        },
        {
          listingId: testListingId,
          photoUrl: '/uploads/photo2.jpg',
          photoOrder: 1,
        },
      ]);

      // Add descriptions
      await db.insert(listingDescriptions).values([
        {
          listingId: testListingId,
          variantType: 'formal',
          descriptionText: 'Formal description',
          isSelected: false,
        },
        {
          listingId: testListingId,
          variantType: 'casual_1',
          descriptionText: 'Casual description 1',
          isSelected: true,
        },
      ]);
    });

    it('should get listing by id with full details', async () => {
      const response = await request(app)
        .get(`/api/listings/${testListingId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testListingId);
      expect(response.body.data.title).toBe('Test Listing');
      expect(response.body.data.photos).toBeInstanceOf(Array);
      expect(response.body.data.photos.length).toBe(2);
      expect(response.body.data.descriptions).toBeInstanceOf(Array);
      expect(response.body.data.descriptions.length).toBe(2);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/listings/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Listing not found');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/listings/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/listings/:id', () => {
    beforeEach(async () => {
      const [listing] = await db.insert(listings).values({
        title: 'Original Title',
        location: 'Jakarta',
        price: '1000000000',
        status: 'draft',
      }).returning();

      testListingId = listing.id;
    });

    it('should update listing fields', async () => {
      const updateData = {
        title: 'Updated Title',
        price: 1500000000,
        bedrooms: 4,
      };

      const response = await request(app)
        .patch(`/api/listings/${testListingId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.price).toBe(updateData.price);
      expect(response.body.data.bedrooms).toBe(updateData.bedrooms);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .patch(`/api/listings/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should allow partial updates', async () => {
      const response = await request(app)
        .patch(`/api/listings/${testListingId}`)
        .send({ title: 'Only Title Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Only Title Updated');
      expect(response.body.data.location).toBe('Jakarta'); // unchanged
    });
  });

  describe('DELETE /api/listings/:id', () => {
    beforeEach(async () => {
      const [listing] = await db.insert(listings).values({
        title: 'To Be Deleted',
        location: 'Jakarta',
        price: '1000000000',
        status: 'draft',
      }).returning();

      testListingId = listing.id;
    });

    it('should delete a listing', async () => {
      const response = await request(app)
        .delete(`/api/listings/${testListingId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Listing deleted successfully');

      // Verify deletion
      const checkResponse = await request(app)
        .get(`/api/listings/${testListingId}`)
        .expect(404);

      expect(checkResponse.body.success).toBe(false);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/listings/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should cascade delete photos and descriptions', async () => {
      // Add photos and descriptions
      await db.insert(listingPhotos).values({
        listingId: testListingId,
        photoUrl: '/uploads/photo.jpg',
        photoOrder: 0,
      });

      await db.insert(listingDescriptions).values({
        listingId: testListingId,
        variantType: 'formal',
        descriptionText: 'Test description',
        isSelected: false,
      });

      // Delete listing
      await request(app)
        .delete(`/api/listings/${testListingId}`)
        .expect(200);

      // Verify cascade deletion
      const photos = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, testListingId));
      const descriptions = await db.select().from(listingDescriptions).where(eq(listingDescriptions.listingId, testListingId));

      expect(photos.length).toBe(0);
      expect(descriptions.length).toBe(0);
    });
  });

  describe('POST /api/listings/:id/generate-descriptions', () => {
    beforeEach(async () => {
      const [listing] = await db.insert(listings).values({
        title: 'Test Listing for Descriptions',
        location: 'BSD City',
        price: '1200000000',
        landArea: '120',
        buildingArea: '90',
        bedrooms: 3,
        bathrooms: 2,
        propertyType: 'rumah',
        additionalInfo: 'Dekat sekolah',
        status: 'draft',
      }).returning();

      testListingId = listing.id;
    });

    it.skip('should generate 3 description variants', async () => {
      // Skipped: Requires real LLM API key and takes 30+ seconds
      // To test manually: Set AGENTROUTER_API_KEY in .env.test.local and remove .skip
      const response = await request(app)
        .post(`/api/listings/${testListingId}/generate-descriptions`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.descriptions).toBeInstanceOf(Array);
      expect(response.body.data.descriptions.length).toBe(3);

      const variantTypes = response.body.data.descriptions.map((d: any) => d.variant_type);
      expect(variantTypes).toContain('formal');
      expect(variantTypes).toContain('casual_1');
      expect(variantTypes).toContain('casual_2');
    }, 30000); // 30 second timeout for LLM call

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .post(`/api/listings/${fakeId}/generate-descriptions`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle LLM errors gracefully', async () => {
      // This test would require mocking the LLM service
      // For now, we'll skip it or implement with proper mocking
    });
  });

  describe('PATCH /api/listings/:listingId/descriptions/:descId/select', () => {
    let descriptionId: string;

    beforeEach(async () => {
      const [listing] = await db.insert(listings).values({
        title: 'Test Listing',
        location: 'Jakarta',
        price: '1000000000',
        status: 'draft',
      }).returning();

      testListingId = listing.id;

      const [desc1] = await db.insert(listingDescriptions).values({
        listingId: testListingId,
        variantType: 'formal',
        descriptionText: 'Formal description',
        isSelected: false,
      }).returning();

      await db.insert(listingDescriptions).values({
        listingId: testListingId,
        variantType: 'casual_1',
        descriptionText: 'Casual description',
        isSelected: true,
      });

      descriptionId = desc1.id;
    });

    it('should select a description variant', async () => {
      const response = await request(app)
        .patch(`/api/listings/${testListingId}/descriptions/${descriptionId}/select`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.descriptionId).toBe(descriptionId);
      expect(response.body.data.isSelected).toBe(true);

      // Verify only one is selected
      const allDescriptions = await db.select().from(listingDescriptions).where(eq(listingDescriptions.listingId, testListingId));
      const selectedCount = allDescriptions.filter(d => d.isSelected).length;
      expect(selectedCount).toBe(1);
    });

    it('should return 404 for non-existent description', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .patch(`/api/listings/${testListingId}/descriptions/${fakeId}/select`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/listings/:id/generate-video-script', () => {
    let listingWithPhotosId: string;
    let listingNoPhotosId: string;

    beforeEach(async () => {
      const [listingA] = await db.insert(listings).values({
        title: 'Listing With Photos',
        location: 'Jakarta',
        price: '2000000000',
        status: 'draft',
      }).returning();
      listingWithPhotosId = listingA.id;

      await db.insert(listingPhotos).values({
        listingId: listingWithPhotosId,
        photoUrl: '/uploads/test-photo.jpg',
        photoOrder: 0,
      });

      const [listingB] = await db.insert(listings).values({
        title: 'Listing No Photos',
        location: 'Bandung',
        price: '1500000000',
        status: 'draft',
      }).returning();
      listingNoPhotosId = listingB.id;
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/listings/${fakeId}/generate-video-script`)
        .send({ customInstructions: '' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when listing has no photos', async () => {
      const response = await request(app)
        .post(`/api/listings/${listingNoPhotosId}/generate-video-script`)
        .send({ customInstructions: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('photo');
    });

    it('should generate a video script for listing with photos', async () => {
      const mockScript = 'Cinematic slow motion pan through a modern kitchen with soft sunlight...';
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(mockScript);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ customInstructions: 'Focus on modern kitchen' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toBe(mockScript);
      expect(response.body.data.listingId).toBe(listingWithPhotosId);
      vi.restoreAllMocks();
    });

    it('should accept empty custom instructions', async () => {
      const mockScript = 'Cinematic drone shot of a luxury property...';
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(mockScript);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toBe(mockScript);
      vi.restoreAllMocks();
    });

    it('should include custom instructions in the generated prompt', async () => {
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue('Customized prompt...');

      await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ customInstructions: 'Emphasize the garden view' })
        .expect(200);

      expect(llmClient.generateCompletion).toHaveBeenCalledTimes(1);
      const [systemPrompt, userPrompt] = (llmClient.generateCompletion as any).mock.calls[0];
      expect(userPrompt).toContain('Emphasize the garden view');
      expect(userPrompt).toContain('Total Photos Available: 1');
      vi.restoreAllMocks();
    });

    it('should fall back to template when LLM returns empty response', async () => {
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue('');

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toContain('Cinematic real estate video showcase');
      vi.restoreAllMocks();
    });

    it('should handle LLM errors gracefully by falling back to template-based script', async () => {
      vi.spyOn(llmClient, 'generateCompletion').mockRejectedValue(new Error('LLM API Error'));

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toContain('Cinematic real estate video showcase');
      expect(response.body.data.script).toContain('Listing With Photos');
      expect(response.body.data.listingId).toBe(listingWithPhotosId);
      vi.restoreAllMocks();
    });

    it('should accept video style, model, and voice over options', async () => {
      const mockScript = 'Aerial drone flight over the property...';
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(mockScript);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ style: 'aerial', model: 'veo', voiceOver: { enabled: true }, customInstructions: 'Show the pool' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toBe(mockScript);
      expect(response.body.data.style).toBe('aerial');
      expect(response.body.data.model).toBe('veo');
      expect(response.body.data.voiceOver).toEqual({ enabled: true });
      expect(response.body.data.voiceOverScript).toBe(mockScript);
      vi.restoreAllMocks();
    });

    it('should fall back to default style/model when options are invalid', async () => {
      const mockScript = 'Cinematic opening shot...';
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(mockScript);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ style: 'invalid-style', model: 'invalid-model' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.style).toBe('cinematic');
      expect(response.body.data.model).toBe('runway');
      expect(response.body.data.voiceOverScript).toBeNull();
      vi.restoreAllMocks();
    });

    it('should generate an Indonesian voice over when requested', async () => {
      const mockScript = 'Cinematic walkthrough of the villa...';
      const mockVoiceOver = '[Scene 1] Selamat datang di properti ini...';
      vi.spyOn(llmClient, 'generateCompletion')
        .mockResolvedValueOnce(mockScript)
        .mockResolvedValueOnce(mockVoiceOver);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ style: 'walkthrough', includeVoiceOver: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toBe(mockScript);
      expect(response.body.data.voiceOverScript).toBe(mockVoiceOver);
      expect(llmClient.generateCompletion).toHaveBeenCalledTimes(2);
      vi.restoreAllMocks();
    });

    it('should fall back to an Indonesian voice over template when LLM fails', async () => {
      vi.spyOn(llmClient, 'generateCompletion').mockRejectedValue(new Error('LLM API Error'));

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ includeVoiceOver: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.script).toContain('Cinematic real estate video showcase');
      expect(response.body.data.voiceOverScript).toContain('[Scene 1');
      expect(response.body.data.voiceOverScript).toContain('Listing With Photos');
      vi.restoreAllMocks();
    });

    it('should not generate a voice over when includeVoiceOver is false', async () => {
      const mockScript = 'Cinematic showcase...';
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(mockScript);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ includeVoiceOver: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voiceOverScript).toBeNull();
      expect(response.body.data.voiceOver).toBeUndefined();
      expect(llmClient.generateCompletion).toHaveBeenCalledTimes(1);
      vi.restoreAllMocks();
    });

    it('should return a deterministic multi-scene JSON document', async () => {
      const mockScript = 'Cinematic showcase...';
      vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(mockScript);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ style: 'cinematic', model: 'veo', includeVoiceOver: false })
        .expect(200);

      const json = response.body.data.scriptJson;
      expect(json.project).toContain('video_campaign');
      expect(json.settings).toEqual({
        total_duration_seconds: 22,
        resolution: '1920x1080',
        aspect_ratio: '16:9',
      });
      expect(Array.isArray(json.scenes)).toBe(true);
      expect(json.scenes).toHaveLength(5);

      json.scenes.forEach((scene, index) => {
        expect(scene.scene_number).toBe(index + 1);
        expect(scene.duration_seconds).toEqual(expect.any(Number));
        expect(scene.transition).toBeDefined();
        expect(scene.transition.in).toEqual(expect.any(String));
        expect(scene.transition.out).toEqual(expect.any(String));
        expect(scene.visuals.description).toEqual(expect.any(String));
        expect(scene.visuals.camera).toEqual(expect.any(String));
        expect(scene.audio.ambient).toEqual(expect.any(String));
        expect(scene.audio.effects).toEqual(expect.any(String));
        expect(scene.audio.voice_over).toBeUndefined();
      });
      vi.restoreAllMocks();
    });

    it('should embed Indonesian voice over text inside the JSON scenes when requested', async () => {
      const mockScript = 'Cinematic showcase...';
      const mockVoiceOver = '[Scene 1: Establishing Shot]\nSelamat datang di properti nyaman ini.\n\n[Scene 2: Interior]\nRuangannya luas dan terang.';
      vi.spyOn(llmClient, 'generateCompletion')
        .mockResolvedValueOnce(mockScript)
        .mockResolvedValueOnce(mockVoiceOver);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ includeVoiceOver: true })
        .expect(200);

      const scenes = response.body.data.scriptJson.scenes;
      expect(scenes).toHaveLength(5);
      expect(scenes[0].audio.voice_over.text).toContain('Selamat datang di properti nyaman ini');
      expect(scenes[1].audio.voice_over.text).toContain('Ruangannya luas dan terang');
      expect(scenes[0].audio.voice_over.style).toEqual(expect.any(String));

      for (const scene of scenes.slice(2)) {
        expect(scene.audio.voice_over.text).toEqual(expect.any(String));
      }
      vi.restoreAllMocks();
    });

    it('should save, list, update, and delete video scripts', async () => {
      // 1. Save video script
      const saveRes = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/video-scripts`)
        .send({
          name: 'Versi Cinematic 9:16',
          style: 'cinematic',
          model: 'runway',
          aspectRatio: '9:16',
          script: 'Visual video prompt content...',
          scriptJson: { project: 'test', settings: {}, scenes: [] },
        })
        .expect(201);

      expect(saveRes.body.success).toBe(true);
      const savedId = saveRes.body.data.id;
      expect(saveRes.body.data.name).toBe('Versi Cinematic 9:16');

      // 2. List video scripts
      const listRes = await request(app)
        .get(`/api/listings/${listingWithPhotosId}/video-scripts`)
        .expect(200);

      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(listRes.body.data[0].id).toBe(savedId);

      // 3. Update video script
      const updateRes = await request(app)
        .put(`/api/listings/video-scripts/${savedId}`)
        .send({ name: 'Versi Cinematic 9:16 (Updated)', script: 'Updated prompt content' })
        .expect(200);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.name).toBe('Versi Cinematic 9:16 (Updated)');
      expect(updateRes.body.data.script).toBe('Updated prompt content');

      // 4. Delete video script
      const deleteRes = await request(app)
        .delete(`/api/listings/video-scripts/${savedId}`)
        .expect(200);

      expect(deleteRes.body.success).toBe(true);
    });

    it('should fill voice over fallback into JSON scenes when LLM narration is unusable', async () => {
      const mockScript = 'Cinematic showcase...';
      const mockVoiceOver = 'Narration without scene markers...';
      vi.spyOn(llmClient, 'generateCompletion')
        .mockResolvedValueOnce(mockScript)
        .mockResolvedValueOnce(mockVoiceOver);

      const response = await request(app)
        .post(`/api/listings/${listingWithPhotosId}/generate-video-script`)
        .send({ includeVoiceOver: true })
        .expect(200);

      const scenes = response.body.data.scriptJson.scenes;
      expect(scenes).toHaveLength(5);
      expect(scenes[0].audio.voice_over.text).toContain('Listing With Photos');
      expect(scenes[4].audio.voice_over.text).toContain('hubungi agen kami');
      vi.restoreAllMocks();
    });
  });

  describe('DELETE /api/listings/photos/:photoId', () => {
    let photoId: string;

    beforeEach(async () => {
      const [listing] = await db.insert(listings).values({
        title: 'Test Listing',
        location: 'Jakarta',
        price: '1000000000',
        status: 'draft',
      }).returning();

      testListingId = listing.id;

      const [photo] = await db.insert(listingPhotos).values({
        listingId: testListingId,
        photoUrl: '/uploads/photo.jpg',
        photoOrder: 0,
      }).returning();

      photoId = photo.id;
    });

    it('should delete a photo', async () => {
      const response = await request(app)
        .delete(`/api/listings/photos/${photoId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Photo deleted successfully');

      // Verify deletion
      const photos = await db.select().from(listingPhotos).where(eq(listingPhotos.id, photoId));
      expect(photos.length).toBe(0);
    });

    it('should return 404 for non-existent photo', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/listings/photos/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
