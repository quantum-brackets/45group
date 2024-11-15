CREATE TABLE IF NOT EXISTS "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"description" varchar,
	"resource_id" uuid NOT NULL,
	"status" varchar,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blacklisted_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"blacklisted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"check_in_date" timestamp,
	"check_out_date" timestamp,
	"status" varchar,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"description" varchar,
	"status" varchar NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lodges_facilities" (
	"lodge_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "lodges_facilities_lodge_id_facility_id_pk" PRIMARY KEY("lodge_id","facility_id")
);
--> statement-breakpoint
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
	"resource_id" uuid NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" varchar NOT NULL,
	"hashed_otp" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"image" varchar,
	"email" varchar(320) NOT NULL,
	"phone" varchar(256),
	"is_verified" boolean DEFAULT false,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	"complete_profile" boolean DEFAULT false,
	"metadata" json,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability" ADD CONSTRAINT "availability_resource_id_lodges_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."lodges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_lodges_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."lodges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lodges_facilities" ADD CONSTRAINT "lodges_facilities_lodge_id_lodges_id_fk" FOREIGN KEY ("lodge_id") REFERENCES "public"."lodges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lodges_facilities" ADD CONSTRAINT "lodges_facilities_facility_id_rules_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
 ALTER TABLE "medias" ADD CONSTRAINT "medias_resource_id_lodges_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."lodges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otps" ADD CONSTRAINT "otps_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;
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
