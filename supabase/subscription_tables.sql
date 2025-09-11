-- Subscription Management Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- SUBSCRIPTION TABLES
-- ============================================================================

-- 1. User subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    product_id text NOT NULL,
    purchase_token text NOT NULL,
    purchase_time bigint NOT NULL,
    expiry_time bigint,
    is_active boolean DEFAULT true,
    auto_renewing boolean DEFAULT true,
    platform text NOT NULL CHECK (platform IN ('android', 'ios')),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    -- Ensure one active subscription per user per product
    UNIQUE(user_id, product_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Subscription products table (for reference)
CREATE TABLE IF NOT EXISTS public.subscription_products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    currency text NOT NULL DEFAULT 'INR',
    billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 3. Subscription transactions table (for audit trail)
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    product_id text NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'renewal', 'cancellation', 'refund', 'restore')),
    purchase_token text,
    amount numeric(10,2),
    currency text DEFAULT 'INR',
    platform text NOT NULL CHECK (platform IN ('android', 'ios')),
    status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_username ON public.user_subscriptions(username);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_product_id ON public.user_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON public.user_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expiry_time ON public.user_subscriptions(expiry_time);

-- Indexes for subscription_transactions
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_user_id ON public.subscription_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_username ON public.subscription_transactions(username);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_product_id ON public.subscription_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_status ON public.subscription_transactions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_created_at ON public.subscription_transactions(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscription products policies (read-only for users)
CREATE POLICY "Anyone can view active subscription products" ON public.subscription_products
    FOR SELECT USING (is_active = true);

-- Subscription transactions policies
CREATE POLICY "Users can view their own transactions" ON public.subscription_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.subscription_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(
    p_user_id uuid,
    p_product_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_product_id IS NULL THEN
        -- Check for any active subscription
        RETURN EXISTS (
            SELECT 1 FROM public.user_subscriptions 
            WHERE user_id = p_user_id 
            AND is_active = true 
            AND (expiry_time IS NULL OR expiry_time > extract(epoch from now()) * 1000)
        );
    ELSE
        -- Check for specific product subscription
        RETURN EXISTS (
            SELECT 1 FROM public.user_subscriptions 
            WHERE user_id = p_user_id 
            AND product_id = p_product_id
            AND is_active = true 
            AND (expiry_time IS NULL OR expiry_time > extract(epoch from now()) * 1000)
        );
    END IF;
END;
$$;

-- Function to get user's subscription status
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(
    p_user_id uuid
)
RETURNS TABLE (
    product_id text,
    is_active boolean,
    purchase_time bigint,
    expiry_time bigint,
    auto_renewing boolean,
    platform text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.product_id,
        us.is_active,
        us.purchase_time,
        us.expiry_time,
        us.auto_renewing,
        us.platform
    FROM public.user_subscriptions us
    WHERE us.user_id = p_user_id
    AND us.is_active = true
    AND (us.expiry_time IS NULL OR us.expiry_time > extract(epoch from now()) * 1000);
END;
$$;

-- Function to update subscription status
CREATE OR REPLACE FUNCTION public.update_subscription_status(
    p_user_id uuid,
    p_product_id text,
    p_purchase_token text,
    p_purchase_time bigint,
    p_expiry_time bigint DEFAULT NULL,
    p_platform text DEFAULT 'android'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deactivate any existing subscription for this product
    UPDATE public.user_subscriptions 
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id AND product_id = p_product_id AND is_active = true;
    
    -- Insert new subscription
    INSERT INTO public.user_subscriptions (
        user_id,
        username,
        product_id,
        purchase_token,
        purchase_time,
        expiry_time,
        platform
    )
    SELECT 
        p_user_id,
        u.username,
        p_product_id,
        p_purchase_token,
        p_purchase_time,
        p_expiry_time,
        p_platform
    FROM public.users u
    WHERE u.id = p_user_id;
    
    -- Log the transaction
    INSERT INTO public.subscription_transactions (
        user_id,
        username,
        product_id,
        transaction_type,
        purchase_token,
        platform,
        status
    )
    SELECT 
        p_user_id,
        u.username,
        p_product_id,
        'purchase',
        p_purchase_token,
        p_platform,
        'completed'
    FROM public.users u
    WHERE u.id = p_user_id;
END;
$$;

-- ============================================================================
-- INSERT DEFAULT SUBSCRIPTION PRODUCTS
-- ============================================================================

INSERT INTO public.subscription_products (product_id, name, description, price, currency, billing_period) VALUES
('com.geomart.app.verification.monthly', 'Monthly Verification', 'Get verified status for one month', 19.00, 'INR', 'monthly'),
('com.geomart.app.verification.annual', 'Annual Verification', 'Get verified status for one year', 199.00, 'INR', 'yearly')
ON CONFLICT (product_id) DO NOTHING;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_products_updated_at
    BEFORE UPDATE ON public.subscription_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
