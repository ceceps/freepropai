import { pgTable, uuid, varchar, text, integer, boolean, timestamp, date, jsonb, bigint, char } from 'drizzle-orm/pg-core';

/**
 * Read-only mirror of the `freepropai_db` pipeline tables.
 * Definitions exist only so the pipeline connection can run typed SELECTs.
 */
export const sources = pgTable('sources', {
  id: integer('id').primaryKey(),
  code: varchar('code').notNull(),
  name: varchar('name').notNull(),
  baseUrl: text('base_url').notNull(),
  pagingPattern: text('paging_pattern'),
  detailSelector: text('detail_selector'),
  isActive: boolean('is_active').default(true),
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
  lastStatus: varchar('last_status'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastScrapedPage: integer('last_scraped_page').default(0),
  lastScrapeMode: varchar('last_scrape_mode').default('incremental'),
});

export const pipelineListings = pgTable('listings', {
  id: uuid('id').primaryKey(),
  sourceId: integer('source_id'),
  sourceUrl: text('source_url').notNull(),
  contentHash: char('content_hash').notNull(),
  title: varchar('title'),
  propertyType: varchar('property_type'),
  address: jsonb('address'),
  coordinates: jsonb('coordinates'),
  price: bigint('price', { mode: 'number' }),
  pricePerM2: bigint('price_per_m2', { mode: 'number' }),
  lb: integer('lb'),
  lt: integer('lt'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  garage: integer('garage'),
  floors: integer('floors'),
  certificate: varchar('certificate'),
  description: text('description'),
  features: text('features').array(),
  photos: text('photos').array(),
  featureImage: text('feature_image'),
  videoUrl: text('video_url'),
  agentName: varchar('agent_name'),
  agentPhone: varchar('agent_phone'),
  agency: varchar('agency'),
  status: varchar('status').default('active'),
  isActive: boolean('is_active').default(true),
  scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  marketStatus: varchar('market_status').default('UNKNOWN'),
  listingPage: integer('listing_page'),
  photoLabels: jsonb('photo_labels'),
});

export const analisaListing = pgTable('analisa_listing', {
  id: uuid('id').primaryKey(),
  listingId: uuid('listing_id'),
  buyerPersona: text('buyer_persona'),
  sellingPoints: text('selling_points'),
  fullAnalysisMarkdown: text('full_analysis_markdown'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const promoContent = pgTable('promo_content', {
  id: uuid('id').primaryKey(),
  listingId: uuid('listing_id'),
  dayNum: integer('day_num').notNull(),
  seqNum: integer('seq_num').notNull(),
  angle: varchar('angle'),
  posterSpec: jsonb('poster_spec'),
  captionHpsc: text('caption_hpsc'),
  videoScript: text('video_script'),
  videoMeta: jsonb('video_meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const contentCalendar = pgTable('content_calendar', {
  id: uuid('id').primaryKey(),
  listingId: uuid('listing_id'),
  date: date('date').notNull(),
  platform: varchar('platform').notNull(),
  contentType: varchar('content_type').notNull(),
  hook: text('hook'),
  captionDraft: text('caption_draft'),
  assetFiles: text('asset_files').array(),
  disclosureTags: text('disclosure_tags').array(),
  approvalStatus: varchar('approval_status').default('pending'),
  approvedBy: varchar('approved_by'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  performanceJson: jsonb('performance_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey(),
  gender: varchar('gender').notNull().default('man'),
  fullName: varchar('full_name').notNull(),
  dateBirth: date('date_birth'),
  martialStatus: varchar('martial_status'),
  shortname: varchar('shortname').notNull(),
  phone: varchar('phone'),
  wa: varchar('wa'),
  ig: varchar('ig'),
});
