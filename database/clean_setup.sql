-- Clean Database Setup - Works with existing structure
-- This script creates the profiles table from scratch if needed

-- 1. Create extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Create profiles table with all necessary columns
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'trainer')) DEFAULT 'client',
  phone TEXT,
  bio TEXT,
  location TEXT,
  specialties TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  years_experience INTEGER,
  certifications TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  training_locations TEXT[] DEFAULT '{}',
  availability_schedule JSONB DEFAULT '{}',
  profile_completion INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update existing availability_slots if needed (keep existing structure)
-- The table seems to exist already, so just ensure it has the right structure
ALTER TABLE public.availability_slots 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Update existing bookings table if needed
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS note_from_client TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Profile completion function
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
  
  -- Basic info (30 points)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND length(profile_record.bio) > 20 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completion_score := completion_score + 15;
  END IF;
  
  -- Professional info (40 points)
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
  
  -- Additional info (30 points)
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

-- 8. Profile completion trigger
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

-- 9. Updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_specialties_idx ON public.profiles USING GIN(specialties);
CREATE INDEX IF NOT EXISTS profiles_hourly_rate_idx ON public.profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(location);
CREATE INDEX IF NOT EXISTS profiles_completion_idx ON public.profiles(profile_completion);

-- 11. RLS Policies for profiles
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

-- 12. Messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- 13. Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 14. Storage policies
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
CREATE POLICY "Users upload own images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public view images" ON storage.objects;
CREATE POLICY "Public view images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users manage own images" ON storage.objects;
CREATE POLICY "Users manage own images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own images" ON storage.objects;
CREATE POLICY "Users delete own images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 15. Success message
SELECT 'Clean database setup completed! ✅ Ready to test Profile Editor!' as status;