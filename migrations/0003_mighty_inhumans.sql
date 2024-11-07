CREATE TABLE IF NOT EXISTS "lodges_rules" (
	"lodge_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "lodges_rules_lodge_id_rule_id_pk" PRIMARY KEY("lodge_id","rule_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lodges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"location" varchar(300) NOT NULL,
	"description" varchar NOT NULL,
	"status" varchar DEFAULT 'draft',
	"thumbnail" varchar NOT NULL,
	"rating" numeric,
	"address" varchar,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" varchar NOT NULL,
	"type" varchar NOT NULL,
	"file_type" varchar NOT NULL,
	"lodge_id" uuid NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" numeric,
	"currency_code" varchar,
	"region_id" uuid NOT NULL,
	"lodge_id" uuid NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"currency_code" varchar NOT NULL,
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" varchar,
	"category" varchar,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "otps" ALTER COLUMN "user_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "otps" ALTER COLUMN "hashed_otp" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lodges_rules" ADD CONSTRAINT "lodges_rules_lodge_id_lodges_id_fk" FOREIGN KEY ("lodge_id") REFERENCES "public"."lodges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lodges_rules" ADD CONSTRAINT "lodges_rules_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices" ADD CONSTRAINT "prices_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices" ADD CONSTRAINT "prices_lodge_id_lodges_id_fk" FOREIGN KEY ("lodge_id") REFERENCES "public"."lodges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
