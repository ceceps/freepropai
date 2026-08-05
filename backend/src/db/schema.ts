import { pgTable, uuid, varchar, decimal, timestamp, text, integer, boolean, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
  title: varchar('title', { length: 255 }).notNull(),
  landArea: decimal('land_area', { precision: 10, scale: 2 }),
  buildingArea: decimal('building_area', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 255 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  propertyType: varchar('property_type', { length: 100 }),
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
