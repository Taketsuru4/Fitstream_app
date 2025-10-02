-- Simple migration to add missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE public.availability_slots 
ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

-- Success message
SELECT 'Migration completed! New columns added to availability_slots.' as result;