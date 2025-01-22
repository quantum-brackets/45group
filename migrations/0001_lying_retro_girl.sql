ALTER TABLE "medias" DROP CONSTRAINT "medias_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "medias" DROP CONSTRAINT "medias_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "medias" DROP CONSTRAINT "medias_resource_id_resources_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medias" ADD CONSTRAINT "medias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medias" ADD CONSTRAINT "medias_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medias" ADD CONSTRAINT "medias_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN IF EXISTS "num";