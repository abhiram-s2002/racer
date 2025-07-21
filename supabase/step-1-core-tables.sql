-- Step 1: Create Core Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- CORE TABLES CREATION
-- ============================================================================

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username text UNIQUE NOT NULL,
    email text UNIQUE NOT NULL,
    name text,
    avatar_url text,
    bio text,
    phone text,
    location_display text,
    latitude double precision,
    longitude double precision,
    is_available boolean DEFAULT true,
    notification_settings jsonb DEFAULT '{"new_messages": true, "listing_updates": true, "marketplace_notifications": true}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 2. Listings table
CREATE TABLE IF NOT EXISTS public.listings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    price_unit text DEFAULT 'per_item',
    category text NOT NULL,
    images text[] DEFAULT '{}',
    latitude double precision,
    longitude double precision,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
    extension_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    ping_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 3. Pings table
CREATE TABLE IF NOT EXISTS public.pings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    sender_username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    receiver_username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    message text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    template_id text,
    sent_at timestamp with time zone DEFAULT timezone('utc', now()),
    responded_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days')
);

-- 4. Chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    participant_a text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    participant_b text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    last_message text,
    last_sender text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(participant_a, participant_b, listing_id)
);

-- 5. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    text text NOT NULL,
    status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_username ON public.listings(username);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON public.listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON public.listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings(latitude, longitude);

-- Indexes for pings
CREATE INDEX IF NOT EXISTS idx_pings_sender ON public.pings(sender_username);
CREATE INDEX IF NOT EXISTS idx_pings_receiver ON public.pings(receiver_username);
CREATE INDEX IF NOT EXISTS idx_pings_listing ON public.pings(listing_id);
CREATE INDEX IF NOT EXISTS idx_pings_status ON public.pings(status);

-- Indexes for chats
CREATE INDEX IF NOT EXISTS idx_chats_participant_a ON public.chats(participant_a);
CREATE INDEX IF NOT EXISTS idx_chats_participant_b ON public.chats(participant_b);
CREATE INDEX IF NOT EXISTS idx_chats_listing ON public.chats(listing_id);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_username);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that tables were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'listings', 'pings', 'chats', 'messages')
ORDER BY table_name; 