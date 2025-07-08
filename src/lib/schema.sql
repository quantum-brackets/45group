-- Enable HTTP extension
create extension if not exists http with schema extensions;

-- Create custom types
create type listing_type as enum ('hotel', 'events', 'restaurant');
create type price_unit as enum ('night', 'hour', 'person');
create type currency_type as enum ('USD', 'EUR', 'GBP', 'NGN');
create type user_role as enum ('admin', 'guest', 'staff');
create type user_status as enum ('active', 'disabled', 'provisional');
create type booking_status as enum ('Confirmed', 'Pending', 'Cancelled');
create type review_status as enum ('pending', 'approved');

-- USERS Table
create table users (
  id uuid references auth.users not null primary key,
  name text,
  email text unique,
  role user_role default 'guest',
  status user_status default 'provisional',
  phone text,
  notes text
);

-- LISTINGS Table
create table listings (
  id text primary key,
  name text not null,
  type listing_type not null,
  location text not null,
  description text,
  images jsonb,
  price double precision not null,
  "priceUnit" price_unit not null,
  currency currency_type not null,
  rating double precision default 0,
  reviews jsonb default '[]'::jsonb,
  features jsonb,
  "maxGuests" integer not null
);

-- LISTING_INVENTORY Table
create table listing_inventory (
  id text primary key,
  "listingId" text references listings(id) on delete cascade,
  name text not null
);

-- BOOKINGS Table
create table bookings (
  id text primary key,
  "listingId" text references listings(id) on delete cascade,
  "inventoryIds" jsonb,
  "userId" uuid references users(id) on delete set null,
  "startDate" date not null,
  "endDate" date not null,
  guests integer not null,
  status booking_status not null,
  "createdAt" timestamptz default now(),
  "actionByUserId" uuid references users(id) on delete set null,
  "actionAt" timestamptz,
  "statusMessage" text
);

-- Function to get user role
create or replace function get_user_role(user_id uuid)
returns text as $$
declare
  user_role text;
begin
  select role into user_role from public.users where id = user_id;
  return user_role;
end;
$$ language plpgsql;


-- Row Level Security (RLS) Policies

-- Users table
alter table users enable row level security;
create policy "Users can view their own profile." on users for select using (auth.uid() = id);
create policy "Admins and staff can view all users." on users for select using (get_user_role(auth.uid()) in ('admin', 'staff'));
create policy "Users can update their own profile." on users for update using (auth.uid() = id);
create policy "Admins can update any user." on users for update using (get_user_role(auth.uid()) = 'admin');

-- Listings table
alter table listings enable row level security;
create policy "Listings are viewable by everyone." on listings for select using (true);
create policy "Admins can create listings." on listings for insert with check (get_user_role(auth.uid()) = 'admin');
create policy "Admins can update listings." on listings for update with check (get_user_role(auth.uid()) = 'admin');
create policy "Admins can delete listings." on listings for delete using (get_user_role(auth.uid()) = 'admin');

-- Listing_inventory table
alter table listing_inventory enable row level security;
create policy "Inventory is viewable by everyone." on listing_inventory for select using (true);
create policy "Admins can manage inventory." on listing_inventory for all using (get_user_role(auth.uid()) = 'admin');

-- Bookings table
alter table bookings enable row level security;
create policy "Users can view their own bookings." on bookings for select using (auth.uid() = id);
create policy "Admins and Staff can view all bookings." on bookings for select using (get_user_role(auth.uid()) in ('admin', 'staff'));
create policy "Users can create their own bookings." on bookings for insert with check (auth.uid() = userId or auth.uid() is null);
create policy "Users can update their own bookings." on bookings for update using (auth.uid() = userId);
create policy "Admins can update any booking." on bookings for update using (get_user_role(auth.uid()) = 'admin');
create policy "Users can cancel their own bookings." on bookings for delete using (auth.uid() = userId);
create policy "Admins can cancel any booking." on bookings for delete using (get_user_role(auth.uid()) = 'admin');


-- Database Functions (RPC)

-- Function to handle new user creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, status)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'active');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up in Auth
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to get filtered listings with availability check
create or replace function get_filtered_listings(
    location_filter text,
    type_filter text,
    guests_filter integer,
    from_date_filter date,
    to_date_filter date
)
returns setof listings
language plpgsql
security definer
as $$
begin
    return query
    select *
    from listings l
    where
        (location_filter is null or l.location ilike '%' || location_filter || '%')
    and (type_filter is null or l.type = type_filter)
    and (guests_filter is null or l.maxGuests >= guests_filter)
    and (
        from_date_filter is null or
        (select count(*) from listing_inventory li where li.listingId = l.id) > (
            select count(distinct inv.id)
            from bookings b,
            jsonb_array_elements_text(b.inventoryIds::jsonb) as inv(id)
            where b.listingId = l.id
            and b.status = 'Confirmed'
            and daterange(b.startDate, b.endDate, '[]') && daterange(from_date_filter, to_date_filter, '[]')
        )
    )
    order by l.name;
end;
$$;


-- Function to create a listing and its inventory atomically
create or replace function create_listing_with_inventory(
    p_id text,
    p_name text,
    p_type listing_type,
    p_location text,
    p_description text,
    p_images jsonb,
    p_price double precision,
    p_price_unit price_unit,
    p_currency currency_type,
    p_max_guests integer,
    p_features jsonb,
    p_inventory_count integer
)
returns void as $$
declare
    i integer;
    new_inventory_id text;
begin
    insert into listings (id, name, type, location, description, images, price, "priceUnit", currency, "maxGuests", features)
    values (p_id, p_name, p_type, p_location, p_description, p_images, p_price, p_price_unit, p_currency, p_max_guests, p_features);

    if p_inventory_count > 0 then
        for i in 1..p_inventory_count loop
            new_inventory_id := p_id || '-inv-' || i;
            insert into listing_inventory (id, "listingId", name)
            values (new_inventory_id, p_id, p_name || ' - Unit ' || i);
        end loop;
    end if;
end;
$$ language plpgsql;

-- Function to update a listing and adjust its inventory
create or replace function update_listing_with_inventory(
    p_listing_id text,
    p_name text,
    p_type listing_type,
    p_location text,
    p_description text,
    p_price double precision,
    p_price_unit price_unit,
    p_currency currency_type,
    p_max_guests integer,
    p_features jsonb,
    p_images jsonb,
    p_new_inventory_count integer
)
returns void as $$
declare
    current_inventory_count integer;
    i integer;
    new_inventory_id text;
begin
    update listings
    set
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
    where id = p_listing_id;

    select count(*) into current_inventory_count from listing_inventory where "listingId" = p_listing_id;

    if p_new_inventory_count > current_inventory_count then
        -- Add new inventory units
        for i in (current_inventory_count + 1)..p_new_inventory_count loop
            new_inventory_id := p_listing_id || '-inv-' || i;
            insert into listing_inventory (id, "listingId", name)
            values (new_inventory_id, p_listing_id, p_name || ' - Unit ' || i);
        end loop;
    elsif p_new_inventory_count < current_inventory_count then
        -- Remove inventory units (only those not in any booking)
        delete from listing_inventory
        where id in (
            select id from listing_inventory
            where "listingId" = p_listing_id
            and id not in (
                select jsonb_array_elements_text("inventoryIds") from bookings
            )
            limit (current_inventory_count - p_new_inventory_count)
        );
    end if;

    -- Update names of existing inventory
    for i in 1..p_new_inventory_count loop
        update listing_inventory
        set name = p_name || ' - Unit ' || i
        where "listingId" = p_listing_id and id = p_listing_id || '-inv-' || i;
    end loop;
end;
$$ language plpgsql;


-- Function to create a booking with inventory availability check
create or replace function create_booking_with_inventory_check(
    p_listing_id text,
    p_user_id uuid,
    p_start_date date,
    p_end_date date,
    p_guests integer,
    p_num_units integer,
    p_guest_email text default null
)
returns text as $$
declare
    available_inventory_ids text[];
    user_id_to_use uuid := p_user_id;
    new_user_id uuid;
    final_message text;
begin
    -- If no user ID, handle guest booking
    if user_id_to_use is null and p_guest_email is not null then
        -- Check if user exists
        select id into user_id_to_use from users where email = p_guest_email;
        
        if user_id_to_use is null then
            -- Create provisional user in auth
            select extensions.http_post(
                url := current_setting('supautils.url') || '/auth/v1/admin/users',
                headers := jsonb_build_object(
                    'apikey', current_setting('supautils.service_role_key'),
                    'Authorization', 'Bearer ' || current_setting('supautils.service_role_key')
                ),
                content := jsonb_build_object(
                    'email', p_guest_email,
                    'password', 'temporary_password_placeholder',
                    'email_confirm', true,
                    'user_metadata', jsonb_build_object('name', p_guest_email)
                )
            ) into new_user_id;

            -- The handle_new_user trigger will create the public.users record
            -- We need to fetch the new ID
            select id into user_id_to_use from users where email = p_guest_email;
            
            if user_id_to_use is null then
                raise exception 'Failed to create provisional user.';
            end if;
            
            final_message := 'Booking placed! An account has been created for you. Please check your email to set a password.';
        else
            final_message := 'Booking placed! Please log in to manage your booking.';
        end if;
    elsif user_id_to_use is null and p_guest_email is null then
        raise exception 'User session or guest email is required.';
    else
        final_message := 'Booking request sent! It is now pending confirmation from the venue.';
    end if;

    -- Find available inventory units
    select array_agg(id) into available_inventory_ids
    from listing_inventory
    where "listingId" = p_listing_id
    and id not in (
        select jsonb_array_elements_text("inventoryIds")
        from bookings
        where "listingId" = p_listing_id
        and status = 'Confirmed'
        and daterange("startDate", "endDate", '[]') && daterange(p_start_date, p_end_date, '[]')
    );

    if array_length(available_inventory_ids, 1) < p_num_units then
        raise exception 'Not enough units available for the selected dates.';
    end if;

    -- Insert the new booking
    insert into bookings (id, "listingId", "inventoryIds", "userId", "startDate", "endDate", guests, status)
    values (
        'booking-' || gen_random_uuid(),
        p_listing_id,
        to_jsonb(available_inventory_ids[1:p_num_units]),
        user_id_to_use,
        p_start_date,
        p_end_date,
        p_guests,
        'Pending'
    );
    
    return final_message;
end;
$$ language plpgsql;


-- Function to update a booking
create or replace function update_booking_with_inventory_check(
    p_booking_id text,
    p_new_start_date date,
    p_new_end_date date,
    p_new_guests integer,
    p_new_num_units integer,
    p_editor_id uuid,
    p_editor_name text
)
returns void as $$
declare
    v_listing_id text;
    available_inventory_ids text[];
begin
    select "listingId" into v_listing_id from bookings where id = p_booking_id;

    -- Find available inventory units, excluding the current booking being edited
    select array_agg(id) into available_inventory_ids
    from listing_inventory
    where "listingId" = v_listing_id
    and id not in (
        select jsonb_array_elements_text("inventoryIds")
        from bookings
        where "listingId" = v_listing_id
        and id != p_booking_id -- Exclude the current booking
        and status = 'Confirmed'
        and daterange("startDate", "endDate", '[]') && daterange(p_new_start_date, p_new_end_date, '[]')
    );

    if array_length(available_inventory_ids, 1) < p_new_num_units then
        raise exception 'Not enough units available for the newly selected dates. Available: %', array_length(available_inventory_ids, 1);
    end if;

    update bookings
    set
        "startDate" = p_new_start_date,
        "endDate" = p_new_end_date,
        guests = p_new_guests,
        "inventoryIds" = to_jsonb(available_inventory_ids[1:p_new_num_units]),
        status = 'Pending', -- Reset status to pending after edit
        "statusMessage" = 'Booking was modified by ' || p_editor_name || ' on ' || to_char(now(), 'YYYY-MM-DD'),
        "actionByUserId" = p_editor_id,
        "actionAt" = now()
    where id = p_booking_id;
end;
$$ language plpgsql;


-- Function to confirm a booking
create or replace function confirm_booking_with_inventory_check(
    p_booking_id text,
    p_admin_id uuid,
    p_admin_name text
)
returns void as $$
declare
    v_listing_id text;
    v_start_date date;
    v_end_date date;
    v_inventory_ids jsonb;
    v_num_units integer;
    available_inventory_count integer;
begin
    select "listingId", "startDate", "endDate", "inventoryIds" into v_listing_id, v_start_date, v_end_date, v_inventory_ids
    from bookings where id = p_booking_id;

    v_num_units := jsonb_array_length(v_inventory_ids);
    
    -- Check availability again at the time of confirmation
    select count(*) into available_inventory_count
    from listing_inventory
    where "listingId" = v_listing_id
    and id not in (
        select jsonb_array_elements_text("inventoryIds")
        from bookings
        where "listingId" = v_listing_id
        and id != p_booking_id -- Exclude the current booking
        and status = 'Confirmed'
        and daterange("startDate", "endDate", '[]') && daterange(v_start_date, v_end_date, '[]')
    );

    if available_inventory_count < v_num_units then
        raise exception 'Cannot confirm booking. Not enough units available for the selected dates.';
    end if;

    update bookings
    set
        status = 'Confirmed',
        "statusMessage" = 'Booking confirmed by ' || p_admin_name || ' on ' || to_char(now(), 'YYYY-MM-DD'),
        "actionByUserId" = p_admin_id,
        "actionAt" = now()
    where id = p_booking_id;
end;
$$ language plpgsql;

-- Function to handle reviews
create or replace function add_or_update_review(
    p_listing_id text,
    p_user_id uuid,
    p_author_name text,
    p_avatar_url text,
    p_rating integer,
    p_comment text
)
returns void as $$
declare
    existing_review jsonb;
    new_review jsonb;
    review_id text;
begin
    -- Check for existing review by this user
    select (elem) into existing_review
    from listings, jsonb_array_elements(reviews) as elem
    where id = p_listing_id and elem->>'userId' = p_user_id::text;

    new_review := jsonb_build_object(
        'id', 'review-' || gen_random_uuid(),
        'userId', p_user_id,
        'author', p_author_name,
        'avatar', p_avatar_url,
        'rating', p_rating,
        'comment', p_comment,
        'status', 'pending'
    );

    if existing_review is not null then
        -- Update existing review
        update listings
        set reviews = reviews - existing_review || new_review
        where id = p_listing_id;
    else
        -- Add new review
        update listings
        set reviews = reviews || new_review
        where id = p_listing_id;
    end if;

    -- Recalculate average rating based on approved reviews
    update listings
    set rating = (
        select coalesce(avg((elem->>'rating')::numeric), 0)
        from jsonb_array_elements(reviews) as elem
        where elem->>'status' = 'approved'
    )
    where id = p_listing_id;
end;
$$ language plpgsql;


-- Function to approve a review
create or replace function approve_review(p_listing_id text, p_review_id text)
returns void as $$
declare
    review_to_approve jsonb;
    updated_review jsonb;
begin
    select elem into review_to_approve
    from listings, jsonb_array_elements(reviews) as elem
    where id = p_listing_id and elem->>'id' = p_review_id;

    if review_to_approve is not null then
        updated_review := review_to_approve || '{"status": "approved"}';
        
        update listings
        set reviews = reviews - review_to_approve || updated_review
        where id = p_listing_id;
        
        -- Recalculate average rating
        update listings
        set rating = (
            select coalesce(avg((elem->>'rating')::numeric), 0)
            from jsonb_array_elements(reviews) as elem
            where elem->>'status' = 'approved'
        )
        where id = p_listing_id;
    end if;
end;
$$ language plpgsql;

-- Function to delete a review
create or replace function delete_review(p_listing_id text, p_review_id text)
returns void as $$
declare
    review_to_delete jsonb;
begin
    select elem into review_to_delete
    from listings, jsonb_array_elements(reviews) as elem
    where id = p_listing_id and elem->>'id' = p_review_id;

    if review_to_delete is not null then
        update listings
        set reviews = reviews - review_to_delete
        where id = p_listing_id;

        -- Recalculate average rating
        update listings
        set rating = (
            select coalesce(avg((elem->>'rating')::numeric), 0)
            from jsonb_array_elements(reviews) as elem
            where elem->>'status' = 'approved'
        )
        where id = p_listing_id;
    end if;
end;
$$ language plpgsql;

-- Function to merge listings
create or replace function merge_listings(
    p_primary_listing_id text,
    p_listing_ids_to_merge text[]
)
returns void as $$
declare
    merged_images jsonb;
    merged_features jsonb;
    merged_reviews jsonb;
begin
    -- Combine images, features, and reviews
    select 
        jsonb_agg(distinct img) into merged_images
    from (
        select jsonb_array_elements_text(images) as img from listings where id = p_primary_listing_id
        union all
        select jsonb_array_elements_text(images) as img from listings where id = any(p_listing_ids_to_merge)
    ) as all_images;

    select 
        jsonb_agg(distinct feat) into merged_features
    from (
        select jsonb_array_elements_text(features) as feat from listings where id = p_primary_listing_id
        union all
        select jsonb_array_elements_text(features) as feat from listings where id = any(p_listing_ids_to_merge)
    ) as all_features;

    select 
        jsonb_agg(distinct rev) into merged_reviews
    from (
        select jsonb_array_elements(reviews) as rev from listings where id = p_primary_listing_id
        union all
        select jsonb_array_elements(reviews) as rev from listings where id = any(p_listing_ids_to_merge)
    ) as all_reviews;

    -- Update primary listing
    update listings
    set 
        images = merged_images,
        features = merged_features,
        reviews = merged_reviews
    where id = p_primary_listing_id;

    -- Move inventory and bookings from merged listings to primary
    update listing_inventory set "listingId" = p_primary_listing_id where "listingId" = any(p_listing_ids_to_merge);
    update bookings set "listingId" = p_primary_listing_id where "listingId" = any(p_listing_ids_to_merge);

    -- Delete merged listings
    delete from listings where id = any(p_listing_ids_to_merge);
end;
$$ language plpgsql;

-- Function to bulk delete listings, checking for active bookings
create or replace function bulk_delete_listings(p_listing_ids text[])
returns void as $$
begin
    if exists (select 1 from bookings where "listingId" = any(p_listing_ids) and status in ('Confirmed', 'Pending')) then
        raise exception 'Cannot delete listings with active or pending bookings.';
    end if;
    
    delete from listings where id = any(p_listing_ids);
end;
$$ language plpgsql;

-- Function to delete a single listing, checking for active bookings
create or replace function delete_listing_with_bookings_check(p_listing_id text)
returns void as $$
begin
    if exists (select 1 from bookings where "listingId" = p_listing_id and status in ('Confirmed', 'Pending')) then
        raise exception 'Cannot delete a listing that has active or pending bookings. Please cancel them first.';
    end if;
    
    delete from listings where id = p_listing_id;
end;
$$ language plpgsql;
