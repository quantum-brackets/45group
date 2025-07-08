
-- 1. TABLES

-- USERS Table
-- Stores public user data. Note that sensitive auth data is in auth.users.
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT CHECK (role IN ('admin', 'staff', 'guest')) NOT NULL DEFAULT 'guest',
    status TEXT CHECK (status IN ('active', 'disabled', 'provisional')) NOT NULL DEFAULT 'active',
    phone TEXT,
    notes TEXT
);
COMMENT ON TABLE users IS 'Public user profiles, linked to auth.users.';

-- LISTINGS Table
-- Stores all property listings.
CREATE TABLE listings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('hotel', 'events', 'restaurant')) NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    images JSONB,
    price REAL NOT NULL,
    "priceUnit" TEXT CHECK ("priceUnit" IN ('night', 'hour', 'person')) NOT NULL,
    currency TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    reviews JSONB,
    features JSONB,
    "maxGuests" INTEGER NOT NULL
);
COMMENT ON TABLE listings IS 'All property listings for booking.';

-- LISTING_INVENTORY Table
-- Stores individual bookable units for each listing.
CREATE TABLE listing_inventory (
    id TEXT PRIMARY KEY,
    "listingId" TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);
COMMENT ON TABLE listing_inventory IS 'Individual bookable units (e.g., rooms, tables).';

-- BOOKINGS Table
-- Stores all booking information.
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    "listingId" TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    guests INTEGER NOT NULL,
    status TEXT CHECK (status IN ('Confirmed', 'Pending', 'Cancelled')) NOT NULL,
    "listingName" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "actionByUserId" UUID REFERENCES users(id),
    "actionAt" TIMESTAMPTZ,
    "statusMessage" TEXT,
    "inventoryIds" JSONB
);
COMMENT ON TABLE bookings IS 'Records of all bookings made by users.';

-- 2. ROW LEVEL SECURITY (RLS)
-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR 'users' table
CREATE POLICY "Users can view their own profile." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all user profiles." ON users FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Staff can view user profiles." ON users FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'staff'
);

-- POLICIES FOR 'listings' table
CREATE POLICY "All users can view listings." ON listings FOR SELECT USING (true);
CREATE POLICY "Admins can manage all listings." ON listings FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- POLICIES FOR 'listing_inventory' table
CREATE POLICY "All users can view inventory." ON listing_inventory FOR SELECT USING (true);
CREATE POLICY "Admins can manage all inventory." ON listing_inventory FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- POLICIES FOR 'bookings' table
CREATE POLICY "Users can view their own bookings." ON bookings FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "Users can create bookings." ON bookings FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Users can cancel their own bookings." ON bookings FOR UPDATE USING (auth.uid() = "userId");
CREATE POLICY "Admins and staff can view all bookings." ON bookings FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Admins can manage all bookings." ON bookings FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);


-- 3. AUTH TRIGGERS
-- This function automatically creates a public user profile when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger calls the function after a new user is created.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. STORED PROCEDURES (for RPC)

-- Function to get filtered listings, handling complex availability checks.
CREATE OR REPLACE FUNCTION get_filtered_listings(
    location_filter TEXT,
    type_filter TEXT,
    guests_filter INTEGER,
    from_date_filter DATE,
    to_date_filter DATE
)
RETURNS SETOF listings AS $$
BEGIN
    RETURN QUERY
    SELECT l.*
    FROM listings l
    WHERE
        (location_filter IS NULL OR l.location ILIKE '%' || location_filter || '%')
    AND
        (type_filter IS NULL OR l.type = type_filter)
    AND
        (guests_filter IS NULL OR l."maxGuests" >= guests_filter)
    AND
        (from_date_filter IS NULL OR (
            (SELECT COUNT(*) FROM listing_inventory WHERE "listingId" = l.id) >
            (SELECT COUNT(DISTINCT elem->>0)
             FROM bookings b
             CROSS JOIN LATERAL jsonb_array_elements_text(b."inventoryIds") AS elem
             WHERE b."listingId" = l.id
               AND b.status = 'Confirmed'
               AND (b."endDate" >= from_date_filter AND b."startDate" <= to_date_filter)
            )
        ))
    ORDER BY l.location, l.type, l.name;
END;
$$ LANGUAGE plpgsql;

-- Function to create a listing and its inventory atomically.
CREATE OR REPLACE FUNCTION create_listing_with_inventory(
    p_id TEXT,
    p_name TEXT,
    p_type TEXT,
    p_location TEXT,
    p_description TEXT,
    p_images JSONB,
    p_price REAL,
    p_price_unit TEXT,
    p_currency TEXT,
    p_max_guests INTEGER,
    p_features JSONB,
    p_inventory_count INTEGER
)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
BEGIN
    INSERT INTO listings (id, name, type, location, description, images, price, "priceUnit", currency, "maxGuests", features, rating, reviews)
    VALUES (p_id, p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features, 0, '[]'::jsonb);

    FOR i IN 1..p_inventory_count LOOP
        INSERT INTO listing_inventory (id, "listingId", name)
        VALUES ('inv-' || gen_random_uuid(), p_id, p_name || ' - Unit ' || i);
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- Function to update a listing and reconcile its inventory.
CREATE OR REPLACE FUNCTION update_listing_with_inventory(
    p_listing_id TEXT,
    p_name TEXT,
    p_type TEXT,
    p_location TEXT,
    p_description TEXT,
    p_price REAL,
    p_price_unit TEXT,
    p_currency TEXT,
    p_max_guests INTEGER,
    p_features JSONB,
    p_images JSONB,
    p_new_inventory_count INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
    deletable_inventory_ids TEXT[];
    count_to_delete INTEGER;
BEGIN
    -- Update the main listing details
    UPDATE listings
    SET
        name = p_name,
        type = p_type,
        location = p_location,
        description = p_description,
        price = p_price,
        "priceUnit" = p_price_unit,
        currency = p_currency,
        "maxGuests" = p_max_guests,
        features = p_features,
        images = p_images
    WHERE id = p_listing_id;

    -- Reconcile inventory
    SELECT COUNT(*) INTO current_count FROM listing_inventory WHERE "listingId" = p_listing_id;

    IF p_new_inventory_count > current_count THEN
        -- Add new inventory items
        FOR i IN (current_count + 1)..p_new_inventory_count LOOP
            INSERT INTO listing_inventory (id, "listingId", name)
            VALUES ('inv-' || gen_random_uuid(), p_listing_id, p_name || ' - Unit ' || i);
        END LOOP;
    ELSIF p_new_inventory_count < current_count THEN
        -- Remove inventory items, avoiding those that are currently booked
        SELECT array_agg(li.id)
        INTO deletable_inventory_ids
        FROM listing_inventory li
        WHERE li."listingId" = p_listing_id
        AND NOT EXISTS (
            SELECT 1
            FROM bookings b, jsonb_array_elements_text(b."inventoryIds") AS booked_id
            WHERE b.status != 'Cancelled' AND booked_id = li.id
        );

        count_to_delete := current_count - p_new_inventory_count;

        IF array_length(deletable_inventory_ids, 1) < count_to_delete THEN
            RAISE EXCEPTION 'Cannot reduce inventory to %. Only % units are available for removal.', p_new_inventory_count, array_length(deletable_inventory_ids, 1);
        END IF;

        IF count_to_delete > 0 THEN
          DELETE FROM listing_inventory
          WHERE id IN (SELECT unnest(deletable_inventory_ids) LIMIT count_to_delete);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Function to delete a listing, with a check for active bookings.
CREATE OR REPLACE FUNCTION delete_listing_with_bookings_check(p_listing_id TEXT)
RETURNS VOID AS $$
DECLARE
    booking_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO booking_count
    FROM bookings
    WHERE "listingId" = p_listing_id AND status != 'Cancelled';

    IF booking_count > 0 THEN
        RAISE EXCEPTION 'This listing cannot be deleted because it has % active or pending bookings.', booking_count;
    END IF;

    -- Cascading delete will handle inventory and bookings due to FOREIGN KEY constraints
    DELETE FROM listings WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk delete listings
CREATE OR REPLACE FUNCTION bulk_delete_listings(p_listing_ids TEXT[])
RETURNS VOID AS $$
DECLARE
    booking_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO booking_count
    FROM bookings
    WHERE "listingId" = ANY(p_listing_ids) AND status <> 'Cancelled';

    IF booking_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete. One or more selected listings have active bookings.';
    END IF;

    DELETE FROM listings WHERE id = ANY(p_listing_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to merge listings
CREATE OR REPLACE FUNCTION merge_listings(
    p_primary_listing_id TEXT,
    p_listing_ids_to_merge TEXT[]
)
RETURNS VOID AS $$
DECLARE
    primary_listing_name TEXT;
    merged_images JSONB;
    merged_features JSONB;
    merged_reviews JSONB;
    new_average_rating REAL;
BEGIN
    -- Get primary listing name for updating bookings
    SELECT name INTO primary_listing_name FROM listings WHERE id = p_primary_listing_id;

    -- Combine images, features, and reviews
    SELECT jsonb_agg(DISTINCT image), jsonb_agg(DISTINCT feature), jsonb_agg(review)
    INTO merged_images, merged_features, merged_reviews
    FROM (
        SELECT jsonb_array_elements_text(images) AS image, NULL AS feature, NULL::jsonb AS review FROM listings WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
        UNION ALL
        SELECT NULL, jsonb_array_elements_text(features) AS feature, NULL FROM listings WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
        UNION ALL
        SELECT NULL, NULL, jsonb_array_elements(reviews) AS review FROM listings WHERE id = ANY(p_listing_ids_to_merge) OR id = p_primary_listing_id
    ) AS combined_data;
    
    -- Recalculate rating
    SELECT COALESCE(AVG((review->>'rating')::real), 0)
    INTO new_average_rating
    FROM jsonb_array_elements(merged_reviews) AS review;

    -- Update primary listing
    UPDATE listings
    SET images = merged_images, features = merged_features, reviews = merged_reviews, rating = new_average_rating
    WHERE id = p_primary_listing_id;

    -- Re-assign inventory and bookings
    UPDATE listing_inventory SET "listingId" = p_primary_listing_id WHERE "listingId" = ANY(p_listing_ids_to_merge);
    UPDATE bookings SET "listingId" = p_primary_listing_id, "listingName" = primary_listing_name WHERE "listingId" = ANY(p_listing_ids_to_merge);

    -- Delete merged listings
    DELETE FROM listings WHERE id = ANY(p_listing_ids_to_merge);

END;
$$ LANGUAGE plpgsql;

-- Function to create a booking after checking inventory
CREATE OR REPLACE FUNCTION create_booking_with_inventory_check(
    p_listing_id TEXT,
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_guests INTEGER,
    p_num_units INTEGER,
    p_guest_email TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID := p_user_id;
    is_new_user BOOLEAN := FALSE;
    available_inventory_ids TEXT[];
    inventory_to_book TEXT[];
    new_booking_id TEXT := 'booking-' || gen_random_uuid();
    listing_name_val TEXT;
    max_guests_val INTEGER;
    success_message TEXT;
BEGIN
    -- 1. Determine User ID
    IF target_user_id IS NULL AND p_guest_email IS NOT NULL THEN
        SELECT id INTO target_user_id FROM users WHERE email = p_guest_email;
        IF target_user_id IS NULL THEN
            is_new_user := TRUE;
            target_user_id := gen_random_uuid();
            -- This relies on the auth trigger to be disabled for this special insert, or handle it differently.
            -- For simplicity, we assume we can insert directly. A more robust solution might use a different flow.
            -- This is a temporary user until they sign up.
            INSERT INTO users(id, name, email, role, status)
            VALUES (target_user_id, split_part(p_guest_email, '@', 1), p_guest_email, 'guest', 'provisional');
        END IF;
    END IF;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found or email not provided for guest booking.';
    END IF;

    -- 2. Get Listing Info
    SELECT name, "maxGuests" INTO listing_name_val, max_guests_val FROM listings WHERE id = p_listing_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found.';
    END IF;

    IF p_guests > max_guests_val * p_num_units THEN
        RAISE EXCEPTION 'Number of guests exceeds the capacity for % unit(s).', p_num_units;
    END IF;

    -- 3. Check Availability
    SELECT array_agg(li.id)
    INTO available_inventory_ids
    FROM listing_inventory li
    WHERE li."listingId" = p_listing_id
    AND NOT EXISTS (
        SELECT 1
        FROM bookings b, jsonb_array_elements_text(b."inventoryIds") AS booked_id
        WHERE b.status = 'Confirmed'
          AND booked_id = li.id
          AND (b."endDate" >= p_start_date AND b."startDate" <= p_end_date)
    );

    IF array_length(available_inventory_ids, 1) < p_num_units THEN
        RAISE EXCEPTION 'Sorry, only % units are available for these dates.', array_length(available_inventory_ids, 1);
    END IF;

    inventory_to_book := available_inventory_ids[1:p_num_units];

    -- 4. Create Booking
    INSERT INTO bookings (id, "listingId", "userId", "startDate", "endDate", guests, status, "listingName", "inventoryIds")
    VALUES (new_booking_id, p_listing_id, target_user_id, p_start_date, p_end_date, p_guests, 'Pending', listing_name_val, to_jsonb(inventory_to_book));

    -- 5. Construct Success Message
    success_message := 'Your booking request for ' || listing_name_val || ' is now pending confirmation.';
    IF p_guest_email IS NOT NULL THEN
        IF is_new_user THEN
            success_message := success_message || ' An account has been reserved for ' || p_guest_email || '. Please go to the sign-up page to create a password and manage your bookings.';
        ELSE
            success_message := success_message || ' This booking has been added to the account for ' || p_guest_email || '. Please log in to manage your bookings.';
        END IF;
    END IF;
    
    RETURN success_message;

END;
$$ LANGUAGE plpgsql;

