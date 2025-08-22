-- Migration: Add Referral Commission System
-- Date: 2025-01-24
-- Description: Implements 10% commission for referrers on all referred user rewards

-- Add commission tracking to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS total_commission_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc', now());

-- Update reward_transactions constraint to allow referral_commission type
ALTER TABLE reward_transactions 
DROP CONSTRAINT IF EXISTS reward_transactions_transaction_type_check;

ALTER TABLE reward_transactions 
ADD CONSTRAINT reward_transactions_transaction_type_check 
CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'referral', 'achievement', 'checkin', 'referral_commission'));

-- Create commission tracking table
CREATE TABLE IF NOT EXISTS referral_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE,
    referrer_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    referred_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    commission_amount integer NOT NULL,
    source_transaction_id uuid REFERENCES reward_transactions(id) ON DELETE CASCADE,
    source_type text NOT NULL,
    source_amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_username);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON referral_commissions(referred_username);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referral_id ON referral_commissions(referral_id);
