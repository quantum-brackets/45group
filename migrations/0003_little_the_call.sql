ALTER TABLE "medias" RENAME COLUMN "type" TO "mime_type";--> statement-breakpoint
ALTER TABLE "medias" ALTER COLUMN "mime_type" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "medias" ALTER COLUMN "mime_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "medias" ADD COLUMN "size" integer;--> statement-breakpoint
ALTER TABLE "medias" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "medias" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "medias" ADD COLUMN "resource_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medias" ADD CONSTRAINT "medias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medias" ADD CONSTRAINT "medias_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medias" ADD CONSTRAINT "medias_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "medias" DROP COLUMN IF EXISTS "file_type";--> statement-breakpoint
ALTER TABLE "medias" DROP COLUMN IF EXISTS "entity_type";--> statement-breakpoint
ALTER TABLE "medias" DROP COLUMN IF EXISTS "entity_id";