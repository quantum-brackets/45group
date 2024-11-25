ALTER TABLE "otps" RENAME COLUMN "user_email" TO "email";--> statement-breakpoint
ALTER TABLE "otps" DROP CONSTRAINT "otps_user_email_users_email_fk";
