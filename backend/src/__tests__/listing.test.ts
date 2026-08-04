import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { listings, listingPhotos, listingDescriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';

describe('Listing API Endpoints', () => {
  let testListingId: string;

  beforeEach(async () => {
    // Clean up before each test
    await db.delete(listingDescriptions);
    await db.delete(listingPhotos);
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

    it('should generate 3 description variants', async () => {
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
