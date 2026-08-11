import { pgTable, uuid, varchar, decimal, timestamp, text, integer, boolean, check, uniqueIndex, index, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull().default('solo_agent'),
  regionScope: varchar('region_scope', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  lastLoginAt: timestamp('last_login_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
}));

// Teams table
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  brandName: varchar('brand_name', { length: 255 }),
  brandLogoUrl: varchar('brand_logo_url', { length: 500 }),
  brandColor: varchar('brand_color', { length: 7 }),
  brandTagline: text('brand_tagline'),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index('teams_owner_idx').on(table.ownerId),
}));

// Team members join table
export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('agent'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  uniqueTeamUser: uniqueIndex('team_members_team_user_idx').on(table.teamId, table.userId),
  teamIdx: index('team_members_team_idx').on(table.teamId),
  userIdx: index('team_members_user_idx').on(table.userId),
}));

// Leads table
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  budgetMin: decimal('budget_min', { precision: 15, scale: 2 }),
  budgetMax: decimal('budget_max', { precision: 15, scale: 2 }),
  location: varchar('location', { length: 255 }),
  unitType: varchar('unit_type', { length: 100 }),
  urgency: varchar('urgency', { length: 20 }),
  score: varchar('score', { length: 10 }),
  rawChatText: text('raw_chat_text'),
  extractedAt: timestamp('extracted_at').defaultNow(),
  lastContactAt: timestamp('last_contact_at'),
  status: varchar('status', { length: 50 }).default('new'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  urgencyCheck: check('urgency_check', sql`${table.urgency} IN ('immediate', 'soon', 'flexible')`),
  scoreCheck: check('score_check', sql`${table.score} IN ('Hot', 'Warm', 'Cold')`),
}));

// Follow-ups table
export const followUps = pgTable('follow_ups', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  messageDraft: text('message_draft').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  generatedAt: timestamp('generated_at').defaultNow(),
  approvedAt: timestamp('approved_at'),
  approvedBy: varchar('approved_by', { length: 255 }),
  sentAt: timestamp('sent_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusCheck: check('status_check', sql`${table.status} IN ('pending', 'approved', 'rejected', 'sent')`),
}));

// Listings table
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  landArea: decimal('land_area', { precision: 10, scale: 2 }),
  buildingArea: decimal('building_area', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 255 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  propertyType: varchar('property_type', { length: 100 }),
  region: varchar('region', { length: 100 }),
  sourceUrl: varchar('source_url', { length: 500 }),
  additionalInfo: text('additional_info'),
  status: varchar('status', { length: 50 }).default('draft'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Listing photos table
export const listingPhotos = pgTable('listing_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  photoUrl: varchar('photo_url', { length: 500 }).notNull(),
  photoOrder: integer('photo_order').default(0),
  isFeatured: boolean('is_featured').default(false),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// Listing descriptions table
export const listingDescriptions = pgTable('listing_descriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  variantType: varchar('variant_type', { length: 50 }),
  descriptionText: text('description_text').notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
  isSelected: boolean('is_selected').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  variantCheck: check('variant_check', sql`${table.variantType} IN ('formal', 'casual_1', 'casual_2')`),
}));

// Scraping jobs table
export const scrapingJobs = pgTable('scraping_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceUrl: varchar('source_url', { length: 500 }).notNull(),
  sourceName: varchar('source_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  totalListingsFound: integer('total_listings_found').default(0),
  totalListingsImported: integer('total_listings_imported').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusCheck: check('status_check', sql`${table.status} IN ('pending', 'running', 'completed', 'failed')`),
  statusIdx: index('idx_scraping_jobs_status').on(table.status),
  sourceIdx: index('idx_scraping_jobs_source').on(table.sourceName),
  createdIdx: index('idx_scraping_jobs_created').on(table.createdAt),
}));

// Scraped listings table
export const scrapedListings = pgTable('scraped_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  scrapingJobId: uuid('scraping_job_id').notNull().references(() => scrapingJobs.id, { onDelete: 'cascade' }),
  sourceUrl: varchar('source_url', { length: 500 }).notNull(),
  sourceId: varchar('source_id', { length: 255 }),
  title: varchar('title', { length: 255 }).notNull(),
  landArea: decimal('land_area', { precision: 10, scale: 2 }),
  buildingArea: decimal('building_area', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 255 }),
  price: decimal('price', { precision: 15, scale: 2 }),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  propertyType: varchar('property_type', { length: 100 }),
  region: varchar('region', { length: 100 }),
  description: text('description'),
  imageUrls: text('image_urls').array(),
  contactInfo: jsonb('contact_info'),
  rawData: jsonb('raw_data'),
  importStatus: varchar('import_status', { length: 50 }).default('pending'),
  importedListingId: uuid('imported_listing_id').references(() => listings.id),
  importedAt: timestamp('imported_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  importStatusCheck: check('import_status_check', sql`${table.importStatus} IN ('pending', 'imported', 'skipped', 'failed')`),
  jobIdx: index('idx_scraped_listings_job').on(table.scrapingJobId),
  importStatusIdx: index('idx_scraped_listings_import_status').on(table.importStatus),
  sourceIdIdx: index('idx_scraped_listings_source_id').on(table.sourceId),
}));

// Scraping configs table
export const scrapingConfigs = pgTable('scraping_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceName: varchar('source_name', { length: 100 }).notNull().unique(),
  baseUrl: varchar('base_url', { length: 500 }).notNull(),
  isActive: boolean('is_active').default(true),
  scrapingPrompt: text('scraping_prompt').notNull(),
  fieldMappings: jsonb('field_mappings').notNull(),
  rateLimitDelay: integer('rate_limit_delay').default(2000),
  maxPages: integer('max_pages').default(10),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sourceIdx: index('idx_scraping_configs_source').on(table.sourceName),
  activeIdx: index('idx_scraping_configs_active').on(table.isActive),
}));
