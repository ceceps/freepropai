ALTER TABLE "listing_descriptions" DROP CONSTRAINT IF EXISTS "variant_check";
UPDATE "listing_descriptions" SET "variant_type" = 'pas' WHERE "variant_type" = 'casual_1';
UPDATE "listing_descriptions" SET "variant_type" = 'short' WHERE "variant_type" = 'casual_2';
ALTER TABLE "listing_descriptions" ADD CONSTRAINT "variant_check" CHECK ("variant_type" IN ('formal', 'pas', 'short'));