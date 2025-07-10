-- This script migrates data from separate columns into a single JSONB 'data' column
-- for the users, listings, and bookings tables. It is designed to be idempotent,
-- meaning it can be run multiple times without causing errors or data duplication.

BEGIN;

-- 1. Add 'data' JSONB columns to tables if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS data JSONB;

-- 2. Migrate Users Data
-- This creates the 'data' object from existing top-level columns.
-- It only runs on rows where 'data' hasn't been populated from these columns yet.
UPDATE users
SET data = jsonb_build_object(
    'name', name,
    'password', password,
    'phone', phone,
    'notes', notes
)
WHERE name IS NOT NULL AND (data IS NULL OR data->>'name' IS NULL); -- Use `name` as an indicator of an unmigrated row

-- 3. Migrate Listings Data
-- This merges top-level columns into the 'data' JSONB field.
-- It preserves existing JSONB data (like reviews) by using COALESCE and concatenation.
UPDATE listings
SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'name', name,
    'description', description,
    'images', images,
    'features', features,
    'price', price,
    'currency', currency,
    'price_unit', price_unit,
    'max_guests', max_guests
)
WHERE name IS NOT NULL AND (data IS NULL OR data->>'name' IS NULL); -- Use `name` as an indicator of an unmigrated row

-- 4. Recalculate and update rating for all listings based on reviews in the 'data' column
WITH review_ratings AS (
  SELECT
    id AS listing_id,
    COALESCE(
      (
        SELECT AVG((review->>'rating')::numeric)
        FROM jsonb_array_elements(data->'reviews') AS review
        WHERE review->>'status' = 'approved'
      ), 0
    ) AS average_rating
  FROM listings
  WHERE jsonb_typeof(data->'reviews') = 'array' AND jsonb_array_length(data->'reviews') > 0
)
UPDATE listings l
SET data = l.data || jsonb_build_object('rating', rr.average_rating)
FROM review_ratings rr
WHERE l.id = rr.listing_id;

-- Set rating to 0 and initialize reviews array for listings that don't have them.
UPDATE listings
SET data = COALESCE(data, '{}'::jsonb) || 
    CASE WHEN data->'reviews' IS NULL THEN '{"reviews": [], "rating": 0}'::jsonb ELSE '{"rating": 0}'::jsonb END
WHERE data->'rating' IS NULL;

-- 5. Migrate Bookings Data
-- This creates the 'data' object from existing top-level columns.
UPDATE bookings
SET data = jsonb_build_object(
    'guests', guests,
    'created_at', created_at,
    'status_message', status_message,
    'booking_name', booking_name
)
WHERE guests IS NOT NULL AND (data IS NULL OR data->>'guests' IS NULL); -- Use `guests` as an indicator of an unmigrated row


-- 6. Drop old columns
-- User columns
ALTER TABLE users DROP COLUMN IF EXISTS name;
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS notes;

-- Listing columns
ALTER TABLE listings DROP COLUMN IF EXISTS name;
ALTER TABLE listings DROP COLUMN IF EXISTS description;
ALTER TABLE listings DROP COLUMN IF EXISTS images;
ALTER TABLE listings DROP COLUMN IF EXISTS features;
ALTER TABLE listings DROP COLUMN IF EXISTS price;
ALTER TABLE listings DROP COLUMN IF EXISTS currency;
ALTER TABLE listings DROP COLUMN IF EXISTS price_unit;
ALTER TABLE listings DROP COLUMN IF EXISTS max_guests;
ALTER TABLE listings DROP COLUMN IF EXISTS rating; -- This was moved into data and recalculated

-- Booking columns
ALTER TABLE bookings DROP COLUMN IF EXISTS guests;
ALTER TABLE bookings DROP COLUMN IF EXISTS created_at;
ALTER TABLE bookings DROP COLUMN IF EXISTS status_message;
ALTER TABLE bookings DROP COLUMN IF EXISTS booking_name;

COMMIT;
