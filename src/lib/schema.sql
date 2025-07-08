-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define custom types
CREATE TYPE listing_type AS ENUM ('hotel', 'events', 'restaurant');
CREATE TYPE currency_type AS ENUM ('USD', 'EUR', 'GBP', 'NGN');
CREATE TYPE price_unit_type AS ENUM ('night', 'hour', 'person');
CREATE TYPE user_role AS ENUM ('admin', 'guest', 'staff');
CREATE TYPE user_status AS ENUM ('active', 'disabled', 'provisional');
CREATE TYPE booking_status AS ENUM ('Confirmed', 'Pending', 'Cancelled');

-- Create the users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'guest',
    status user_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type listing_type NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    images TEXT[],
    price NUMERIC(10, 2) NOT NULL,
    price_unit price_unit_type NOT NULL,
    currency currency_type NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 0.0,
    reviews JSONB DEFAULT '[]'::jsonb,
    features TEXT[],
    max_guests INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the listing_inventory table
CREATE TABLE listing_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL
);
CREATE INDEX idx_listing_inventory_listing_id ON listing_inventory(listing_id);

-- Create the bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    inventory_ids UUID[],
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    guests INTEGER NOT NULL,
    status booking_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    action_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_at TIMESTAMPTZ,
    status_message TEXT
);
CREATE INDEX idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);


-- Function to create a user profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, status)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name',
        new.email,
        'guest', -- Default role
        'active' -- Default status
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new user is created
CREATE TRIGGER on_auth_user_created_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION on_auth_user_created();

-- RLS Policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all user profiles" ON users FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
) WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Staff can view user profiles" ON users FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'staff')
);


-- RLS Policies for listings, listing_inventory, and bookings tables
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings are public" ON listings FOR SELECT USING (true);
CREATE POLICY "Admins can manage listings" ON listings FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

ALTER TABLE listing_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory is public" ON listing_inventory FOR SELECT USING (true);
CREATE POLICY "Admins can manage inventory" ON listing_inventory FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins and staff can view all bookings" ON bookings FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and users can update their own bookings" ON bookings FOR UPDATE USING (
    auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can cancel their own bookings" ON bookings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any booking" ON bookings FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);


-- Helper function to get inventory count for a listing
CREATE OR REPLACE FUNCTION get_inventory_count(p_listing_id UUID)
RETURNS INTEGER AS $$
DECLARE
    inventory_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO inventory_count
    FROM listing_inventory
    WHERE listing_id = p_listing_id;
    RETURN inventory_count;
END;
$$ LANGUAGE plpgsql;

-- Helper view to combine listing data with inventory count
CREATE OR REPLACE VIEW listings_with_inventory AS
SELECT 
    l.*,
    (SELECT COUNT(*) FROM listing_inventory li WHERE li.listing_id = l.id) as "inventoryCount"
FROM listings l;

-----------------------------
-- BUSINESS LOGIC FUNCTIONS --
-----------------------------

-- Create a new listing and associated inventory units
CREATE OR REPLACE FUNCTION create_listing_with_inventory(
    p_name TEXT,
    p_type listing_type,
    p_location TEXT,
    p_description TEXT,
    p_images TEXT[],
    p_price NUMERIC,
    p_price_unit price_unit_type,
    p_currency currency_type,
    p_max_guests INTEGER,
    p_features TEXT[],
    p_inventory_count INTEGER
)
RETURNS void AS $$
DECLARE
    new_listing_id UUID;
    i INTEGER;
BEGIN
    -- Insert the new listing and get its ID
    INSERT INTO listings (name, type, location, description, images, price, price_unit, currency, max_guests, features)
    VALUES (p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features)
    RETURNING id INTO new_listing_id;

    -- Create inventory units
    FOR i IN 1..p_inventory_count LOOP
        INSERT INTO listing_inventory (listing_id, name)
        VALUES (new_listing_id, p_name || ' - Unit ' || i);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Delete a listing, but only if it has no confirmed or pending bookings
CREATE OR REPLACE FUNCTION delete_listing_with_bookings_check(p_listing_id UUID)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE listing_id = p_listing_id AND status IN ('Confirmed', 'Pending')
    ) THEN
        RAISE EXCEPTION 'Cannot delete listing with active or pending bookings.';
    END IF;

    DELETE FROM listings WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update a listing and adjust its inventory count
CREATE OR REPLACE FUNCTION update_listing_with_inventory(
    p_listing_id UUID,
    p_name TEXT,
    p_type listing_type,
    p_location TEXT,
    p_description TEXT,
    p_price NUMERIC,
    p_price_unit price_unit_type,
    p_currency currency_type,
    p_max_guests INTEGER,
    p_features TEXT[],
    p_images TEXT[],
    p_new_inventory_count INTEGER
)
RETURNS void AS $$
DECLARE
    current_inventory_count INTEGER;
    i INTEGER;
BEGIN
    -- Update listing details
    UPDATE listings
    SET name = p_name,
        type = p_type,
        location = p_location,
        description = p_description,
        price = p_price,
        price_unit = p_price_unit,
        currency = p_currency,
        max_guests = p_max_guests,
        features = p_features,
        images = p_images,
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Get current inventory count
    SELECT COUNT(*) INTO current_inventory_count
    FROM listing_inventory WHERE listing_id = p_listing_id;

    -- Adjust inventory
    IF p_new_inventory_count > current_inventory_count THEN
        -- Add new units
        FOR i IN (current_inventory_count + 1)..p_new_inventory_count LOOP
            INSERT INTO listing_inventory (listing_id, name)
            VALUES (p_listing_id, p_name || ' - Unit ' || i);
        END LOOP;
    ELSIF p_new_inventory_count < current_inventory_count THEN
        -- Remove units, ensuring not to remove booked ones
        DELETE FROM listing_inventory
        WHERE id IN (
            SELECT id FROM listing_inventory
            WHERE listing_id = p_listing_id
            AND id NOT IN (
                SELECT unnest(inventory_ids) FROM bookings
                WHERE listing_id = p_listing_id AND status IN ('Confirmed', 'Pending')
            )
            ORDER BY id DESC
            LIMIT (current_inventory_count - p_new_inventory_count)
        );

        -- Check if enough units could be deleted
        SELECT COUNT(*) INTO current_inventory_count
        FROM listing_inventory WHERE listing_id = p_listing_id;
        
        IF current_inventory_count > p_new_inventory_count THEN
            RAISE EXCEPTION 'Cannot reduce inventory count as units are currently booked.';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Filter listings based on various criteria, including availability
CREATE OR REPLACE FUNCTION get_filtered_listings(
    location_filter TEXT,
    type_filter listing_type,
    guests_filter INTEGER,
    from_date_filter DATE,
    to_date_filter DATE
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    type listing_type,
    location TEXT,
    description TEXT,
    images TEXT[],
    price NUMERIC,
    price_unit price_unit_type,
    currency currency_type,
    rating NUMERIC,
    reviews JSONB,
    features TEXT[],
    max_guests INTEGER
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH available_listings AS (
        SELECT
            l.id,
            (SELECT COUNT(*) FROM listing_inventory li WHERE li.listing_id = l.id) - 
            (
                SELECT COUNT(DISTINCT b.inv_id)
                FROM bookings, unnest(inventory_ids) AS inv_id
                WHERE
                    bookings.listing_id = l.id
                    AND bookings.status = 'Confirmed'
                    AND (bookings.start_date, bookings.end_date) OVERLAPS (from_date_filter, to_date_filter)
            ) AS available_units
        FROM listings l
    )
    SELECT
        l.id,
        l.name,
        l.type,
        l.location,
        l.description,
        l.images,
        l.price,
        l.price_unit,
        l.currency,
        l.rating,
        (
            SELECT jsonb_agg(r)
            FROM jsonb_array_elements(l.reviews) AS r
            WHERE r->>'status' = 'approved'
        ),
        l.features,
        l.max_guests
    FROM listings l
    JOIN available_listings al ON l.id = al.id
    WHERE
        (location_filter IS NULL OR l.location ILIKE '%' || location_filter || '%')
        AND (type_filter IS NULL OR l.type = type_filter)
        AND (guests_filter IS NULL OR l.max_guests >= guests_filter)
        AND (from_date_filter IS NULL OR al.available_units > 0);
END;
$$ LANGUAGE plpgsql;


-- Add or update a review for a listing
CREATE OR REPLACE FUNCTION add_or_update_review(
    p_listing_id UUID,
    p_user_id UUID,
    p_author_name TEXT,
    p_avatar_url TEXT,
    p_rating INTEGER,
    p_comment TEXT
)
RETURNS void AS $$
DECLARE
    existing_review JSONB;
    new_review JSONB;
    review_index INTEGER;
BEGIN
    SELECT review, index - 1 INTO existing_review, review_index
    FROM listings, jsonb_array_elements(reviews) WITH ORDINALITY arr(review, index)
    WHERE id = p_listing_id AND review->>'userId' = p_user_id::text;

    new_review := jsonb_build_object(
        'id', gen_random_uuid()::text,
        'userId', p_user_id,
        'author', p_author_name,
        'avatar', p_avatar_url,
        'rating', p_rating,
        'comment', p_comment,
        'status', 'pending'
    );

    IF existing_review IS NOT NULL THEN
        -- Update existing review, keeping original ID but resetting status
        new_review := new_review || jsonb_build_object('id', existing_review->'id');
        UPDATE listings
        SET reviews = reviews - review_index || new_review
        WHERE id = p_listing_id;
    ELSE
        -- Add new review
        UPDATE listings
        SET reviews = reviews || new_review
        WHERE id = p_listing_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Approve a pending review
CREATE OR REPLACE FUNCTION approve_review(
    p_listing_id UUID,
    p_review_id TEXT
)
RETURNS void AS $$
DECLARE
    current_reviews JSONB;
    updated_reviews JSONB := '[]'::jsonb;
    review JSONB;
BEGIN
    SELECT reviews INTO current_reviews FROM listings WHERE id = p_listing_id;

    FOR review IN SELECT * FROM jsonb_array_elements(current_reviews)
    LOOP
        IF review->>'id' = p_review_id THEN
            updated_reviews := updated_reviews || (review || '{"status": "approved"}');
        ELSE
            updated_reviews := updated_reviews || review;
        END IF;
    END LOOP;

    UPDATE listings
    SET reviews = updated_reviews,
        rating = (
            SELECT AVG((r->>'rating')::numeric)
            FROM jsonb_array_elements(updated_reviews) AS r
            WHERE r->>'status' = 'approved'
        )
    WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Delete a review
CREATE OR REPLACE FUNCTION delete_review(
    p_listing_id UUID,
    p_review_id TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE listings
    SET reviews = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(reviews) AS elem
        WHERE elem->>'id' <> p_review_id
    )
    WHERE id = p_listing_id;

    -- Recalculate rating
    UPDATE listings
    SET rating = COALESCE((
        SELECT AVG((r->>'rating')::numeric)
        FROM jsonb_array_elements(reviews) AS r
        WHERE r->>'status' = 'approved'
    ), 0)
    WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create a booking and assign available inventory units
CREATE OR REPLACE FUNCTION create_booking_with_inventory_check(
    p_listing_id UUID,
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_guests INTEGER,
    p_num_units INTEGER,
    p_guest_email TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    total_inventory INTEGER;
    booked_inventory_ids UUID[];
    available_inventory_ids UUID[];
    assigned_inventory_ids UUID[];
    target_user_id UUID := p_user_id;
    target_user_status user_status;
    new_user_password TEXT;
    booking_user RECORD;
BEGIN
    -- Handle guest booking
    IF target_user_id IS NULL AND p_guest_email IS NOT NULL THEN
        SELECT id, status INTO booking_user FROM users WHERE email = p_guest_email;
        IF NOT FOUND THEN
            -- Create a provisional user
            new_user_password := substr(md5(random()::text), 0, 10);
            INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
            VALUES (current_setting('app.instance_id')::UUID, gen_random_uuid(), 'authenticated', 'authenticated', p_guest_email, crypt(new_user_password, gen_salt('bf')), NOW(), NULL, NULL, NULL, '{"provider":"email","providers":["email"]}', '{"provider":"email"}', NOW(), NOW(), NULL, '', NULL, NOW())
            RETURNING id INTO target_user_id;

            INSERT INTO users (id, name, email, role, status) 
            VALUES (target_user_id, 'Guest User', p_guest_email, 'guest', 'provisional');
        ELSE
            target_user_id := booking_user.id;
            target_user_status := booking_user.status;
        END IF;
    END IF;

    -- Find available inventory
    SELECT array_agg(id) INTO booked_inventory_ids
    FROM listing_inventory
    WHERE id IN (
        SELECT unnest(inventory_ids)
        FROM bookings
        WHERE listing_id = p_listing_id AND status = 'Confirmed' AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
    );

    SELECT array_agg(id) INTO available_inventory_ids
    FROM listing_inventory
    WHERE listing_id = p_listing_id AND (booked_inventory_ids IS NULL OR NOT (id = ANY(booked_inventory_ids)));

    -- Check availability
    IF array_length(available_inventory_ids, 1) < p_num_units THEN
        RAISE EXCEPTION 'Not enough units available for the selected dates. Available: %', COALESCE(array_length(available_inventory_ids, 1), 0);
    END IF;

    -- Assign inventory
    assigned_inventory_ids := available_inventory_ids[1:p_num_units];

    -- Create booking
    INSERT INTO bookings (listing_id, user_id, inventory_ids, start_date, end_date, guests)
    VALUES (p_listing_id, target_user_id, assigned_inventory_ids, p_start_date, p_end_date, p_guests);

    IF new_user_password IS NOT NULL THEN
        RETURN 'Booking created. A provisional account was made for ' || p_guest_email || '. Please check email for details.';
    ELSE
        RETURN 'Your booking request has been sent and is pending confirmation.';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Update a booking, re-checking for inventory availability
CREATE OR REPLACE FUNCTION update_booking_with_inventory_check(
    p_booking_id UUID,
    p_new_start_date DATE,
    p_new_end_date DATE,
    p_new_guests INTEGER,
    p_new_num_units INTEGER,
    p_editor_id UUID,
    p_editor_name TEXT
)
RETURNS void AS $$
DECLARE
    current_listing_id UUID;
    booked_inventory_ids UUID[];
    available_inventory_ids UUID[];
    assigned_inventory_ids UUID[];
BEGIN
    SELECT listing_id INTO current_listing_id FROM bookings WHERE id = p_booking_id;
    
    -- Find available inventory, excluding units from the current booking
    SELECT array_agg(id) INTO booked_inventory_ids
    FROM listing_inventory
    WHERE id IN (
        SELECT unnest(inventory_ids)
        FROM bookings
        WHERE listing_id = current_listing_id AND id != p_booking_id AND status = 'Confirmed' AND (start_date, end_date) OVERLAPS (p_new_start_date, p_new_end_date)
    );

    SELECT array_agg(id) INTO available_inventory_ids
    FROM listing_inventory
    WHERE listing_id = current_listing_id AND (booked_inventory_ids IS NULL OR NOT (id = ANY(booked_inventory_ids)));

    -- Check availability
    IF array_length(available_inventory_ids, 1) < p_new_num_units THEN
        RAISE EXCEPTION 'Not enough units available for the new dates. Available: %', COALESCE(array_length(available_inventory_ids, 1), 0);
    END IF;
    
    assigned_inventory_ids := available_inventory_ids[1:p_new_num_units];

    -- Update booking
    UPDATE bookings
    SET start_date = p_new_start_date,
        end_date = p_new_end_date,
        guests = p_new_guests,
        inventory_ids = assigned_inventory_ids,
        status = 'Pending',
        action_by_user_id = p_editor_id,
        action_at = NOW(),
        status_message = 'Booking was modified by ' || p_editor_name || ' on ' || NOW()::date,
        updated_at = NOW()
    WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Confirm a booking, performing a final availability check
CREATE OR REPLACE FUNCTION confirm_booking_with_inventory_check(
    p_booking_id UUID,
    p_admin_id UUID,
    p_admin_name TEXT
)
RETURNS void AS $$
DECLARE
    booking_to_confirm RECORD;
    booked_inventory_ids UUID[];
    is_available BOOLEAN := true;
BEGIN
    SELECT * INTO booking_to_confirm FROM bookings WHERE id = p_booking_id;

    -- Final check
    FOR i IN 1..array_length(booking_to_confirm.inventory_ids, 1) LOOP
        SELECT NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id != p_booking_id
            AND b.listing_id = booking_to_confirm.listing_id
            AND b.status = 'Confirmed'
            AND booking_to_confirm.inventory_ids[i] = ANY(b.inventory_ids)
            AND (b.start_date, b.end_date) OVERLAPS (booking_to_confirm.start_date, booking_to_confirm.end_date)
        ) INTO is_available;

        IF NOT is_available THEN
            RAISE EXCEPTION 'Unit % is no longer available for the selected dates.', booking_to_confirm.inventory_ids[i];
        END IF;
    END LOOP;

    UPDATE bookings
    SET status = 'Confirmed',
        action_by_user_id = p_admin_id,
        action_at = NOW(),
        status_message = 'Booking confirmed by ' || p_admin_name || ' on ' || NOW()::date
    WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql;


-- Merge multiple listings into a primary one
CREATE OR REPLACE FUNCTION merge_listings(
    p_primary_listing_id UUID,
    p_listing_ids_to_merge UUID[]
)
RETURNS void AS $$
DECLARE
    merged_images TEXT[];
    merged_features TEXT[];
    merged_reviews JSONB;
BEGIN
    -- Aggregate data
    SELECT array_agg(DISTINCT image), array_agg(DISTINCT feature), jsonb_agg(DISTINCT review)
    INTO merged_images, merged_features, merged_reviews
    FROM (
        SELECT unnest(images) as image, NULL as feature, NULL as review FROM listings WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
        UNION ALL
        SELECT NULL, unnest(features), NULL FROM listings WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
        UNION ALL
        SELECT NULL, NULL, jsonb_array_elements(reviews) FROM listings WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
    ) as source;

    -- Update primary listing
    UPDATE listings
    SET images = merged_images,
        features = merged_features,
        reviews = merged_reviews
    WHERE id = p_primary_listing_id;

    -- Move inventory, bookings, etc.
    UPDATE listing_inventory SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);
    UPDATE bookings SET listing_id = p_primary_listing_id WHERE listing_id = ANY(p_listing_ids_to_merge);

    -- Delete merged listings
    DELETE FROM listings WHERE id = ANY(p_listing_ids_to_merge);
END;
$$ LANGUAGE plpgsql;

-- Bulk delete listings
CREATE OR REPLACE FUNCTION bulk_delete_listings(p_listing_ids UUID[])
RETURNS void AS $$
DECLARE
  conflicting_listings INT;
BEGIN
  SELECT count(*) INTO conflicting_listings
  FROM bookings
  WHERE listing_id = ANY(p_listing_ids) AND status IN ('Confirmed', 'Pending');

  IF conflicting_listings > 0 THEN
    RAISE EXCEPTION 'Cannot delete. % listing(s) have active or pending bookings.', conflicting_listings;
  END IF;

  DELETE FROM listings WHERE id = ANY(p_listing_ids);
END;
$$ LANGUAGE plpgsql;
