-- Extend profiles table with trainer-specific fields
-- Run this after the basic profiles table is set up

-- Add trainer-specific columns to profiles table
ALTER TABLE public.profiles 
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

-- Create trainer_specialties lookup table for consistency
CREATE TABLE IF NOT EXISTS public.trainer_specialties (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common specialties
INSERT INTO public.trainer_specialties (name, category, description) VALUES
('Strength Training', 'Fitness', 'Building muscle strength and power'),
('Weight Loss', 'Fitness', 'Fat loss and body composition improvement'),
('Muscle Gain', 'Fitness', 'Muscle building and hypertrophy'),
('Cardio Training', 'Fitness', 'Cardiovascular endurance and heart health'),
('HIIT', 'Fitness', 'High-Intensity Interval Training'),
('Yoga', 'Mind-Body', 'Flexibility, balance, and mindfulness'),
('Pilates', 'Mind-Body', 'Core strength and body alignment'),
('CrossFit', 'Fitness', 'Functional fitness and varied workouts'),
('Powerlifting', 'Strength', 'Competitive lifting: squat, bench, deadlift'),
('Olympic Lifting', 'Strength', 'Snatch and clean & jerk techniques'),
('Bodybuilding', 'Fitness', 'Aesthetic muscle development'),
('Functional Training', 'Fitness', 'Movement patterns for daily activities'),
('Sports Conditioning', 'Sports', 'Athletic performance enhancement'),
('Rehabilitation', 'Medical', 'Injury recovery and prevention'),
('Senior Fitness', 'Specialized', 'Training for older adults'),
('Youth Training', 'Specialized', 'Training for children and teens'),
('Pregnancy Fitness', 'Specialized', 'Pre and postnatal exercise'),
('Nutrition Coaching', 'Wellness', 'Diet and nutrition guidance')
ON CONFLICT (name) DO NOTHING;

-- Create certifications lookup table
CREATE TABLE IF NOT EXISTS public.trainer_certifications (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  issuing_body TEXT NOT NULL,
  description TEXT,
  is_recognized BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common certifications
INSERT INTO public.trainer_certifications (name, issuing_body, description) VALUES
('NASM-CPT', 'National Academy of Sports Medicine', 'Certified Personal Trainer'),
('ACSM-CPT', 'American College of Sports Medicine', 'Certified Personal Trainer'),
('ACE-CPT', 'American Council on Exercise', 'Personal Trainer Certification'),
('NSCA-CSCS', 'National Strength and Conditioning Association', 'Certified Strength and Conditioning Specialist'),
('ISSA-CPT', 'International Sports Sciences Association', 'Certified Personal Trainer'),
('CSEP-CPT', 'Canadian Society for Exercise Physiology', 'Certified Personal Trainer'),
('RYT-200', 'Yoga Alliance', '200-Hour Registered Yoga Teacher'),
('RYT-500', 'Yoga Alliance', '500-Hour Registered Yoga Teacher'),
('PMA-CPT', 'Pilates Method Alliance', 'Certified Pilates Teacher'),
('CF-L1', 'CrossFit Inc.', 'CrossFit Level 1 Trainer'),
('CF-L2', 'CrossFit Inc.', 'CrossFit Level 2 Trainer'),
('FMS', 'Functional Movement Systems', 'Functional Movement Screen'),
('TRX-STC', 'TRX', 'Suspension Training Course'),
('Precision Nutrition', 'Precision Nutrition', 'Nutrition Coaching Certification')
ON CONFLICT (name) DO NOTHING;

-- Create function to calculate profile completion percentage
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

-- Create trigger to auto-update profile completion
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_specialties_idx ON public.profiles USING GIN(specialties);
CREATE INDEX IF NOT EXISTS profiles_hourly_rate_idx ON public.profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS profiles_rating_idx ON public.profiles(rating);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(location);
CREATE INDEX IF NOT EXISTS profiles_completion_idx ON public.profiles(profile_completion);

-- Add RLS policies for trainer profile visibility
CREATE POLICY "Public can view trainer profiles" ON public.profiles
  FOR SELECT USING (role = 'trainer' AND profile_completion >= 30);

-- Create storage bucket for profile images (run this in Supabase SQL editor)
-- Note: This might need to be run manually in Supabase dashboard
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for profile images
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view profile images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

-- Verify setup
SELECT 'Trainer profiles schema setup completed successfully!' as status;