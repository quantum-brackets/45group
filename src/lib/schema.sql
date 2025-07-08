-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- #############################################################################
-- ############################ TABLES & POLICIES ##############################
-- #############################################################################

-- USERS
-- This table is managed by Supabase Auth, but we can extend it with a public profile.
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'guest',
  status TEXT NOT NULL DEFAULT 'active',
  phone TEXT,
  notes TEXT
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admins to manage user profiles" ON users FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- LISTINGS
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] NOT NULL,
  price NUMERIC NOT NULL,
  price_unit TEXT NOT NULL,
  currency TEXT NOT NULL,
  rating NUMERIC DEFAULT 0,
  reviews JSONB DEFAULT '[]'::jsonb,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_guests INTEGER NOT NULL
);
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access" ON listings FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage listings" ON listings FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- LISTING_INVENTORY
CREATE TABLE listing_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE
);
ALTER TABLE listing_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access" ON listing_inventory FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage inventory" ON listing_inventory FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);


-- BOOKINGS
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  inventory_ids UUID[] NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_at TIMESTAMPTZ,
  status_message TEXT
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to access their own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admins/staff to access all bookings" ON bookings FOR SELECT USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Allow admins to manage all bookings" ON bookings FOR UPDATE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);


-- #############################################################################
-- ############################## FUNCTIONS ####################################
-- #############################################################################

-- Function to create a listing and its inventory units
CREATE OR REPLACE FUNCTION create_listing_with_inventory(
  p_name text,
  p_type text,
  p_location text,
  p_description text,
  p_images text[],
  p_price numeric,
  p_price_unit text,
  p_currency text,
  p_max_guests integer,
  p_features text[],
  p_inventory_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_listing_id uuid;
BEGIN
  -- Insert the new listing
  INSERT INTO listings(name, type, location, description, images, price, price_unit, currency, max_guests, features)
  VALUES (p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features)
  RETURNING id INTO new_listing_id;

  -- Create inventory units for the new listing
  FOR i IN 1..p_inventory_count LOOP
    INSERT INTO listing_inventory (listing_id, name)
    VALUES (new_listing_id, p_name || ' - Unit ' || i);
  END LOOP;
END;
$$;


-- Function to update a listing and adjust its inventory
CREATE OR REPLACE FUNCTION update_listing_with_inventory(
  p_listing_id uuid,
  p_name text,
  p_type text,
  p_location text,
  p_description text,
  p_price numeric,
  p_price_unit text,
  p_currency text,
  p_max_guests integer,
  p_features text[],
  p_images text[],
  p_new_inventory_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_inventory_count integer;
BEGIN
  -- Update listing details
  UPDATE listings
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
  SELECT COUNT(*) INTO current_inventory_count FROM listing_inventory WHERE listing_id = p_listing_id;

  -- Adjust inventory
  IF p_new_inventory_count > current_inventory_count THEN
    -- Add new units
    FOR i IN (current_inventory_count + 1)..p_new_inventory_count LOOP
      INSERT INTO listing_inventory (listing_id, name)
      VALUES (p_listing_id, p_name || ' - Unit ' || i);
    END LOOP;
  ELSIF p_new_inventory_count < current_inventory_count THEN
    -- Remove excess units (that are not booked)
    DELETE FROM listing_inventory
    WHERE id IN (
      SELECT id FROM listing_inventory
      WHERE listing_id = p_listing_id AND is_booked = FALSE
      LIMIT (current_inventory_count - p_new_inventory_count)
    );
  END IF;
END;
$$;


-- Function to delete a listing only if it has no active bookings
CREATE OR REPLACE FUNCTION delete_listing_with_bookings_check(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE listing_id = p_listing_id AND status IN ('Confirmed', 'Pending')
  ) THEN
    RAISE EXCEPTION 'Cannot delete listing with active or pending bookings.';
  END IF;
  
  DELETE FROM listings WHERE id = p_listing_id;
END;
$$;


-- Function to create a booking with inventory availability check
CREATE OR REPLACE FUNCTION create_booking_with_inventory_check(
  p_listing_id uuid,
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_guests integer,
  p_num_units integer,
  p_guest_email text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_user_id uuid := p_user_id;
  user_status text;
  new_user_name text;
  available_inventory_ids uuid[];
  listing_name_text text;
  listing_max_guests integer;
BEGIN
  -- Handle guest booking
  IF final_user_id IS NULL THEN
      IF p_guest_email IS NULL THEN
          RAISE EXCEPTION 'Email is required for guest bookings.';
      END IF;

      -- Check if user exists, otherwise create a provisional one
      SELECT id, status INTO final_user_id, user_status FROM users WHERE email = p_guest_email;
      
      IF final_user_id IS NULL THEN
          new_user_name := 'Guest (' || split_part(p_guest_email, '@', 1) || ')';
          INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
          VALUES (uuid_generate_v4(), uuid_generate_v4(), 'authenticated', 'authenticated', p_guest_email, crypt(p_guest_email, gen_salt('bf')), now(), '', '1970-01-01 00:00:00+00', '1970-01-01 00:00:00+00', '{"provider":"email","providers":["email"]}', jsonb_build_object('name', new_user_name), now(), now(), '', '', '1970-01-01 00:00:00+00', '1970-01-01 00:00:00+00')
          RETURNING id INTO final_user_id;
          
          INSERT INTO users(id, name, email, role, status)
          VALUES (final_user_id, new_user_name, p_guest_email, 'guest', 'provisional');
      ELSIF user_status = 'provisional' THEN
          -- User exists but is provisional, can still book.
      END IF;
  END IF;

  -- Get listing details
  SELECT name, max_guests INTO listing_name_text, listing_max_guests FROM listings WHERE id = p_listing_id;
  IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing not found.';
  END IF;

  IF p_guests > (listing_max_guests * p_num_units) THEN
    RAISE EXCEPTION 'Number of guests exceeds the maximum capacity for the requested number of units.';
  END IF;

  -- Find available inventory units
  SELECT ARRAY_AGG(id) INTO available_inventory_ids
  FROM listing_inventory li
  WHERE li.listing_id = p_listing_id
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.listing_id = p_listing_id
        AND b.status = 'Confirmed'
        AND li.id = ANY(b.inventory_ids)
        AND (b.start_date, b.end_date) OVERLAPS (p_start_date, p_end_date)
    );

  -- Check if enough units are available
  IF ARRAY_LENGTH(available_inventory_ids, 1) < p_num_units THEN
    RAISE EXCEPTION 'Not enough units available for the selected dates. Available: %', ARRAY_LENGTH(available_inventory_ids, 1);
  END IF;

  -- Create the booking
  INSERT INTO bookings(listing_id, user_id, start_date, end_date, guests, status, inventory_ids, status_message)
  VALUES (p_listing_id, final_user_id, p_start_date, p_end_date, p_guests, 'Pending', available_inventory_ids[1:p_num_units], 'Booking request created.');

  RETURN 'Booking request for ' || listing_name_text || ' created successfully. Awaiting confirmation.';
END;
$$;


-- Function to update a booking with inventory check
CREATE OR REPLACE FUNCTION update_booking_with_inventory_check(
  p_booking_id uuid,
  p_new_start_date date,
  p_new_end_date date,
  p_new_guests integer,
  p_new_num_units integer,
  p_editor_id uuid,
  p_editor_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_listing_id uuid;
  available_inventory_ids uuid[];
  listing_max_guests integer;
BEGIN
  -- Get listing ID from booking
  SELECT listing_id INTO current_listing_id FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found.';
  END IF;

  SELECT max_guests INTO listing_max_guests FROM listings WHERE id = current_listing_id;
  IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing not found.';
  END IF;

  IF p_new_guests > (listing_max_guests * p_new_num_units) THEN
      RAISE EXCEPTION 'Number of guests exceeds the maximum capacity for the requested number of units.';
  END IF;

  -- Find available inventory units, excluding the current booking being edited
  SELECT ARRAY_AGG(id) INTO available_inventory_ids
  FROM listing_inventory li
  WHERE li.listing_id = current_listing_id
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id != p_booking_id
        AND b.listing_id = current_listing_id
        AND b.status = 'Confirmed'
        AND li.id = ANY(b.inventory_ids)
        AND (b.start_date, b.end_date) OVERLAPS (p_new_start_date, p_new_end_date)
    );

  -- Check if enough units are available
  IF ARRAY_LENGTH(available_inventory_ids, 1) < p_new_num_units THEN
    RAISE EXCEPTION 'Not enough units available for the selected dates. Only % available.', COALESCE(ARRAY_LENGTH(available_inventory_ids, 1), 0);
  END IF;

  -- Update the booking
  UPDATE bookings
  SET 
    start_date = p_new_start_date,
    end_date = p_new_end_date,
    guests = p_new_guests,
    status = 'Pending', -- Reset to pending for re-confirmation
    inventory_ids = available_inventory_ids[1:p_new_num_units],
    status_message = 'Booking updated by ' || p_editor_name || ' on ' || to_char(NOW(), 'YYYY-MM-DD') || '. Awaiting re-confirmation.',
    action_by_user_id = p_editor_id,
    action_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- Function to confirm a booking and mark inventory as booked
CREATE OR REPLACE FUNCTION confirm_booking_with_inventory_check(
  p_booking_id uuid,
  p_admin_id uuid,
  p_admin_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_to_confirm RECORD;
  conflicting_booking_id uuid;
BEGIN
  -- Get booking details
  SELECT * INTO booking_to_confirm FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  -- Check for conflicting confirmed bookings for the same inventory units
  SELECT b.id INTO conflicting_booking_id
  FROM bookings b
  CROSS JOIN unnest(booking_to_confirm.inventory_ids) as inv_id
  WHERE b.id != p_booking_id
    AND b.status = 'Confirmed'
    AND inv_id = ANY(b.inventory_ids)
    AND (b.start_date, b.end_date) OVERLAPS (booking_to_confirm.start_date, booking_to_confirm.end_date)
  LIMIT 1;

  IF conflicting_booking_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot confirm booking. One or more units are already booked in this time slot by booking %.', conflicting_booking_id;
  END IF;

  -- Update booking status
  UPDATE bookings
  SET 
    status = 'Confirmed',
    action_by_user_id = p_admin_id,
    action_at = NOW(),
    status_message = 'Confirmed by ' || p_admin_name || ' on ' || to_char(NOW(), 'YYYY-MM-DD')
  WHERE id = p_booking_id;
END;
$$;

-- Function to add or update a review
CREATE OR REPLACE FUNCTION add_or_update_review(
  p_listing_id uuid,
  p_user_id uuid,
  p_author_name text,
  p_avatar_url text,
  p_rating integer,
  p_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  listing RECORD;
  existing_review_index integer;
  new_review jsonb;
  new_review_id uuid := gen_random_uuid();
BEGIN
  -- Get the current listing
  SELECT * INTO listing FROM listings WHERE id = p_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;

  -- Check if the user has already reviewed this listing
  SELECT idx - 1 INTO existing_review_index
  FROM jsonb_array_elements(listing.reviews) WITH ORDINALITY arr(elem, idx)
  WHERE (elem->>'user_id')::uuid = p_user_id;

  new_review := jsonb_build_object(
      'id', new_review_id,
      'user_id', p_user_id,
      'author', p_author_name,
      'avatar', p_avatar_url,
      'rating', p_rating,
      'comment', p_comment,
      'status', 'pending'
  );

  IF existing_review_index IS NOT NULL THEN
    -- Update the existing review
    UPDATE listings
    SET reviews = jsonb_set(reviews, ARRAY[existing_review_index::text], new_review, false)
    WHERE id = p_listing_id;
  ELSE
    -- Add a new review
    UPDATE listings
    SET reviews = reviews || new_review
    WHERE id = p_listing_id;
  END IF;
END;
$$;


-- Function to approve a review
CREATE OR REPLACE FUNCTION approve_review(p_listing_id uuid, p_review_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  listing RECORD;
  review_index integer;
BEGIN
  SELECT * INTO listing FROM listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found.'; END IF;

  SELECT idx - 1 INTO review_index
  FROM jsonb_array_elements(listing.reviews) WITH ORDINALITY arr(review, idx)
  WHERE (review->>'id') = p_review_id;

  IF review_index IS NOT NULL THEN
    UPDATE listings
    SET 
      reviews = jsonb_set(reviews, ARRAY[review_index::text, 'status'], '"approved"'),
      rating = (
        SELECT AVG((r->>'rating')::numeric)
        FROM jsonb_array_elements(jsonb_set(reviews, ARRAY[review_index::text, 'status'], '"approved"')) as r
        WHERE r->>'status' = 'approved'
      )
    WHERE id = p_listing_id;
  ELSE
    RAISE EXCEPTION 'Review not found.';
  END IF;
END;
$$;

-- Function to delete a review
CREATE OR REPLACE FUNCTION delete_review(p_listing_id uuid, p_review_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_reviews jsonb;
BEGIN
  SELECT jsonb_agg(review)
  INTO new_reviews
  FROM jsonb_array_elements((SELECT reviews FROM listings WHERE id = p_listing_id)) as review
  WHERE (review->>'id') != p_review_id;

  UPDATE listings
  SET 
    reviews = COALESCE(new_reviews, '[]'::jsonb),
    rating = COALESCE((
      SELECT AVG((r->>'rating')::numeric)
      FROM jsonb_array_elements(COALESCE(new_reviews, '[]'::jsonb)) as r
      WHERE r->>'status' = 'approved'
    ), 0)
  WHERE id = p_listing_id;
END;
$$;


-- Function to get filtered listings with inventory availability check
CREATE OR REPLACE FUNCTION get_filtered_listings(
  location_filter text DEFAULT NULL,
  type_filter text DEFAULT NULL,
  guests_filter integer DEFAULT NULL,
  from_date_filter date DEFAULT NULL,
  to_date_filter date DEFAULT NULL
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
    AND (type_filter IS NULL OR l.type = type_filter)
    AND (guests_filter IS NULL OR l.max_guests >= guests_filter)
    AND (
      from_date_filter IS NULL
      OR
      (
        SELECT COUNT(li.id)
        FROM listing_inventory li
        WHERE li.listing_id = l.id
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.listing_id = l.id
              AND b.status = 'Confirmed'
              AND li.id = ANY(b.inventory_ids)
              AND (b.start_date, b.end_date) OVERLAPS (from_date_filter, to_date_filter)
          )
      ) > 0
    )
  ORDER BY l.rating DESC;
END;
$$;


-- Function to merge multiple listings into a primary one
CREATE OR REPLACE FUNCTION merge_listings(
  p_primary_listing_id uuid,
  p_listing_ids_to_merge uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merged_reviews jsonb;
  merged_features text[];
  merged_images text[];
BEGIN
  -- Combine reviews, features, and images
  SELECT 
    jsonb_agg(DISTINCT review),
    array_agg(DISTINCT feature),
    array_agg(DISTINCT image)
  INTO
    merged_reviews,
    merged_features,
    merged_images
  FROM (
    SELECT jsonb_array_elements(reviews) as review, unnest(features) as feature, unnest(images) as image
    FROM listings
    WHERE id = p_primary_listing_id OR id = ANY(p_listing_ids_to_merge)
  ) as combined_data;

  -- Update primary listing
  UPDATE listings
  SET
    reviews = COALESCE(merged_reviews, '[]'::jsonb),
    features = COALESCE(merged_features, ARRAY[]::text[]),
    images = COALESCE(merged_images, ARRAY[]::text[])
  WHERE id = p_primary_listing_id;

  -- Re-assign bookings, inventory, etc. to primary listing
  UPDATE bookings SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);
  UPDATE listing_inventory SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);
  
  -- Delete merged listings
  DELETE FROM listings WHERE id = ANY(p_listing_ids_to_merge);
END;
$$;

-- Function to bulk delete listings
CREATE OR REPLACE FUNCTION bulk_delete_listings(p_listing_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE listing_id = ANY(p_listing_ids) AND status IN ('Confirmed', 'Pending')
  ) THEN
    RAISE EXCEPTION 'Cannot delete listings that have active or pending bookings.';
  END IF;

  DELETE FROM listings WHERE id = ANY(p_listing_ids);
END;
$$;


-- #############################################################################
-- ############################## TRIGGERS #####################################
-- #############################################################################

-- Trigger to create a public user profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    'guest',
    'active'
  );
  RETURN NEW;
END;
$$;

-- Link the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.on_auth_user_created();

-- Trigger to handle provisional user signup completion
CREATE OR REPLACE FUNCTION public.on_user_updated_check_provisional()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user was provisional and their password has just been set
  IF OLD.status = 'provisional' AND NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    -- Update their status to 'active'
    UPDATE public.users SET status = 'active' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_updated_check_provisional_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
EXECUTE FUNCTION public.on_user_updated_check_provisional();
