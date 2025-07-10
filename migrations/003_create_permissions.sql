-- Create the role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role TEXT PRIMARY KEY,
    permissions TEXT[] NOT NULL
);

-- Enable RLS if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions' AND rowsecurity = 't') THEN
        ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


-- Grant access to the service_role for admin operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO service_role;


-- Upsert default permissions for each role.
-- Using an ON CONFLICT clause to prevent errors if the script is run multiple times.

-- Guest permissions
INSERT INTO public.role_permissions (role, permissions)
VALUES (
    'guest',
    ARRAY[
        'user:update:own',
        'booking:read:own',
        'booking:create:own',
        'booking:update:own',
        'booking:cancel:own',
        'review:create:own'
    ]
)
ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions;

-- Staff permissions
INSERT INTO public.role_permissions (role, permissions)
VALUES (
    'staff',
    ARRAY[
        'dashboard:read',
        'user:read',
        'listing:read',
        'booking:read'
    ]
)
ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions;

-- Admin permissions (all permissions)
-- While the app hardcodes admin access, this makes the DB state complete and ready for future changes.
INSERT INTO public.role_permissions (role, permissions)
VALUES (
    'admin',
    ARRAY[
        'dashboard:read',
        'permissions:read',
        'permissions:update',
        'user:read',
        'user:create',
        'user:update',
        'user:delete',
        'user:update:own',
        'listing:read',
        'listing:create',
        'listing:update',
        'listing:delete',
        'booking:read',
        'booking:create',
        'booking:update',
        'booking:confirm',
        'booking:cancel',
        'booking:read:own',
        'booking:create:own',
        'booking:update:own',
        'booking:cancel:own',
        'review:create:own',
        'review:approve',
        'review:delete'
    ]
)
ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions;
