CREATE TABLE IF NOT EXISTS "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"num" integer NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resource_groups" (
	"resource_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "resource_groups_resource_id_group_id_pk" PRIMARY KEY("resource_id","group_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_groups" ADD CONSTRAINT "resource_groups_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_groups" ADD CONSTRAINT "resource_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
