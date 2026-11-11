ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "portrait_photo_url" varchar(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fullbody_photo_url" varchar(500);
