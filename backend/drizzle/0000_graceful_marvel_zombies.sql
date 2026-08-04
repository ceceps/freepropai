CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"message_draft" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"generated_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"approved_by" varchar(255),
	"sent_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "status_check" CHECK ("follow_ups"."status" IN ('pending', 'approved', 'rejected', 'sent'))
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"budget_min" numeric(15, 2),
	"budget_max" numeric(15, 2),
	"location" varchar(255),
	"unit_type" varchar(100),
	"urgency" varchar(20),
	"score" varchar(10),
	"raw_chat_text" text,
	"extracted_at" timestamp DEFAULT now(),
	"last_contact_at" timestamp,
	"status" varchar(50) DEFAULT 'new',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "urgency_check" CHECK ("leads"."urgency" IN ('immediate', 'soon', 'flexible')),
	CONSTRAINT "score_check" CHECK ("leads"."score" IN ('Hot', 'Warm', 'Cold'))
);
--> statement-breakpoint
CREATE TABLE "listing_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"variant_type" varchar(50),
	"description_text" text NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"is_selected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "variant_check" CHECK ("listing_descriptions"."variant_type" IN ('formal', 'casual_1', 'casual_2'))
);
--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"photo_url" varchar(500) NOT NULL,
	"photo_order" integer DEFAULT 0,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"land_area" numeric(10, 2),
	"building_area" numeric(10, 2),
	"location" varchar(255) NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"property_type" varchar(100),
	"additional_info" text,
	"status" varchar(50) DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_descriptions" ADD CONSTRAINT "listing_descriptions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;