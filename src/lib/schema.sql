-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Types
-- CREATE TYPE "public"."listing_type" AS ENUM ('hotel', 'events', 'restaurant');
-- CREATE TYPE "public"."price_unit_type" AS ENUM ('night', 'hour', 'person');
-- CREATE TYPE "public"."currency_type" AS ENUM ('USD', 'EUR', 'GBP', 'NGN');
-- CREATE TYPE "public"."user_role" AS ENUM ('admin', 'guest', 'staff');
-- CREATE TYPE "public"."user_status" AS ENUM ('active', 'disabled', 'provisional');
-- CREATE TYPE "public"."booking_status" AS ENUM ('Confirmed', 'Pending', 'Cancelled');

-- Drop tables in the correct order to respect dependencies
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.listing_inventory CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Users Table
CREATE TABLE "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "public"."user_role" DEFAULT 'guest'::public.user_role NOT NULL,
    "status" "public"."user_status" DEFAULT 'active'::public.user_status NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);
ALTER TABLE "public"."users" OWNER TO "postgres";
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Listings Table
CREATE TABLE "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."listing_type" NOT NULL,
    "location" "text" NOT NULL,
    "description" "text" NOT NULL,
    "images" "jsonb" NOT NULL,
    "price" real NOT NULL,
    "price_unit" "public"."price_unit_type" NOT NULL,
    "currency" "public"."currency_type" NOT NULL,
    "rating" real DEFAULT '0'::real NOT NULL,
    "reviews" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "features" "jsonb" NOT NULL,
    "max_guests" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."listings" OWNER TO "postgres";
ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;

-- Listing Inventory Table
CREATE TABLE "public"."listing_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    CONSTRAINT "listing_inventory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "listing_inventory_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."listing_inventory" OWNER TO "postgres";
ALTER TABLE "public"."listing_inventory" ENABLE ROW LEVEL SECURITY;

-- Bookings Table
CREATE TABLE "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "inventory_ids" "uuid"[] NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "guests" smallint NOT NULL,
    "status" "public"."booking_status" DEFAULT 'Pending'::public.booking_status NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action_by_user_id" "uuid",
    "action_at" timestamp with time zone,
    "status_message" "text",
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bookings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id"),
    CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
);
ALTER TABLE "public"."bookings" OWNER TO "postgres";
ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;

-- Function to get user role
CREATE OR REPLACE FUNCTION "public"."get_user_role"()
RETURNS "text"
LANGUAGE "sql" SECURITY DEFINER
AS $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'user_role', '')::text;
$$;
ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";

-- Policies for listings
CREATE POLICY "Enable read access for all users" ON "public"."listings"
AS PERMISSIVE FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert for admins" ON "public"."listings"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (get_user_role() = 'admin'::text);

CREATE POLICY "Enable update for admins" ON "public"."listings"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (get_user_role() = 'admin'::text)
WITH CHECK (get_user_role() = 'admin'::text);

CREATE POLICY "Enable delete for admins" ON "public"."listings"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (get_user_role() = 'admin'::text);

-- Policies for listing_inventory
CREATE POLICY "Enable read access for all users" ON "public"."listing_inventory"
AS PERMISSIVE FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert for admins" ON "public"."listing_inventory"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (get_user_role() = 'admin'::text);

CREATE POLICY "Enable update for admins" ON "public"."listing_inventory"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (get_user_role() = 'admin'::text)
WITH CHECK (get_user_role() = 'admin'::text);

CREATE POLICY "Enable delete for admins" ON "public"."listing_inventory"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (get_user_role() = 'admin'::text);

-- Policies for users
CREATE POLICY "Enable select access for admins, staff, and owner" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (((get_user_role() = ANY (ARRAY['admin'::text, 'staff'::text])) OR (( SELECT auth.uid()) = id)));

CREATE POLICY "Enable insert for admins" ON "public"."users"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (get_user_role() = 'admin'::text);

CREATE POLICY "Enable update for admins and owner" ON "public"."users"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING ((get_user_role() = 'admin'::text) OR (( SELECT auth.uid()) = id))
WITH CHECK ((get_user_role() = 'admin'::text) OR (( SELECT auth.uid()) = id));

CREATE POLICY "Enable delete for admins" ON "public"."users"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (get_user_role() = 'admin'::text);

-- Policies for bookings
CREATE POLICY "Users can manage their own bookings" ON "public"."bookings"
AS PERMISSIVE FOR ALL
TO authenticated
USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"))
WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Admins and staff can view all bookings" ON "public"."bookings"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (("get_user_role"() = ANY (ARRAY['admin'::"text", 'staff'::"text"])));

CREATE POLICY "Admins can update and delete any booking" ON "public"."bookings"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (get_user_role() = 'admin'::text)
WITH CHECK (get_user_role() = 'admin'::text);

CREATE POLICY "Admins can delete any booking" ON "public"."bookings"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (get_user_role() = 'admin'::text);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO "public"
AS $$
begin
  insert into public.users (id, name, email, role, status)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    'guest', -- All new signups are guests by default
    'active'
  );

  -- Update user_role claim
  PERFORM set_claim(new.id, 'user_role', 'guest');

  return new;
end;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

-- Trigger for new user creation
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- Function to get filtered listings
DROP FUNCTION IF EXISTS get_filtered_listings(text,listing_type,integer,date,date);
CREATE OR REPLACE FUNCTION get_filtered_listings(
    location_filter TEXT,
    type_filter listing_type,
    guests_filter INT,
    from_date_filter DATE,
    to_date_filter DATE
)
RETURNS SETOF listings
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT l.*
    FROM listings l
    WHERE
        (location_filter IS NULL OR l.location ILIKE '%' || location_filter || '%')
    AND
        (type_filter IS NULL OR l.type = type_filter)
    AND
        (guests_filter IS NULL OR l.max_guests >= guests_filter)
    AND
        (from_date_filter IS NULL OR NOT EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.listing_id = l.id
            AND b.status = 'Confirmed'
            AND (b.start_date, b.end_date) OVERLAPS (from_date_filter, to_date_filter)
            GROUP BY b.listing_id
            HAVING COUNT(DISTINCT b.id) >= (
                SELECT COUNT(*) FROM listing_inventory li WHERE li.listing_id = l.id
            )
        ));
END;
$$;


-- Function to create a listing with inventory
CREATE OR REPLACE FUNCTION create_listing_with_inventory(
    p_name TEXT,
    p_type listing_type,
    p_location TEXT,
    p_description TEXT,
    p_images JSONB,
    p_price REAL,
    p_price_unit price_unit_type,
    p_currency currency_type,
    p_max_guests SMALLINT,
    p_features JSONB,
    p_inventory_count INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id UUID;
BEGIN
    -- Insert the new listing
    INSERT INTO public.listings(name, type, location, description, images, price, price_unit, currency, max_guests, features)
    VALUES (p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features)
    RETURNING id INTO v_listing_id;

    -- Create inventory items
    IF p_inventory_count > 0 THEN
        FOR i IN 1..p_inventory_count LOOP
            INSERT INTO public.listing_inventory(listing_id, name)
            VALUES (v_listing_id, p_name || ' Unit ' || i);
        END LOOP;
    END IF;
END;
$$;


-- Function to update a listing with inventory
CREATE OR REPLACE FUNCTION update_listing_with_inventory(
    p_listing_id UUID,
    p_name TEXT,
    p_type listing_type,
    p_location TEXT,
    p_description TEXT,
    p_price REAL,
    p_price_unit price_unit_type,
    p_currency currency_type,
    p_max_guests SMALLINT,
    p_features JSONB,
    p_images JSONB,
    p_new_inventory_count INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_inventory_count INT;
    v_diff INT;
BEGIN
    -- Update listing details
    UPDATE public.listings
    SET
        name = p_name,
        type = p_type,
        location = p_location,
        description = p_description,
        price = p_price,
        price_unit = p_price_unit,
        currency = p_currency,
        max_guests = p_max_guests,
        features = p_features,
        images = p_images
    WHERE id = p_listing_id;

    -- Get current inventory count
    SELECT COUNT(*) INTO v_current_inventory_count
    FROM public.listing_inventory
    WHERE listing_id = p_listing_id;

    v_diff := p_new_inventory_count - v_current_inventory_count;

    IF v_diff > 0 THEN
        -- Add new inventory units
        FOR i IN 1..v_diff LOOP
            INSERT INTO public.listing_inventory(listing_id, name)
            VALUES (p_listing_id, p_name || ' Unit ' || (v_current_inventory_count + i));
        END LOOP;
    ELSIF v_diff < 0 THEN
        -- Remove inventory units that are not booked
        DELETE FROM public.listing_inventory
        WHERE id IN (
            SELECT id FROM public.listing_inventory
            WHERE listing_id = p_listing_id
            AND id NOT IN (
                SELECT unnest(inventory_ids) FROM public.bookings WHERE listing_id = p_listing_id AND status != 'Cancelled'
            )
            LIMIT abs(v_diff)
        );
    END IF;
END;
$$;


-- Function to delete a listing with a check for active bookings
CREATE OR REPLACE FUNCTION delete_listing_with_bookings_check(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check for active (Confirmed or Pending) bookings
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE listing_id = p_listing_id AND status IN ('Confirmed', 'Pending')
    ) THEN
        RAISE EXCEPTION 'Cannot delete listing because it has active bookings.';
    END IF;

    -- If no active bookings, proceed with deletion
    DELETE FROM public.listings WHERE id = p_listing_id;
END;
$$;


-- Function to add or update a review
CREATE OR REPLACE FUNCTION add_or_update_review(
    p_listing_id UUID,
    p_user_id UUID,
    p_author_name TEXT,
    p_avatar_url TEXT,
    p_rating REAL,
    p_comment TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_review_id UUID;
    v_new_review JSONB;
BEGIN
    -- Check if a review by this user already exists for this listing
    SELECT (elem->>'id')::UUID INTO v_review_id
    FROM public.listings, jsonb_array_elements(reviews) AS elem
    WHERE id = p_listing_id AND elem->>'user_id' = p_user_id::TEXT;

    v_new_review := jsonb_build_object(
        'id', gen_random_uuid(),
        'user_id', p_user_id,
        'author', p_author_name,
        'avatar', p_avatar_url,
        'rating', p_rating,
        'comment', p_comment,
        'status', 'pending'
    );

    IF v_review_id IS NOT NULL THEN
        -- Update existing review by removing the old and adding the new
        UPDATE public.listings
        SET reviews = reviews - (
            SELECT i FROM jsonb_array_elements(reviews) WITH ORDINALITY arr(elem, i)
            WHERE elem->>'id' = v_review_id::TEXT
        )::INT - 1 || v_new_review
        WHERE id = p_listing_id;
    ELSE
        -- Add new review
        UPDATE public.listings
        SET reviews = reviews || v_new_review
        WHERE id = p_listing_id;
    END IF;
END;
$$;


-- Function to approve a review
CREATE OR REPLACE FUNCTION approve_review(p_listing_id UUID, p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_review JSONB;
    v_review_index INT;
BEGIN
    -- Find the review and its index
    SELECT elem, arr.i - 1 INTO v_review, v_review_index
    FROM public.listings, jsonb_array_elements(reviews) WITH ORDINALITY arr(elem, i)
    WHERE id = p_listing_id AND (elem->>'id')::UUID = p_review_id;

    IF v_review IS NULL THEN
        RAISE EXCEPTION 'Review not found.';
    END IF;

    -- Update the status
    v_review := jsonb_set(v_review, '{status}', '"approved"');

    -- Update the review in the listings table
    UPDATE public.listings
    SET reviews = jsonb_set(reviews, ARRAY[v_review_index::text], v_review)
    WHERE id = p_listing_id;
END;
$$;


-- Function to delete a review
CREATE OR REPLACE FUNCTION delete_review(p_listing_id UUID, p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.listings
    SET reviews = reviews - (
        SELECT i FROM jsonb_array_elements(reviews) WITH ORDINALITY arr(elem, i)
        WHERE elem->>'id' = p_review_id::TEXT
    )::INT - 1
    WHERE id = p_listing_id;
END;
$$;


-- Function to merge listings
CREATE OR REPLACE FUNCTION merge_listings(p_primary_listing_id UUID, p_listing_ids_to_merge UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secondary_listing_id UUID;
    v_features JSONB;
    v_images JSONB;
    v_reviews JSONB;
BEGIN
    -- Consolidate features, images, and reviews
    SELECT jsonb_agg(DISTINCT feature), jsonb_agg(DISTINCT image), jsonb_agg(DISTINCT review)
    INTO v_features, v_images, v_reviews
    FROM (
        SELECT jsonb_array_elements_text(features) AS feature, NULL AS image, NULL AS review FROM public.listings WHERE id = ANY(p_listing_ids_to_merge || ARRAY[p_primary_listing_id])
        UNION ALL
        SELECT NULL, jsonb_array_elements_text(images), NULL FROM public.listings WHERE id = ANY(p_listing_ids_to_merge || ARRAY[p_primary_listing_id])
        UNION ALL
        SELECT NULL, NULL, jsonb_array_elements(reviews) FROM public.listings WHERE id = ANY(p_listing_ids_to_merge || ARRAY[p_primary_listing_id])
    ) AS consolidated_data;

    -- Update the primary listing
    UPDATE public.listings
    SET
        features = v_features,
        images = v_images,
        reviews = v_reviews
    WHERE id = p_primary_listing_id;

    -- Re-parent inventory, bookings from secondary listings to the primary one
    UPDATE public.listing_inventory SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);
    UPDATE public.bookings SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);
    
    -- Delete the now-merged secondary listings
    DELETE FROM public.listings WHERE id = ANY(p_listing_ids_to_merge);
END;
$$;

-- Function for bulk deleting listings
CREATE OR REPLACE FUNCTION bulk_delete_listings(p_listing_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE listing_id = ANY(p_listing_ids) AND status IN ('Confirmed', 'Pending')
    ) THEN
        RAISE EXCEPTION 'Cannot delete listings because at least one has active bookings.';
    END IF;
    
    DELETE FROM public.listings WHERE id = ANY(p_listing_ids);
END;
$$;


-- Function to create a booking
CREATE OR REPLACE FUNCTION create_booking_with_inventory_check(
    p_listing_id UUID,
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_guests INT,
    p_num_units INT,
    p_guest_email TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_inventory_ids UUID[];
    v_user_id UUID := p_user_id;
    v_user_name TEXT;
    v_user_status user_status;
    v_listing_max_guests INT;
    v_message TEXT;
BEGIN
    -- Check listing capacity
    SELECT max_guests INTO v_listing_max_guests FROM public.listings WHERE id = p_listing_id;
    IF p_guests > (v_listing_max_guests * p_num_units) THEN
        RAISE EXCEPTION 'Number of guests exceeds the total capacity for the requested number of units.';
    END IF;
    
    -- Handle guest booking
    IF v_user_id IS NULL AND p_guest_email IS NOT NULL THEN
        -- Check if user exists
        SELECT id, name, status INTO v_user_id, v_user_name, v_user_status FROM public.users WHERE email = p_guest_email;
        
        IF v_user_id IS NULL THEN
            -- Create a new provisional user
            INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at) 
            VALUES (uuid_generate_v4(), uuid_generate_v4(), 'authenticated', 'authenticated', p_guest_email, crypt(p_guest_email, gen_salt('bf')), now(), '', now(), now(), '{"provider":"email","providers":["email"]}', json_build_object('name', 'Guest User'), now(), now(), '', '', now(), now())
            RETURNING id INTO v_user_id;

            INSERT INTO public.users(id, name, email, role, status)
            VALUES(v_user_id, 'Guest User', p_guest_email, 'guest', 'provisional');
            v_message := 'Booking request sent. A provisional account has been created for you. Please check your email to set a password.';
        ELSE
            -- User exists, check status
            IF v_user_status = 'disabled' THEN
                RAISE EXCEPTION 'This user account is disabled.';
            END IF;
            v_message := 'Booking request sent. The booking has been associated with your existing account.';
        END IF;
    ELSIF v_user_id IS NOT NULL THEN
        v_message := 'Your booking request has been sent and is now pending confirmation.';
    ELSE
        RAISE EXCEPTION 'A user ID or guest email must be provided.';
    END IF;

    -- Find available inventory
    SELECT array_agg(id) INTO v_available_inventory_ids
    FROM public.listing_inventory
    WHERE listing_id = p_listing_id
      AND id NOT IN (
          SELECT unnest(inventory_ids)
          FROM public.bookings
          WHERE listing_id = p_listing_id
            AND status = 'Confirmed'
            AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
      );

    -- Check if enough units are available
    IF array_length(v_available_inventory_ids, 1) < p_num_units THEN
        RAISE EXCEPTION 'Not enough units available for the selected dates.';
    END IF;

    -- Insert the new booking
    INSERT INTO public.bookings (listing_id, user_id, start_date, end_date, guests, inventory_ids)
    VALUES (p_listing_id, v_user_id, p_start_date, p_end_date, p_guests, v_available_inventory_ids[1:p_num_units]);

    RETURN v_message;
END;
$$;

-- Function to confirm a booking
CREATE OR REPLACE FUNCTION confirm_booking_with_inventory_check(
    p_booking_id UUID,
    p_admin_id UUID,
    p_admin_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_conflicting_units INT;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;

    -- Check for inventory conflicts
    SELECT COUNT(*) INTO v_conflicting_units
    FROM public.bookings b
    WHERE b.listing_id = v_booking.listing_id
      AND b.status = 'Confirmed'
      AND b.id != p_booking_id
      AND (b.start_date, b.end_date) OVERLAPS (v_booking.start_date, v_booking.end_date)
      AND b.inventory_ids && v_booking.inventory_ids;

    IF v_conflicting_units > 0 THEN
        RAISE EXCEPTION 'Cannot confirm booking due to an inventory conflict with another confirmed booking.';
    END IF;
    
    -- Confirm the booking
    UPDATE public.bookings
    SET 
        status = 'Confirmed',
        action_by_user_id = p_admin_id,
        action_at = now(),
        status_message = 'Confirmed by ' || p_admin_name || ' on ' || to_char(now(), 'YYYY-MM-DD')
    WHERE id = p_booking_id;
END;
$$;


-- Function to update a booking
CREATE OR REPLACE FUNCTION update_booking_with_inventory_check(
    p_booking_id UUID,
    p_new_start_date DATE,
    p_new_end_date DATE,
    p_new_guests INT,
    p_new_num_units INT,
    p_editor_id UUID,
    p_editor_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id UUID;
    v_listing_max_guests INT;
    v_available_inventory_ids UUID[];
BEGIN
    -- Get listing ID and max guests from the original booking
    SELECT listing_id, l.max_guests INTO v_listing_id, v_listing_max_guests
    FROM public.bookings b
    JOIN public.listings l ON b.listing_id = l.id
    WHERE b.id = p_booking_id;
    
    -- Check guest capacity
    IF p_new_guests > (v_listing_max_guests * p_new_num_units) THEN
        RAISE EXCEPTION 'Number of guests exceeds the total capacity for the requested number of units.';
    END IF;

    -- Find available inventory for the new dates, excluding the current booking
    SELECT array_agg(id) INTO v_available_inventory_ids
    FROM public.listing_inventory
    WHERE listing_id = v_listing_id
      AND id NOT IN (
          SELECT unnest(inventory_ids)
          FROM public.bookings
          WHERE listing_id = v_listing_id
            AND id != p_booking_id
            AND status = 'Confirmed'
            AND (start_date, end_date) OVERLAPS (p_new_start_date, p_new_end_date)
      );

    -- Check if enough units are available
    IF array_length(v_available_inventory_ids, 1) < p_new_num_units THEN
        RAISE EXCEPTION 'Not enough units available for the new dates.';
    END IF;

    -- Update the booking and set status to Pending
    UPDATE public.bookings
    SET
        start_date = p_new_start_date,
        end_date = p_new_end_date,
        guests = p_new_guests,
        inventory_ids = v_available_inventory_ids[1:p_new_num_units],
        status = 'Pending',
        action_by_user_id = p_editor_id,
        action_at = now(),
        status_message = 'Booking updated by ' || p_editor_name || ' on ' || to_char(now(), 'YYYY-MM-DD') || '. Awaiting re-confirmation.'
    WHERE id = p_booking_id;
END;
$$;
