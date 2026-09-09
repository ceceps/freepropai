ALTER TABLE "listing_video_prompts" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_video_prompts" ADD COLUMN "aspect_ratio" varchar(10) DEFAULT '16:9' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_video_prompts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;