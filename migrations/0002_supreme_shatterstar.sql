CREATE TABLE IF NOT EXISTS "resource_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"reason" text,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"block_type" varchar NOT NULL,
	"recurring" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resource_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"day_of_week" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_facilities" DROP CONSTRAINT "resource_facilities_resource_id_resources_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_rules" DROP CONSTRAINT "resource_rules_resource_id_resources_id_fk";
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "schedule_type" varchar NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_blocks" ADD CONSTRAINT "resource_blocks_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_schedules" ADD CONSTRAINT "resource_schedules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_day_of_week" ON "resource_schedules" USING btree ("resource_id","day_of_week");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_facilities" ADD CONSTRAINT "resource_facilities_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_rules" ADD CONSTRAINT "resource_rules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "rating";--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "address";