ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7);
