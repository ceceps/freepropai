CREATE TABLE "listing_video_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"style" varchar(50) NOT NULL,
	"model" varchar(50) NOT NULL,
	"custom_instructions" text,
	"include_voice_over" boolean DEFAULT false NOT NULL,
	"voice_gender" varchar(20),
	"voice_age" varchar(20),
	"voice_language" varchar(10),
	"script" text NOT NULL,
	"voice_over_script" text,
	"script_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scraped_listings" DROP CONSTRAINT "scraped_listings_imported_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "listing_video_prompts" ADD CONSTRAINT "listing_video_prompts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_video_prompts_listing" ON "listing_video_prompts" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_video_prompts_created" ON "listing_video_prompts" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "scraped_listings" ADD CONSTRAINT "scraped_listings_imported_listing_id_listings_id_fk" FOREIGN KEY ("imported_listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;