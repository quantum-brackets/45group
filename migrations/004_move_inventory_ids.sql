-- Move inventory_ids from a top-level column to the data JSONB column for consistency.
-- This script assumes the 'bookings' table has an 'inventory_ids' uuid[] column and a 'data' jsonb column.

BEGIN;

-- Step 1: Add the 'inventoryIds' key to the 'data' JSONB object, populating it with the value from the 'inventory_ids' column.
-- We use jsonb_set to safely add or update the key.
UPDATE bookings
SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb), -- Ensure data is not null
    '{inventoryIds}',           -- The key to add/update
    to_jsonb(inventory_ids)     -- The value from the old column, converted to a JSON array
)
WHERE inventory_ids IS NOT NULL; -- Only run for rows that have inventory_ids

-- Step 2: Drop the now-redundant 'inventory_ids' column.
ALTER TABLE bookings
DROP COLUMN IF EXISTS inventory_ids;

COMMIT;
