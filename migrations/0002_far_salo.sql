ALTER TABLE "facilities" ADD COLUMN "name" varchar(150) NOT NULL;--> statement-breakpoint
ALTER TABLE "facilities" DROP COLUMN IF EXISTS "start_time";--> statement-breakpoint
ALTER TABLE "facilities" DROP COLUMN IF EXISTS "end_time";--> statement-breakpoint
ALTER TABLE "facilities" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_name_unique" UNIQUE("name");