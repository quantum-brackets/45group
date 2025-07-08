
-- Drop existing objects to prevent conflicts during re-run.
-- Drop functions first
DROP FUNCTION IF EXISTS public.create_listing_with_inventory(text, text, text, text, jsonb, numeric, text, text, integer, jsonb, integer);
DROP FUNCTION IF EXISTS public.update_listing_with_inventory(uuid, text, text, text, text, numeric, text, text, integer, jsonb, jsonb, integer);
DROP FUNCTION IF EXISTS public.delete_listing_with_bookings_check(uuid);
DROP FUNCTION IF EXISTS public.bulk_delete_listings(uuid[]);
DROP FUNCTION IF EXISTS public.merge_listings(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.create_booking_with_inventory_check(uuid, uuid, date, date, integer, integer, text);
DROP FUNCTION IF EXISTS public.update_booking_with_inventory_check(uuid, date, date, integer, integer, uuid, text);
DROP FUNCTION IF EXISTS public.confirm_booking_with_inventory_check(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_filtered_listings(text, text, integer, date, date);
DROP FUNCTION IF EXISTS public.add_or_update_review(uuid, uuid, text, text, integer, text);
DROP FUNCTION IF EXISTS public.approve_review(uuid, uuid);
DROP FUNCTION IF EXISTS public.delete_review(uuid, uuid);

-- Drop tables last due to dependencies
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.listing_inventory;
DROP TABLE IF EXISTS public.listings;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.users;

-- ============================
-- 1. TABLES
-- ============================

-- Users Table: Stores user information.
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    role text NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'guest', 'staff')),
    status text NOT NULL DEFAULT 'provisional' CHECK (status IN ('active', 'disabled', 'provisional')),
    phone text,
    notes text,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Stores user account data.';

-- Sessions Table: Stores user session tokens for authentication.
CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.sessions IS 'Stores user login sessions.';

-- Listings Table: Stores information about bookable properties.
CREATE TABLE public.listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('hotel', 'events', 'restaurant')),
    location text NOT NULL,
    description text,
    images jsonb DEFAULT '[]'::jsonb,
    price numeric(10, 2) NOT NULL,
    price_unit text NOT NULL CHECK (price_unit IN ('night', 'hour', 'person')),
    currency text NOT NULL,
    rating numeric(2, 1) DEFAULT 0.0,
    reviews jsonb DEFAULT '[]'::jsonb,
    features jsonb DEFAULT '[]'::jsonb,
    max_guests integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.listings IS 'Core table for all bookable properties/venues.';

-- Listing Inventory Table: Manages individual bookable units for a listing.
CREATE TABLE public.listing_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.listing_inventory IS 'Individual bookable units (e.g., rooms, tables).';

-- Bookings Table: Stores all booking records.
CREATE TABLE public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    inventory_ids uuid[],
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    guests integer NOT NULL,
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Confirmed', 'Pending', 'Cancelled')),
    created_at timestamptz DEFAULT now(),
    action_by_user_id uuid REFERENCES public.users(id),
    action_at timestamptz,
    status_message text
);
COMMENT ON TABLE public.bookings IS 'Stores all booking and reservation information.';


-- ============================
-- 2. RLS (ROW LEVEL SECURITY)
-- ============================

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policies should be restrictive by default.
-- The application's server-side logic uses the service_role key, which bypasses RLS.
-- This ensures data access is controlled by application logic, not database roles.
CREATE POLICY "Deny all access" ON public.users FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "Deny all access" ON public.sessions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "Allow public read access to listings" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Deny all access" ON public.listing_inventory FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "Deny all access" ON public.bookings FOR ALL USING (false) WITH CHECK (false);


-- ============================
-- 3. DATABASE FUNCTIONS (RPCs)
-- ============================

-- Function to create a listing and its initial inventory.
CREATE OR REPLACE FUNCTION public.create_listing_with_inventory(p_name text, p_type text, p_location text, p_description text, p_images jsonb, p_price numeric, p_price_unit text, p_currency text, p_max_guests integer, p_features jsonb, p_inventory_count integer)
RETURNS void AS $$
DECLARE
    new_listing_id uuid;
BEGIN
    INSERT INTO public.listings (name, type, location, description, images, price, price_unit, currency, max_guests, features)
    VALUES (p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features)
    RETURNING id INTO new_listing_id;

    IF p_inventory_count > 0 THEN
      FOR i IN 1..p_inventory_count LOOP
          INSERT INTO public.listing_inventory (listing_id, name)
          VALUES (new_listing_id, p_name || ' Unit ' || i);
      END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to update a listing and adjust its inventory count.
CREATE OR REPLACE FUNCTION public.update_listing_with_inventory(p_listing_id uuid, p_name text, p_type text, p_location text, p_description text, p_price numeric, p_price_unit text, p_currency text, p_max_guests integer, p_features jsonb, p_images jsonb, p_new_inventory_count integer)
RETURNS void AS $$
DECLARE
    current_inventory_count integer;
    diff integer;
    i integer;
BEGIN
    UPDATE public.listings
    SET name = p_name, type = p_type, location = p_location, description = p_description, price = p_price, price_unit = p_price_unit, currency = p_currency, max_guests = p_max_guests, features = p_features, images = p_images, updated_at = now()
    WHERE id = p_listing_id;

    SELECT count(*) INTO current_inventory_count FROM public.listing_inventory WHERE listing_id = p_listing_id;
    diff := p_new_inventory_count - current_inventory_count;

    IF diff > 0 THEN
        FOR i IN 1..diff LOOP
            INSERT INTO public.listing_inventory (listing_id, name)
            VALUES (p_listing_id, p_name || ' Unit ' || (current_inventory_count + i));
        END LOOP;
    ELSIF diff < 0 THEN
        -- Delete inventory units that are not part of any non-cancelled booking.
        DELETE FROM public.listing_inventory
        WHERE id IN (
            SELECT id FROM public.listing_inventory 
            WHERE listing_id = p_listing_id 
            AND id NOT IN (SELECT unnest(inventory_ids) FROM bookings WHERE listing_id = p_listing_id AND status != 'Cancelled') 
            LIMIT abs(diff)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to delete a listing, but only if it has no active bookings.
CREATE OR REPLACE FUNCTION public.delete_listing_with_bookings_check(p_listing_id uuid)
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.bookings WHERE listing_id = p_listing_id AND status = 'Confirmed' AND end_date >= CURRENT_DATE) THEN
        RAISE EXCEPTION 'Cannot delete listing with active or upcoming confirmed bookings.';
    END IF;
    DELETE FROM public.listings WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to create a booking, checking for inventory availability first.
CREATE OR REPLACE FUNCTION public.create_booking_with_inventory_check(p_listing_id uuid, p_user_id uuid, p_start_date date, p_end_date date, p_guests integer, p_num_units integer, p_guest_email text DEFAULT NULL)
RETURNS text AS $$
DECLARE
    available_inventory_ids uuid[];
    new_user_id uuid := p_user_id;
    final_message text;
BEGIN
    SELECT array_agg(li.id) INTO available_inventory_ids
    FROM public.listing_inventory li
    WHERE li.listing_id = p_listing_id
    AND li.id NOT IN (
        SELECT unnest(b.inventory_ids)
        FROM public.bookings b
        WHERE b.listing_id = p_listing_id
        AND b.status IN ('Confirmed', 'Pending')
        AND (b.start_date, b.end_date) OVERLAPS (p_start_date, p_end_date)
    )
    LIMIT p_num_units;

    IF array_length(available_inventory_ids, 1) < p_num_units THEN
        RAISE EXCEPTION 'Not enough available units for the selected dates.';
    END IF;

    IF new_user_id IS NULL AND p_guest_email IS NOT NULL THEN
        SELECT id INTO new_user_id FROM public.users WHERE email = p_guest_email;
        IF new_user_id IS NULL THEN
            INSERT INTO public.users (name, email, password, role, status)
            VALUES (p_guest_email, p_guest_email, 'provisional-password-must-be-reset', 'guest', 'provisional')
            RETURNING id INTO new_user_id;
            final_message := 'Booking request sent! A provisional account has been created for you. Please sign up to manage your booking.';
        ELSE
            final_message := 'Booking request sent!';
        END IF;
    ELSE
        final_message := 'Booking request sent! You will be notified once it is confirmed.';
    END IF;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID or Guest Email must be provided.';
    END IF;

    INSERT INTO public.bookings (listing_id, user_id, start_date, end_date, guests, inventory_ids, status)
    VALUES (p_listing_id, new_user_id, p_start_date, p_end_date, p_guests, available_inventory_ids, 'Pending');

    RETURN final_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to update a booking, re-checking availability.
CREATE OR REPLACE FUNCTION public.update_booking_with_inventory_check(p_booking_id uuid, p_new_start_date date, p_new_end_date date, p_new_guests integer, p_new_num_units integer, p_editor_id uuid, p_editor_name text)
RETURNS void AS $$
DECLARE
    booking_details record;
    available_inventory_ids uuid[];
BEGIN
    SELECT * INTO booking_details FROM public.bookings WHERE id = p_booking_id;
    
    SELECT array_agg(li.id) INTO available_inventory_ids
    FROM public.listing_inventory li
    WHERE li.listing_id = booking_details.listing_id
    AND li.id NOT IN (
        SELECT unnest(b.inventory_ids)
        FROM public.bookings b
        WHERE b.listing_id = booking_details.listing_id
        AND b.id != p_booking_id
        AND b.status IN ('Confirmed', 'Pending')
        AND (b.start_date, b.end_date) OVERLAPS (p_new_start_date, p_new_end_date)
    )
    LIMIT p_new_num_units;

    IF array_length(available_inventory_ids, 1) < p_new_num_units THEN
        RAISE EXCEPTION 'Not enough available units for the new dates/unit count.';
    END IF;

    UPDATE public.bookings
    SET start_date = p_new_start_date,
        end_date = p_new_end_date,
        guests = p_new_guests,
        inventory_ids = available_inventory_ids,
        status = 'Pending',
        status_message = 'Updated by ' || p_editor_name || ' on ' || to_char(now(), 'YYYY-MM-DD') || '. Awaiting re-confirmation.',
        action_by_user_id = p_editor_id,
        action_at = now()
    WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to confirm a booking, with a final conflict check.
CREATE OR REPLACE FUNCTION public.confirm_booking_with_inventory_check(p_booking_id uuid, p_admin_id uuid, p_admin_name text)
RETURNS void AS $$
DECLARE
    booking_details record;
BEGIN
    SELECT * INTO booking_details FROM public.bookings WHERE id = p_booking_id;
    
    IF EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.listing_id = booking_details.listing_id
        AND b.id != p_booking_id
        AND b.status = 'Confirmed'
        AND (b.start_date, b.end_date) OVERLAPS (booking_details.start_date, booking_details.end_date)
        AND b.inventory_ids && booking_details.inventory_ids
    ) THEN
        RAISE EXCEPTION 'Booking cannot be confirmed due to a conflict with another confirmed booking.';
    END IF;

    UPDATE public.bookings
    SET status = 'Confirmed',
        status_message = 'Confirmed by ' || p_admin_name || ' on ' || to_char(now(), 'YYYY-MM-DD') || '.',
        action_by_user_id = p_admin_id,
        action_at = now()
    WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to filter listings based on criteria, including booking availability.
CREATE OR REPLACE FUNCTION public.get_filtered_listings(location_filter text, type_filter text, guests_filter integer, from_date_filter date, to_date_filter date)
RETURNS TABLE(id uuid, name text, type text, location text, description text, images jsonb, price numeric, price_unit text, currency text, rating numeric, reviews jsonb, features jsonb, max_guests integer) AS $$
DECLARE
  from_d date := from_date_filter;
  to_d date := to_date_filter;
BEGIN
  IF from_d IS NOT NULL AND to_d IS NULL THEN
    to_d := from_d;
  END IF;

  RETURN QUERY
  SELECT l.*
  FROM public.listings l
  WHERE
      (location_filter IS NULL OR l.location ILIKE '%' || location_filter || '%')
  AND (type_filter IS NULL OR l.type = type_filter)
  AND (guests_filter IS NULL OR l.max_guests >= guests_filter)
  AND (
      (from_d IS NULL)
      OR
      (SELECT COUNT(li.id) FROM public.listing_inventory li WHERE li.listing_id = l.id) > 
      (SELECT COUNT(DISTINCT unnest(b.inventory_ids))
        FROM public.bookings b
        WHERE b.listing_id = l.id
        AND b.status = 'Confirmed'
        AND (b.start_date, b.end_date) OVERLAPS (from_d, to_d)
      )
  );
END;
$$ LANGUAGE plpgsql;


-- Function to add or update a review within the listing's JSONB column.
CREATE OR REPLACE FUNCTION public.add_or_update_review(p_listing_id uuid, p_user_id uuid, p_author_name text, p_avatar_url text, p_rating integer, p_comment text)
RETURNS void AS $$
DECLARE
    existing_review jsonb;
    review_index int;
BEGIN
    SELECT review, idx - 1 INTO existing_review, review_index
    FROM public.listings, jsonb_array_elements(reviews) WITH ORDINALITY arr(review, idx)
    WHERE id = p_listing_id AND review->>'user_id' = p_user_id::text;

    IF existing_review IS NOT NULL THEN
        -- Update existing review
        UPDATE public.listings
        SET reviews = jsonb_set(
            reviews,
            ARRAY[review_index::text],
            reviews->review_index || jsonb_build_object('rating', p_rating, 'comment', p_comment, 'status', 'pending')
        )
        WHERE id = p_listing_id;
    ELSE
        -- Add new review
        UPDATE public.listings
        SET reviews = reviews || jsonb_build_object(
            'id', gen_random_uuid(),
            'user_id', p_user_id,
            'author', p_author_name,
            'avatar', p_avatar_url,
            'rating', p_rating,
            'comment', p_comment,
            'status', 'pending'
        )::jsonb
        WHERE id = p_listing_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to approve a review by updating its status in the JSONB array.
CREATE OR REPLACE FUNCTION public.approve_review(p_listing_id uuid, p_review_id uuid)
RETURNS void AS $$
DECLARE
    review_index int;
    new_reviews jsonb;
    new_average_rating numeric;
BEGIN
    SELECT idx - 1 INTO review_index
    FROM public.listings, jsonb_array_elements(reviews) WITH ORDINALITY arr(review, idx)
    WHERE id = p_listing_id AND review->>'id' = p_review_id::text;

    IF review_index IS NOT NULL THEN
        UPDATE public.listings
        SET reviews = jsonb_set(reviews, ARRAY[review_index::text, 'status'], '"approved"')
        WHERE id = p_listing_id
        RETURNING reviews INTO new_reviews;

        SELECT avg((r->>'rating')::numeric) INTO new_average_rating
        FROM jsonb_array_elements(new_reviews) r
        WHERE r->>'status' = 'approved';

        UPDATE public.listings
        SET rating = COALESCE(new_average_rating, 0)
        WHERE id = p_listing_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to delete a review from the JSONB array.
CREATE OR REPLACE FUNCTION public.delete_review(p_listing_id uuid, p_review_id uuid)
RETURNS void AS $$
DECLARE
    review_index int;
    new_reviews jsonb;
    new_average_rating numeric;
BEGIN
    SELECT idx - 1 INTO review_index
    FROM public.listings, jsonb_array_elements(reviews) WITH ORDINALITY arr(review, idx)
    WHERE id = p_listing_id AND review->>'id' = p_review_id::text;

    IF review_index IS NOT NULL THEN
        UPDATE public.listings
        SET reviews = reviews - review_index
        WHERE id = p_listing_id
        RETURNING reviews INTO new_reviews;

        SELECT avg((r->>'rating')::numeric) INTO new_average_rating
        FROM jsonb_array_elements(new_reviews) r
        WHERE r->>'status' = 'approved';
        
        UPDATE public.listings
        SET rating = COALESCE(new_average_rating, 0)
        WHERE id = p_listing_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to merge multiple listings into a primary one.
CREATE OR REPLACE FUNCTION public.merge_listings(p_primary_listing_id uuid, p_listing_ids_to_merge uuid[])
RETURNS void AS $$
DECLARE
    merged_id uuid;
    primary_reviews jsonb;
    primary_images jsonb;
    primary_features jsonb;
BEGIN
    -- Aggregate data from listings to be merged
    SELECT jsonb_agg(review), jsonb_agg(image), jsonb_agg(feature)
    INTO primary_reviews, primary_images, primary_features
    FROM (
        SELECT jsonb_array_elements(reviews) as review, 
               jsonb_array_elements(images) as image, 
               jsonb_array_elements(features) as feature
        FROM public.listings
        WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
    ) as data;
    
    -- Update primary listing
    UPDATE public.listings
    SET reviews = primary_reviews,
        images = primary_images,
        features = primary_features
    WHERE id = p_primary_listing_id;

    -- Update related records
    UPDATE public.listing_inventory SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);
    UPDATE public.bookings SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);

    -- Delete merged listings
    DELETE FROM public.listings WHERE id = ANY(p_listing_ids_to_merge);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to bulk delete listings.
CREATE OR REPLACE FUNCTION public.bulk_delete_listings(p_listing_ids uuid[])
RETURNS void AS $$
BEGIN
    DELETE FROM public.listings WHERE id = ANY(p_listing_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
