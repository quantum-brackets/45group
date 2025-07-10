-- Migration Script: From Relational Columns to JSONB
--
-- This script migrates the database schema to consolidate non-indexed fields
-- into a single `data` JSONB column for the `users`, `listings`, and `bookings` tables.
-- It also moves the contents of the `reviews` table into the `listings.data` field.
--
-- !!! IMPORTANT !!!
-- 1. **BACKUP YOUR DATABASE** before running this script.
-- 2. This script assumes the "old" schema structure with individual columns.
-- 3. Run this script as a single transaction to ensure data integrity.

BEGIN;

-- =============================================
-- Step 1: Add `data` columns if they don't exist
-- =============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS data JSONB;


-- =============================================
-- Step 2: Migrate `users` table
-- =============================================

-- Populate the new `data` column with existing user attributes.
UPDATE public.users
SET data = jsonb_build_object(
    'name', name,
    'password', password,
    'phone', phone,
    'notes', notes
)
WHERE data IS NULL; -- Only run on rows that haven't been migrated

-- Drop the old columns from the `users` table.
-- Note: You may want to comment these out on the first run to verify data.
ALTER TABLE public.users
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS password,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS notes;


-- =============================================
-- Step 3: Migrate `reviews` into `listings`
-- =============================================

-- Create a temporary table to hold aggregated reviews and ratings per listing.
CREATE TEMPORARY TABLE temp_listing_reviews AS
SELECT
    r.listing_id,
    jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'user_id', r.user_id,
            'author', u.data->>'name', -- Assumes users table is already migrated
            'avatar', 'https://avatar.vercel.sh/' || u.email || '.png',
            'rating', r.rating,
            'comment', r.comment,
            'status', r.status
        ) ORDER BY r.created_at DESC
    ) AS reviews,
    -- Calculate the average rating only from 'approved' reviews
    COALESCE(
        AVG(r.rating) FILTER (WHERE r.status = 'approved'),
        0
    ) AS average_rating
FROM
    public.reviews r
JOIN
    public.users u ON r.user_id = u.id
GROUP BY
    r.listing_id;


-- =============================================
-- Step 4: Migrate `listings` table
-- =============================================

-- Populate the new `data` column for listings that have reviews.
UPDATE public.listings l
SET data = jsonb_build_object(
    'name', l.name,
    'description', l.description,
    'images', to_jsonb(l.images),
    'price', l.price,
    'price_unit', l.price_unit,
    'currency', l.currency,
    'max_guests', l.max_guests,
    'features', to_jsonb(l.features),
    'reviews', tlr.reviews,
    'rating', tlr.average_rating
)
FROM
    temp_listing_reviews tlr
WHERE
    l.id = tlr.listing_id
AND l.data IS NULL; -- Only run on rows that haven't been migrated

-- Handle listings that had no reviews
UPDATE public.listings
SET data = jsonb_build_object(
    'name', name,
    'description', description,
    'images', to_jsonb(images),
    'price', price,
    'price_unit', price_unit,
    'currency', currency,
    'max_guests', max_guests,
    'features', to_jsonb(features),
    'reviews', '[]'::jsonb,
    'rating', 0
)
WHERE data IS NULL; -- Only run on rows that haven't been migrated


-- Drop the old columns from the `listings` table.
ALTER TABLE public.listings
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS images,
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS price_unit,
DROP COLUMN IF EXISTS currency,
DROP COLUMN IF EXISTS max_guests,
DROP COLUMN IF EXISTS features,
DROP COLUMN IF EXISTS rating; -- Old rating was a simple float/numeric


-- =============================================
-- Step 5: Migrate `bookings` table
-- =============================================

-- Populate the new `data` column in the `bookings` table.
UPDATE public.bookings b
SET data = jsonb_build_object(
    'guests', b.guests,
    'created_at', to_char(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.USZ'),
    'status_message', b.status_message,
    'booking_name', u.data->>'name' -- Get name from already-migrated users table
)
FROM public.users u
WHERE b.user_id = u.id AND b.data IS NULL;

-- Handle bookings where the user might have been deleted or doesn't exist
UPDATE public.bookings
SET data = jsonb_build_object(
    'guests', guests,
    'created_at', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.USZ'),
    'status_message', status_message,
    'booking_name', 'Unknown User'
)
WHERE data IS NULL;


-- Drop the old columns from the `bookings` table.
ALTER TABLE public.bookings
DROP COLUMN IF EXISTS guests,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS total_price, -- This was derived, so safe to drop
DROP COLUMN IF EXISTS status_message;


-- =============================================
-- Step 6: Cleanup
-- =============================================

-- Drop the old `reviews` table as it's now embedded in `listings`.
DROP TABLE IF EXISTS public.reviews;
DROP TABLE temp_listing_reviews;

COMMIT;
