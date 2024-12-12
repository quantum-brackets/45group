ALTER TABLE "rules" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_name_unique" UNIQUE("name");