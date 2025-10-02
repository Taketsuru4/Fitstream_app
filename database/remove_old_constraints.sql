-- Remove old constraints from availability_slots table
-- This will allow the new schema to work properly

BEGIN;

-- Make the old timestamp columns nullable so they don't interfere
ALTER TABLE public.availability_slots 
ALTER COLUMN start_at DROP NOT NULL,
ALTER COLUMN end_at DROP NOT NULL;

-- Drop any remaining constraints on the old columns
ALTER TABLE public.availability_slots 
DROP CONSTRAINT IF EXISTS availability_no_overlap;

-- Ensure the new columns have proper constraints
ALTER TABLE public.availability_slots 
ALTER COLUMN day_of_week SET NOT NULL,
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Add the proper unique constraint for the new schema
ALTER TABLE public.availability_slots 
DROP CONSTRAINT IF EXISTS no_overlapping_slots;

ALTER TABLE public.availability_slots
ADD CONSTRAINT no_overlapping_slots 
UNIQUE (trainer_id, day_of_week, start_time);

COMMIT;

-- Check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'availability_slots' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Old constraints removed successfully!' as result;