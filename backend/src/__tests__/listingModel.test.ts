import { describe, it, expect, beforeEach } from 'vitest';
import ListingModel from '../models/Listing';
import { db } from '../db';
import { listings, listingPhotos, listingDescriptions } from '../db/schema';

describe('ListingModel Unit Tests', () => {
  beforeEach(async () => {
    // Clean up tables before each test
    await db.delete(listingDescriptions);
    await db.delete(listingPhotos);
    await db.delete(listings);
  });

  describe('findById & findByIdWithDetails', () => {
    it('should return the correct listing matching the exact requested ID when multiple listings exist', async () => {
      // Insert multiple listings into the database
      const listing1 = await ListingModel.create({
        title: 'Listing One - Rumah BSD',
        location: 'BSD City',
        price: 1000000000,
        bedrooms: 3,
        bathrooms: 2,
        propertyType: 'rumah',
      });

      const listing2 = await ListingModel.create({
        title: 'Listing Two - Apartemen Kuningan',
        location: 'Jakarta Selatan',
        price: 850000000,
        bedrooms: 1,
        bathrooms: 1,
        propertyType: 'apartemen',
      });

      const listing3 = await ListingModel.create({
        title: 'Listing Three - Ruko Bintaro',
        location: 'Bintaro',
        price: 2500000000,
        bedrooms: 4,
        bathrooms: 3,
        propertyType: 'ruko',
      });

      // Verify findById returns exact listing for listing1.id
      const found1 = await ListingModel.findById(listing1.id);
      expect(found1).not.toBeNull();
      expect(found1?.id).toBe(listing1.id);
      expect(found1?.title).toBe('Listing One - Rumah BSD');
      expect(found1?.location).toBe('BSD City');

      // Verify findById returns exact listing for listing2.id
      const found2 = await ListingModel.findById(listing2.id);
      expect(found2).not.toBeNull();
      expect(found2?.id).toBe(listing2.id);
      expect(found2?.title).toBe('Listing Two - Apartemen Kuningan');
      expect(found2?.location).toBe('Jakarta Selatan');

      // Verify findById returns exact listing for listing3.id
      const found3 = await ListingModel.findById(listing3.id);
      expect(found3).not.toBeNull();
      expect(found3?.id).toBe(listing3.id);
      expect(found3?.title).toBe('Listing Three - Ruko Bintaro');
      expect(found3?.location).toBe('Bintaro');
    });

    it('should return listing details with photos and descriptions for the requested ID', async () => {
      const listing = await ListingModel.create({
        title: 'Detailed Villa Lembang',
        location: 'Lembang, Bandung',
        price: 3000000000,
        propertyType: 'villa',
      });

      await ListingModel.addPhoto(listing.id, '/uploads/villa1.jpg', 0);
      await ListingModel.addDescription(listing.id, 'formal', 'Formal villa description');

      const details = await ListingModel.findByIdWithDetails(listing.id);
      expect(details).not.toBeNull();
      expect(details?.id).toBe(listing.id);
      expect(details?.title).toBe('Detailed Villa Lembang');
      expect(details?.photos.length).toBe(1);
      expect(details?.photos[0].photo_url).toBe('/uploads/villa1.jpg');
      expect(details?.descriptions.length).toBe(1);
      expect(details?.descriptions[0].variant_type).toBe('formal');
    });

    it('should return null when searching for non-existent ID or soft-deleted listing', async () => {
      const listing = await ListingModel.create({
        title: 'Temporary Listing',
        location: 'Bandung',
        price: 500000000,
      });

      // Soft delete listing
      await ListingModel.delete(listing.id);

      const found = await ListingModel.findById(listing.id);
      expect(found).toBeNull();
    });
  });
});
