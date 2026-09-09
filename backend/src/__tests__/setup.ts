import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Setup before all tests
beforeAll(async () => {
  console.log('🧪 Test setup: Connecting to database...');
});

// Cleanup after each test using TRUNCATE CASCADE
afterEach(async () => {
  try {
    await db.execute(sql`TRUNCATE TABLE follow_ups, leads, listing_descriptions, listing_photos, listing_video_prompts, scraped_listings, scraping_jobs, listings CASCADE;`);
  } catch (err) {
    try {
      await db.execute(sql`TRUNCATE TABLE listings CASCADE;`);
    } catch (e) {}
  }
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧪 Test teardown: Cleaning up...');
});
