-- Drop existing objects in reverse order of dependency
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.listing_inventory;
DROP TABLE IF EXISTS public.listings;
DROP TABLE IF EXISTS public.users;

DROP TYPE IF EXISTS public.listing_type;
DROP TYPE IF EXISTS public.price_unit_type;
DROP TYPE IF EXISTS public.currency_type;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.user_status;
DROP TYPE IF EXISTS public.booking_status;
DROP TYPE IF EXISTS public.review_status;

-- Recreate types
CREATE TYPE public.listing_type AS ENUM ('hotel', 'events', 'restaurant');
CREATE TYPE public.price_unit_type AS ENUM ('night', 'hour', 'person');
CREATE TYPE public.currency_type AS ENUM ('USD', 'EUR', 'GBP', 'NGN');
CREATE TYPE public.user_role AS ENUM ('admin', 'guest', 'staff');
CREATE TYPE public.user_status AS ENUM ('active', 'disabled', 'provisional');
CREATE TYPE public.booking_status AS ENUM ('Confirmed', 'Pending', 'Cancelled');
CREATE TYPE public.review_status AS ENUM ('pending', 'approved');

-- Recreate tables
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role user_role NOT NULL DEFAULT 'guest',
    status user_status NOT NULL DEFAULT 'active',
    phone text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE public.listings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type listing_type NOT NULL,
    location text NOT NULL,
    description text NOT NULL,
    images jsonb NOT NULL DEFAULT '[]'::jsonb,
    price numeric NOT NULL,
    price_unit price_unit_type NOT NULL,
    currency currency_type NOT NULL DEFAULT 'NGN',
    rating numeric NOT NULL DEFAULT 0,
    reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
    features jsonb NOT NULL DEFAULT '[]'::jsonb,
    max_guests integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT listings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.listing_inventory (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT listing_inventory_pkey PRIMARY KEY (id),
    CONSTRAINT listing_inventory_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

CREATE TABLE public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    inventory_ids uuid[] NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    guests integer NOT NULL,
    status booking_status NOT NULL DEFAULT 'Pending',
    status_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    action_by_user_id uuid,
    action_at timestamp with time zone,
    CONSTRAINT bookings_pkey PRIMARY KEY (id),
    CONSTRAINT bookings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT,
    CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT bookings_action_by_user_id_fkey FOREIGN KEY (action_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL
);


CREATE TABLE public.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Policies (Simplified - relies on server-side logic for security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow full access for the service_role, which is used by server actions.
-- This bypasses RLS for trusted server-side operations.
CREATE POLICY "Allow all access for service_role" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all access for service_role" ON public.listings FOR ALL USING (true);
CREATE POLICY "Allow all access for service_role" ON public.listing_inventory FOR ALL USING (true);
CREATE POLICY "Allow all access for service_role" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Allow all access for service_role" ON public.sessions FOR ALL USING (true);

-- Allow public read access for browsing.
CREATE POLICY "Allow public read-only access." ON public.listings FOR SELECT USING (true);
CREATE POLICY "Allow public read-only access." ON public.listing_inventory FOR SELECT USING (true);
CREATE POLICY "Allow public read-only access." ON public.users FOR SELECT USING (true);
