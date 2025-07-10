-- Create the role_permissions table to store permissions for each role.
-- Permissions are stored in a JSONB 'data' column to align with the application's data modeling strategy.
CREATE TABLE role_permissions (
    role TEXT PRIMARY KEY,
    data JSONB
);

-- Enable Row Level Security
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- No policies are needed for this table as it's only accessed by the admin service role.

-- Insert default permissions for the 'guest' role.
-- Guests can create and manage their own bookings and reviews.
INSERT INTO role_permissions (role, data) VALUES
('guest', '{"permissions": ["booking:create:own", "booking:read:own", "booking:update:own", "booking:cancel:own", "review:create:own", "user:update:own"]}');

-- Insert default permissions for the 'staff' role.
-- Staff can read users and listings, but cannot create, update, or delete them.
-- They have full read access to all bookings.
INSERT INTO role_permissions (role, data) VALUES
('staff', '{"permissions": ["dashboard:read", "user:read", "listing:read", "booking:read"]}');

-- Note: The 'admin' role has all permissions hardcoded in the application logic
-- and does not require an entry in this table.
