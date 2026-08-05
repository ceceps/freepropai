# Database Migration Instructions

## Apply the deletedAt Column Migration

A new migration has been generated to add soft delete functionality to the listings table.

### Migration File
Location: `drizzle/0001_wet_king_cobra.sql`

### SQL to Execute
```sql
ALTER TABLE "listings" ADD COLUMN "deleted_at" timestamp;
```

### How to Apply

#### Option 1: Using psql command line
```bash
cd backend
psql -h localhost -p 5432 -U your_username -d freepropai -f drizzle/0001_wet_king_cobra.sql
```

#### Option 2: Using your database client
Connect to your PostgreSQL database and run:
```sql
ALTER TABLE "listings" ADD COLUMN "deleted_at" timestamp;
```

#### Option 3: Using Drizzle Kit (if database is running)
```bash
cd backend
bun run drizzle-kit push
```

### Verify Migration
After applying the migration, verify it was successful:
```sql
\d listings
```

You should see the `deleted_at` column in the listings table.

## What Changed

### Backend Changes
1. **Schema** (`src/db/schema.ts`): Added `deletedAt` timestamp field to listings table
2. **Model** (`src/models/Listing.ts`): 
   - Updated `delete()` method to perform soft delete (sets deletedAt instead of removing record)
   - Updated `findAll()` and `findById()` to exclude soft-deleted listings
3. **Routes** (`src/routes/listing.routes.ts`): Already had PATCH and DELETE endpoints

### Frontend Changes
1. **ListingsPage** (`frontend/src/pages/ListingsPage.tsx`):
   - Added Edit and Delete buttons to listing cards
   - Added Edit and Delete buttons to detail view
   - Implemented edit mode with form pre-population
   - Added image placeholder when no photos exist
   - Added proper image display with fallback for missing images

2. **ListingForm** (`frontend/src/components/listings/ListingForm.tsx`):
   - Added support for edit mode with `initialData` and `isEditMode` props
   - Pre-populates form fields when editing
   - Shows existing photos with ability to remove them
   - Shows placeholder when no photos exist
   - Distinguishes between existing and new photos

## Features Added

✅ **EDIT**: Click "Edit" button on any listing to modify its details
✅ **DELETE**: Click "Delete" button to soft delete a listing (with confirmation)
✅ **Image Placeholder**: Shows placeholder when no images are uploaded
✅ **Image Display**: Displays actual images with fallback for broken/missing images
