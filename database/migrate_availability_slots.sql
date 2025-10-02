-- Migration script to update availability_slots table structure
-- This adds the missing columns needed for the booking system

BEGIN;

-- 1. Add the missing columns to availability_slots table
ALTER TABLE public.availability_slots 
ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

-- 2. If there's existing data, we need to populate the new columns
-- Extract day_of_week from start_at timestamp and time from start_at/end_at
UPDATE public.availability_slots 
SET 
  day_of_week = EXTRACT(DOW FROM start_at),
  start_time = start_at::TIME,
  end_time = end_at::TIME,
  is_recurring = true
WHERE day_of_week IS NULL;

-- 3. Make day_of_week, start_time, end_time NOT NULL after populating data
ALTER TABLE public.availability_slots 
ALTER COLUMN day_of_week SET NOT NULL,
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- 4. Add the unique constraint for preventing overlapping slots
ALTER TABLE public.availability_slots 
DROP CONSTRAINT IF EXISTS no_overlapping_slots;

ALTER TABLE public.availability_slots
ADD CONSTRAINT no_overlapping_slots 
UNIQUE (trainer_id, day_of_week, start_time);

-- 5. Create index for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_availability_trainer_day_time 
ON public.availability_slots(trainer_id, day_of_week, start_time);

-- 6. Add comment to explain the schema
COMMENT ON COLUMN public.availability_slots.day_of_week IS '0 = Sunday, 1 = Monday, ..., 6 = Saturday';
COMMENT ON TABLE public.availability_slots IS 'Stores trainer weekly recurring availability slots';

COMMIT;

-- Success message
SELECT 'Migration completed successfully! availability_slots table now has day_of_week, start_time, end_time columns.' as status;