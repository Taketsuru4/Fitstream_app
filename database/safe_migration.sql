-- Safe Database Migration Script
-- This handles existing table structures and adds missing columns

-- 1. Create extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Create profiles table if it doesn't exist, or add missing columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add missing columns to profiles table (each one safe to run multiple times)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('client', 'trainer')) DEFAULT 'client',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS training_locations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;

-- 4. Create other tables
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id BIGSERIAL PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id BIGSERIAL PRIMARY KEY,
  slot_id BIGINT REFERENCES public.availability_slots(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note_from_client TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (safe to run multiple times)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Create profile completion function
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM public.profiles WHERE id = profile_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Basic info (30 points total)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND length(profile_record.bio) > 20 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completion_score := completion_score + 15;
  END IF;
  
  -- Professional info (40 points total)
  IF profile_record.specialties IS NOT NULL AND array_length(profile_record.specialties, 1) > 0 THEN
    completion_score := completion_score + 15;
  END IF;
  
  IF profile_record.hourly_rate IS NOT NULL AND profile_record.hourly_rate > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.years_experience IS NOT NULL AND profile_record.years_experience > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.certifications IS NOT NULL AND array_length(profile_record.certifications, 1) > 0 THEN
    completion_score := completion_score + 5;
  END IF;
  
  -- Additional info (30 points total)
  IF profile_record.languages IS NOT NULL AND array_length(profile_record.languages, 1) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.training_locations IS NOT NULL AND array_length(profile_record.training_locations, 1) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql;

-- 7. Create profile completion trigger
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion := calculate_profile_completion(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_completion ON public.profiles;
CREATE TRIGGER trigger_update_profile_completion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_completion();

-- 8. Create updated_at function and triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_availability_slots_updated_at ON public.availability_slots;
CREATE TRIGGER handle_availability_slots_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_bookings_updated_at ON public.bookings;
CREATE TRIGGER handle_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_messages_updated_at ON public.messages;
CREATE TRIGGER handle_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Add constraint for availability slots (drop first to avoid conflicts)
ALTER TABLE public.availability_slots DROP CONSTRAINT IF EXISTS availability_no_overlap;
ALTER TABLE public.availability_slots
  ADD CONSTRAINT availability_no_overlap
  EXCLUDE USING gist (
    trainer_id WITH =, 
    tstzrange(start_at, end_at, '[)') WITH &&
  );

-- 10. Create indexes (IF NOT EXISTS prevents errors)
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Only create GIN index if specialties column exists and has data
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'specialties'
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS profiles_specialties_idx ON public.profiles USING GIN(specialties);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_hourly_rate_idx ON public.profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS profiles_rating_idx ON public.profiles(rating);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(location);
CREATE INDEX IF NOT EXISTS profiles_completion_idx ON public.profiles(profile_completion);

CREATE INDEX IF NOT EXISTS availability_trainer_id_idx ON public.availability_slots(trainer_id);
CREATE INDEX IF NOT EXISTS availability_published_idx ON public.availability_slots(is_published);
CREATE INDEX IF NOT EXISTS availability_start_at_idx ON public.availability_slots(start_at);

CREATE INDEX IF NOT EXISTS bookings_trainer_id_idx ON public.bookings(trainer_id);
CREATE INDEX IF NOT EXISTS bookings_client_id_idx ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);

CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- 11. RLS Policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view trainer profiles" ON public.profiles;
CREATE POLICY "Public can view trainer profiles" ON public.profiles
  FOR SELECT TO public
  USING (role = 'trainer' AND profile_completion >= 30);

-- 12. Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 13. Storage policies
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view profile images" ON storage.objects;
CREATE POLICY "Users can view profile images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 14. Verification
SELECT 'Safe database migration completed successfully! ✅' as status;