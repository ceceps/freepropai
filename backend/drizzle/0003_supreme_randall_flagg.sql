CREATE TABLE "scraped_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scraping_job_id" uuid NOT NULL,
	"source_url" varchar(500) NOT NULL,
	"source_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"land_area" numeric(10, 2),
	"building_area" numeric(10, 2),
	"location" varchar(255),
	"price" numeric(15, 2),
	"bedrooms" integer,
	"bathrooms" integer,
	"property_type" varchar(100),
	"region" varchar(100),
	"description" text,
	"image_urls" text[],
	"contact_info" jsonb,
	"raw_data" jsonb,
	"import_status" varchar(50) DEFAULT 'pending',
	"imported_listing_id" uuid,
	"imported_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "import_status_check" CHECK ("scraped_listings"."import_status" IN ('pending', 'imported', 'skipped', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "scraping_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"base_url" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT true,
	"scraping_prompt" text NOT NULL,
	"field_mappings" jsonb NOT NULL,
	"rate_limit_delay" integer DEFAULT 2000,
	"max_pages" integer DEFAULT 10,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scraping_configs_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE "scraping_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_url" varchar(500) NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"total_listings_found" integer DEFAULT 0,
	"total_listings_imported" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "status_check" CHECK ("scraping_jobs"."status" IN ('pending', 'running', 'completed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "source_url" varchar(500);--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD CONSTRAINT "scraped_listings_scraping_job_id_scraping_jobs_id_fk" FOREIGN KEY ("scraping_job_id") REFERENCES "public"."scraping_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD CONSTRAINT "scraped_listings_imported_listing_id_listings_id_fk" FOREIGN KEY ("imported_listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scraped_listings_job" ON "scraped_listings" USING btree ("scraping_job_id");--> statement-breakpoint
CREATE INDEX "idx_scraped_listings_import_status" ON "scraped_listings" USING btree ("import_status");--> statement-breakpoint
CREATE INDEX "idx_scraped_listings_source_id" ON "scraped_listings" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_scraping_configs_source" ON "scraping_configs" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX "idx_scraping_configs_active" ON "scraping_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_scraping_jobs_status" ON "scraping_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scraping_jobs_source" ON "scraping_jobs" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX "idx_scraping_jobs_created" ON "scraping_jobs" USING btree ("created_at");