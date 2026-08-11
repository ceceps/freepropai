ALTER TABLE "listings" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "source_url" varchar(500);--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD COLUMN "region" varchar(100);