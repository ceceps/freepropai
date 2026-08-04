import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../db';
import { listings, listingPhotos, listingDescriptions } from '../db/schema';

// Setup before all tests
beforeAll(async () => {
  console.log('🧪 Test setup: Connecting to database...');
});

// Cleanup after each test
afterEach(async () => {
  // Clean up test data
  await db.delete(listingDescriptions);
  await db.delete(listingPhotos);
  await db.delete(listings);
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧪 Test teardown: Cleaning up...');
});
