
BEGIN;

-- For any existing bookings that might not have a data field, initialize it.
UPDATE bookings
SET data = '{}'::jsonb
WHERE data IS NULL;

-- Initialize an empty actions array for all bookings.
UPDATE bookings
SET data = data || '{"actions": []}'::jsonb
WHERE data -> 'actions' IS NULL;

-- Create an initial "Created" action based on old data fields.
-- This is a simplified migration. More complex history from status_message is not fully parsed.
UPDATE bookings b
SET data = b.data || jsonb_build_object(
    'actions',
    jsonb_build_array(
        jsonb_build_object(
            'timestamp', COALESCE(b.data ->> 'created_at', b.created_at::text),
            'actorId', b.user_id,
            'actorName', COALESCE(u.data ->> 'name', 'Unknown User'),
            'action', 'Created',
            'message', COALESCE(b.data ->> 'status_message', 'Booking created.')
        )
    )
)
FROM users u
WHERE b.user_id = u.id AND jsonb_array_length(b.data->'actions') = 0;

-- Remove old, now-redundant fields from the data column.
UPDATE bookings
SET data = data - 'created_at' - 'status_message' - 'action_at' - 'action_by_user_id';

COMMIT;
