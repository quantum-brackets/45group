CREATE TABLE IF NOT EXISTS "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" varchar,
	"hashed_otp" varchar(64),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otps" ADD CONSTRAINT "otps_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
