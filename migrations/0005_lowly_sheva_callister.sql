CREATE TABLE IF NOT EXISTS "blacklisted_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"blacklisted_at" timestamp NOT NULL
);
