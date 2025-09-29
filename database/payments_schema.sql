-- Payments and Stripe Integration Schema
-- This script adds payment-related tables to support Stripe integration

-- 1. Payments table to track all transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe payment details
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_charge_id TEXT,
  
  -- Payment amounts (stored in cents)
  amount INTEGER NOT NULL, -- Total amount in cents
  currency TEXT DEFAULT 'eur',
  platform_fee INTEGER NOT NULL, -- Platform fee in cents
  trainer_amount INTEGER NOT NULL, -- Amount for trainer in cents
  
  -- Payment status
  status TEXT CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')) DEFAULT 'pending',
  
  -- Metadata
  payment_method_id TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trainer Stripe accounts for Connect integration
CREATE TABLE IF NOT EXISTS public.trainer_stripe_accounts (
  id BIGSERIAL PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Stripe Connect account details
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending', -- pending, active, restricted, inactive
  
  -- Account capabilities
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  account_link_url TEXT,
  account_link_expires_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payouts table to track trainer payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id BIGSERIAL PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id TEXT NOT NULL,
  
  -- Payout details
  stripe_payout_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'eur',
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')) DEFAULT 'pending',
  
  -- Timing
  arrival_date DATE, -- Expected arrival date
  
  -- Failure details
  failure_code TEXT,
  failure_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payment methods table (optional - for saved cards)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe payment method details
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  payment_method_type TEXT DEFAULT 'card',
  
  -- Card details (last 4 digits, brand, etc.)
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS on all payment tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainer_id ON public.payments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_trainer_stripe_accounts_trainer_id ON public.trainer_stripe_accounts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_stripe_accounts_stripe_id ON public.trainer_stripe_accounts(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_payouts_trainer_id ON public.payouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON public.payouts(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_methods_client_id ON public.payment_methods(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON public.payment_methods(stripe_payment_method_id);

-- 7. Updated_at triggers for all payment tables
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS handle_payments_updated_at ON public.payments;
DROP TRIGGER IF EXISTS handle_trainer_stripe_accounts_updated_at ON public.trainer_stripe_accounts;
DROP TRIGGER IF EXISTS handle_payouts_updated_at ON public.payouts;
DROP TRIGGER IF EXISTS handle_payment_methods_updated_at ON public.payment_methods;

-- Create updated_at triggers
CREATE TRIGGER handle_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_trainer_stripe_accounts_updated_at
  BEFORE UPDATE ON public.trainer_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. RLS Policies for payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Service can manage payments" ON public.payments;
CREATE POLICY "Service can manage payments" ON public.payments
  FOR ALL TO service_role
  USING (true);

-- 9. RLS Policies for trainer Stripe accounts
DROP POLICY IF EXISTS "Trainers can view own stripe account" ON public.trainer_stripe_accounts;
CREATE POLICY "Trainers can view own stripe account" ON public.trainer_stripe_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Service can manage stripe accounts" ON public.trainer_stripe_accounts;
CREATE POLICY "Service can manage stripe accounts" ON public.trainer_stripe_accounts
  FOR ALL TO service_role
  USING (true);

-- 10. RLS Policies for payouts
DROP POLICY IF EXISTS "Trainers can view own payouts" ON public.payouts;
CREATE POLICY "Trainers can view own payouts" ON public.payouts
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Service can manage payouts" ON public.payouts;
CREATE POLICY "Service can manage payouts" ON public.payouts
  FOR ALL TO service_role
  USING (true);

-- 11. RLS Policies for payment methods
DROP POLICY IF EXISTS "Clients can view own payment methods" ON public.payment_methods;
CREATE POLICY "Clients can view own payment methods" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can manage own payment methods" ON public.payment_methods;
CREATE POLICY "Clients can manage own payment methods" ON public.payment_methods
  FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- 12. Function to calculate platform fees
CREATE OR REPLACE FUNCTION calculate_platform_fees(gross_amount INTEGER)
RETURNS TABLE(
  gross_amount INTEGER,
  platform_fee INTEGER,
  trainer_amount INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT
    gross_amount as gross_amount,
    ROUND((gross_amount * 0.10) + 30)::INTEGER as platform_fee, -- 10% + €0.30
    (gross_amount - ROUND((gross_amount * 0.10) + 30))::INTEGER as trainer_amount;
END;
$$ LANGUAGE plpgsql;

-- 13. Function to get trainer earnings summary
CREATE OR REPLACE FUNCTION get_trainer_earnings(trainer_uuid UUID)
RETURNS TABLE(
  total_earnings DECIMAL,
  monthly_earnings DECIMAL,
  total_sessions INTEGER,
  monthly_sessions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH earnings_data AS (
    SELECT 
      trainer_amount,
      created_at,
      EXTRACT(MONTH FROM created_at) as payment_month,
      EXTRACT(YEAR FROM created_at) as payment_year
    FROM public.payments 
    WHERE trainer_id = trainer_uuid 
    AND status = 'succeeded'
  )
  SELECT
    COALESCE(SUM(trainer_amount::DECIMAL / 100), 0) as total_earnings,
    COALESCE(SUM(
      CASE 
        WHEN payment_month = EXTRACT(MONTH FROM NOW()) 
        AND payment_year = EXTRACT(YEAR FROM NOW())
        THEN trainer_amount::DECIMAL / 100 
        ELSE 0 
      END
    ), 0) as monthly_earnings,
    COUNT(*)::INTEGER as total_sessions,
    COUNT(
      CASE 
        WHEN payment_month = EXTRACT(MONTH FROM NOW()) 
        AND payment_year = EXTRACT(YEAR FROM NOW())
        THEN 1 
        ELSE NULL 
      END
    )::INTEGER as monthly_sessions
  FROM earnings_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Success message
SELECT 'Payments schema setup completed successfully! ✅ Ready for Stripe integration!' as status;