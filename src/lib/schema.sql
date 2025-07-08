-- Drop existing objects in reverse order of dependency
DROP FUNCTION IF EXISTS public.merge_listings(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.bulk_delete_listings(uuid[]);
DROP FUNCTION IF EXISTS public.delete_listing_with_bookings_check(uuid);
DROP FUNCTION IF EXISTS public.update_listing_with_inventory(uuid, text, listing_type, text, text, numeric, price_unit_type, currency_type, integer, jsonb, jsonb, integer);
DROP FUNCTION IF EXISTS public.create_listing_with_inventory(text, listing_type, text, text, jsonb, numeric, price_unit_type, currency_type, integer, jsonb, integer);
DROP FUNCTION IF EXISTS public.confirm_booking_with_inventory_check(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.update_booking_with_inventory_check(uuid, timestamp with time zone, timestamp with time zone, integer, integer, uuid, text);
DROP FUNCTION IF EXISTS public.create_booking_with_inventory_check(uuid, uuid, timestamp with time zone, timestamp with time zone, integer, integer, text);
DROP FUNCTION IF EXISTS public.get_filtered_listings(text, text, integer, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.delete_review(uuid, uuid);
DROP FUNCTION IF EXISTS public.approve_review(uuid, uuid);
DROP FUNCTION IF EXISTS public.add_or_update_review(uuid, uuid, text, text, integer, text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

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


-- Functions

create
or replace function public.get_filtered_listings (
  location_filter text,
  type_filter text,
  guests_filter integer,
  from_date_filter timestamp with time zone,
  to_date_filter timestamp with time zone
) returns table (
  id uuid,
  name text,
  type listing_type,
  location text,
  description text,
  images jsonb,
  price numeric,
  price_unit price_unit_type,
  currency currency_type,
  rating numeric,
  reviews jsonb,
  features jsonb,
  max_guests integer
) as $$
begin
  return query
  select
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
    l.reviews,
    l.features,
    l.max_guests
  from
    public.listings l
  where
    (location_filter is null or l.location ilike '%' || location_filter || '%')
    and (type_filter is null or l.type = type_filter::listing_type)
    and (guests_filter is null or l.max_guests >= guests_filter)
    and (
      (from_date_filter is null and to_date_filter is null) or
      (
        (select count(li.id) from public.listing_inventory li where li.listing_id = l.id) >
        coalesce((
            select count(distinct unnested.inventory_id)
            from public.bookings b, unnest(b.inventory_ids) as unnested(inventory_id)
            where b.listing_id = l.id
              and b.status = 'Confirmed'
              and tstzrange(b.start_date, b.end_date, '[]') && tstzrange(from_date_filter, to_date_filter, '[]')
        ), 0)
      )
    );
end;
$$ language plpgsql security definer;


create
or replace function public.create_booking_with_inventory_check (
  p_listing_id uuid,
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_guests integer,
  p_num_units integer,
  p_guest_email text default null
) returns text as $$
declare
    v_available_inventory_ids uuid[];
    v_total_inventory_count integer;
    v_booked_inventory_ids uuid[];
    v_final_user_id uuid := p_user_id;
    v_new_user_id uuid;
    v_booking_id uuid;
    v_listing_name text;
    v_user_name text;
begin
    -- Determine the user ID. If a guest email is provided, find or create the user.
    if p_guest_email is not null then
        select id into v_final_user_id from public.users where email = p_guest_email;
        if v_final_user_id is null then
            v_new_user_id := gen_random_uuid();
            insert into public.users (id, name, email, password, role, status)
            values (v_new_user_id, p_guest_email, p_guest_email, 'provisional_password', 'guest', 'provisional');
            v_final_user_id := v_new_user_id;
        end if;
    end if;

    if v_final_user_id is null then
        raise exception 'User identification failed.';
    end if;

    -- Get total inventory count for the listing
    select count(*) into v_total_inventory_count from public.listing_inventory where listing_id = p_listing_id;

    -- Get all inventory IDs that are already booked in the requested date range
    select array_agg(distinct elem) into v_booked_inventory_ids
    from public.bookings, unnest(inventory_ids) elem
    where listing_id = p_listing_id
      and status = 'Confirmed'
      and tstzrange(start_date, end_date, '[]') && tstzrange(p_start_date, p_end_date, '[]');

    -- Find available inventory IDs
    select array_agg(id) into v_available_inventory_ids
    from public.listing_inventory
    where listing_id = p_listing_id
      and id <> all(coalesce(v_booked_inventory_ids, '{}'));

    -- Check if there's enough available inventory
    if array_length(v_available_inventory_ids, 1) < p_num_units then
        raise exception 'Not enough available units for the selected dates. Only % units available.', array_length(v_available_inventory_ids, 1);
    end if;

    -- Insert the new booking with the available inventory IDs
    insert into public.bookings (listing_id, user_id, start_date, end_date, guests, inventory_ids)
    values (p_listing_id, v_final_user_id, p_start_date, p_end_date, p_guests, v_available_inventory_ids[1:p_num_units])
    returning id into v_booking_id;
    
    select name into v_listing_name from public.listings where id = p_listing_id;
    select name into v_user_name from public.users where id = v_final_user_id;

    if v_booking_id is not null then
        return 'Booking request for ' || v_listing_name || ' by ' || v_user_name || ' has been submitted and is now pending approval. You will be notified upon confirmation.';
    else
        raise exception 'Failed to create booking record.';
    end if;

end;
$$ language plpgsql;


create or replace function public.update_booking_with_inventory_check(
    p_booking_id uuid,
    p_new_start_date timestamptz,
    p_new_end_date timestamptz,
    p_new_guests integer,
    p_new_num_units integer,
    p_editor_id uuid,
    p_editor_name text
)
returns void as $$
declare
    v_listing_id uuid;
    v_current_inventory_ids uuid[];
    v_available_inventory_ids uuid[];
    v_booked_inventory_ids uuid[];
begin
    -- Get listing ID and current inventory from the booking
    select listing_id, inventory_ids into v_listing_id, v_current_inventory_ids from public.bookings where id = p_booking_id;

    -- Get all inventory IDs for the listing that are booked in the new date range, excluding the ones from the current booking
    select array_agg(distinct elem) into v_booked_inventory_ids
    from public.bookings, unnest(inventory_ids) elem
    where listing_id = v_listing_id
      and id <> p_booking_id
      and status = 'Confirmed'
      and tstzrange(start_date, end_date, '[]') && tstzrange(p_new_start_date, p_new_end_date, '[]');

    -- Find available inventory IDs (all units for the listing minus those booked by others)
    select array_agg(id) into v_available_inventory_ids
    from public.listing_inventory
    where listing_id = v_listing_id
      and id <> all(coalesce(v_booked_inventory_ids, '{}'));

    -- Check if there's enough available inventory for the requested number of units
    if array_length(v_available_inventory_ids, 1) < p_new_num_units then
        raise exception 'Not enough available units for the selected dates. Only % units available.', array_length(v_available_inventory_ids, 1);
    end if;
    
    -- Update the booking with new details and set status to 'Pending'
    update public.bookings
    set
        start_date = p_new_start_date,
        end_date = p_new_end_date,
        guests = p_new_guests,
        inventory_ids = v_available_inventory_ids[1:p_new_num_units],
        status = 'Pending',
        action_by_user_id = p_editor_id,
        action_at = now(),
        status_message = 'Booking updated by ' || p_editor_name || ' on ' || to_char(now(), 'YYYY-MM-DD') || '. Awaiting re-confirmation.'
    where id = p_booking_id;
end;
$$ language plpgsql;


create or replace function public.confirm_booking_with_inventory_check(
    p_booking_id uuid,
    p_admin_id uuid,
    p_admin_name text
)
returns void as $$
declare
    v_listing_id uuid;
    v_start_date timestamptz;
    v_end_date timestamptz;
    v_inventory_ids uuid[];
    v_conflicting_bookings integer;
begin
    -- Get the details of the booking to be confirmed
    select listing_id, start_date, end_date, inventory_ids
    into v_listing_id, v_start_date, v_end_date, v_inventory_ids
    from public.bookings
    where id = p_booking_id;

    -- Check for conflicting confirmed bookings for the same inventory units
    select count(*)
    into v_conflicting_bookings
    from public.bookings
    where listing_id = v_listing_id
      and status = 'Confirmed'
      and id <> p_booking_id
      and tstzrange(start_date, end_date, '[]') && tstzrange(v_start_date, v_end_date, '[]')
      and inventory_ids && v_inventory_ids;

    if v_conflicting_bookings > 0 then
        raise exception 'This booking cannot be confirmed due to a conflict with an existing confirmed booking for the same unit(s).';
    end if;

    -- If no conflicts, update the booking status to 'Confirmed'
    update public.bookings
    set
        status = 'Confirmed',
        action_by_user_id = p_admin_id,
        action_at = now(),
        status_message = 'Confirmed by ' || p_admin_name || ' on ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    where id = p_booking_id;
end;
$$ language plpgsql;


create or replace function public.add_or_update_review(
    p_listing_id uuid,
    p_user_id uuid,
    p_author_name text,
    p_avatar_url text,
    p_rating integer,
    p_comment text
)
returns void as $$
declare
    v_review_id uuid;
    v_new_review jsonb;
begin
    -- Create the new review JSON object
    v_new_review := jsonb_build_object(
        'id', gen_random_uuid()::text,
        'user_id', p_user_id::text,
        'author', p_author_name,
        'avatar', p_avatar_url,
        'rating', p_rating,
        'comment', p_comment,
        'status', 'pending'
    );

    -- Check if the user has already submitted a review for this listing
    select id into v_review_id from jsonb_to_recordset(
        (select reviews from public.listings where id = p_listing_id)
    ) as x(id uuid, user_id uuid) where x.user_id = p_user_id;

    if v_review_id is not null then
        -- User has an existing review, update it by removing the old one and adding the new one.
        update public.listings
        set reviews = reviews - (
            select index - 1 from jsonb_array_elements(reviews) with ordinality arr(elem, index) where (elem->>'id')::uuid = v_review_id
        ) || v_new_review
        where id = p_listing_id;
    else
        -- This is a new review for this user, append it to the array.
        update public.listings
        set reviews = reviews || v_new_review
        where id = p_listing_id;
    end if;

    -- Recalculate average rating after adding/updating review
    update public.listings
    set rating = (
        select avg((r->>'rating')::numeric)
        from jsonb_array_elements(reviews) as r
        where r->>'status' = 'approved'
    )
    where id = p_listing_id;
end;
$$ language plpgsql;


create or replace function public.approve_review(p_listing_id uuid, p_review_id uuid)
returns void as $$
declare
    v_reviews jsonb;
    v_review_to_update jsonb;
    v_index integer;
begin
    -- Find the review and its index in the JSONB array
    select elem, index-1 into v_review_to_update, v_index
    from public.listings, jsonb_array_elements(reviews) with ordinality arr(elem, index)
    where id = p_listing_id and (elem->>'id')::uuid = p_review_id;

    if v_review_to_update is not null then
        -- Update the status of the review to 'approved'
        v_review_to_update := jsonb_set(v_review_to_update, '{status}', '"approved"');
        
        -- Update the reviews array in the listings table
        update public.listings
        set reviews = jsonb_set(reviews, array[v_index::text], v_review_to_update)
        where id = p_listing_id;

        -- Recalculate average rating after approval
        update public.listings
        set rating = (
            select coalesce(avg((r->>'rating')::numeric), 0)
            from jsonb_array_elements(reviews) as r
            where r->>'status' = 'approved'
        )
        where id = p_listing_id;
    end if;
end;
$$ language plpgsql;

create or replace function public.delete_review(p_listing_id uuid, p_review_id uuid)
returns void as $$
declare
    v_review_index integer;
begin
    -- Find the index of the review to delete
    select index-1 into v_review_index
    from public.listings, jsonb_array_elements(reviews) with ordinality arr(elem, index)
    where id = p_listing_id and (elem->>'id')::uuid = p_review_id;

    if v_review_index is not null then
        -- Remove the review from the array using its index
        update public.listings
        set reviews = reviews - v_review_index
        where id = p_listing_id;
        
        -- Recalculate average rating after deletion
        update public.listings
        set rating = (
            select coalesce(avg((r->>'rating')::numeric), 0)
            from jsonb_array_elements(reviews) as r
            where r->>'status' = 'approved'
        )
        where id = p_listing_id;
    end if;
end;
$$ language plpgsql;


create or replace function public.create_listing_with_inventory(
    p_name text,
    p_type listing_type,
    p_location text,
    p_description text,
    p_images jsonb,
    p_price numeric,
    p_price_unit price_unit_type,
    p_currency currency_type,
    p_max_guests integer,
    p_features jsonb,
    p_inventory_count integer
)
returns void as $$
declare
    v_listing_id uuid;
begin
    -- Insert the new listing
    insert into public.listings (name, type, location, description, images, price, price_unit, currency, max_guests, features)
    values (p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features)
    returning id into v_listing_id;

    -- Create inventory items for the new listing
    if p_inventory_count > 0 then
        for i in 1..p_inventory_count loop
            insert into public.listing_inventory (listing_id, name)
            values (v_listing_id, p_name || ' Unit ' || i);
        end loop;
    end if;
end;
$$ language plpgsql;


create or replace function public.update_listing_with_inventory(
    p_listing_id uuid,
    p_name text,
    p_type listing_type,
    p_location text,
    p_description text,
    p_price numeric,
    p_price_unit price_unit_type,
    p_currency currency_type,
    p_max_guests integer,
    p_features jsonb,
    p_images jsonb,
    p_new_inventory_count integer
)
returns void as $$
declare
    v_current_inventory_count integer;
    v_diff integer;
begin
    -- Update the listing details
    update public.listings
    set
        name = p_name,
        type = p_type,
        location = p_location,
        description = p_description,
        price = p_price,
        price_unit = p_price_unit,
        currency = p_currency,
        max_guests = p_max_guests,
        features = p_features,
        images = p_images,
        updated_at = now()
    where id = p_listing_id;

    -- Manage inventory count
    select count(*) into v_current_inventory_count from public.listing_inventory where listing_id = p_listing_id;
    v_diff := p_new_inventory_count - v_current_inventory_count;

    if v_diff > 0 then
        -- Add new inventory units
        for i in 1..v_diff loop
            insert into public.listing_inventory (listing_id, name)
            values (p_listing_id, p_name || ' Unit ' || (v_current_inventory_count + i));
        end loop;
    elsif v_diff < 0 then
        -- Remove inventory units, ensuring not to remove ones that are part of a confirmed booking
        delete from public.listing_inventory
        where id in (
            select li.id from public.listing_inventory li
            where li.listing_id = p_listing_id
              and not exists (
                select 1 from public.bookings b where b.status = 'Confirmed' and li.id = any(b.inventory_ids)
              )
            limit abs(v_diff)
        );
    end if;
end;
$$ language plpgsql;


create or replace function public.delete_listing_with_bookings_check(p_listing_id uuid)
returns void as $$
begin
    -- Check for any confirmed or pending bookings for this listing
    if exists (select 1 from public.bookings where listing_id = p_listing_id and status in ('Confirmed', 'Pending')) then
        raise exception 'Cannot delete listing because it has active or pending bookings.';
    end if;

    -- If no active bookings, delete the listing. Inventory and cancelled bookings will be cascaded.
    delete from public.listings where id = p_listing_id;
end;
$$ language plpgsql;

create or replace function public.merge_listings(
    p_primary_listing_id uuid,
    p_listing_ids_to_merge uuid[]
)
returns void as $$
declare
    merged_features jsonb;
    merged_images jsonb;
    merged_reviews jsonb;
begin
    -- Combine features, images, and reviews from all listings to be merged
    select jsonb_agg(distinct feature), jsonb_agg(distinct image), jsonb_agg(distinct review)
    into merged_features, merged_images, merged_reviews
    from (
        select jsonb_array_elements_text(features) as feature, 
               jsonb_array_elements_text(images) as image, 
               jsonb_array_elements(reviews) as review
        from public.listings
        where id = any(p_listing_ids_to_merge)
    ) as sub;

    -- Update primary listing with merged data
    update public.listings
    set
        features = features || merged_features,
        images = images || merged_images,
        reviews = reviews || merged_reviews,
        updated_at = now()
    where id = p_primary_listing_id;
    
    -- Re-parent inventory, bookings from merged listings to the primary listing
    update public.listing_inventory set listing_id = p_primary_listing_id where listing_id = any(p_listing_ids_to_merge);
    update public.bookings set listing_id = p_primary_listing_id where listing_id = any(p_listing_ids_to_merge);
    
    -- Delete the now-empty merged listings
    delete from public.listings where id = any(p_listing_ids_to_merge);

    -- Recalculate rating for the primary listing
    update public.listings
    set rating = (
        select coalesce(avg((r->>'rating')::numeric), 0)
        from jsonb_array_elements(reviews) as r
        where r->>'status' = 'approved'
    )
    where id = p_primary_listing_id;
end;
$$ language plpgsql;


create or replace function public.bulk_delete_listings(p_listing_ids uuid[])
returns void as $$
declare
    v_id uuid;
begin
    foreach v_id in array p_listing_ids
    loop
        if exists (select 1 from public.bookings where listing_id = v_id and status in ('Confirmed', 'Pending')) then
            raise exception 'Cannot delete listing % because it has active or pending bookings.', (select name from public.listings where id = v_id);
        end if;
    end loop;

    delete from public.listings where id = any(p_listing_ids);
end;
$$ language plpgsql;
