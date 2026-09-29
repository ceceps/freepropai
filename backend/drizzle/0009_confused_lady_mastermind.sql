ALTER TABLE "listings" ADD COLUMN "certificate" varchar(100);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "floors" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "garage" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "features" text[];--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "nearby_places" text[];--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "road_access" varchar(255);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "electricity" varchar(100);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "water_source" varchar(100);--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "certificate" varchar(100);--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "floors" integer;--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "garage" integer;--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "features" text[];--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "nearby_places" text[];--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "road_access" varchar(255);--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "electricity" varchar(100);--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "water_source" varchar(100);
