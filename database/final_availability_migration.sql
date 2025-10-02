-- Final migration for availability_slots table
-- Makes the new columns NOT NULL and adds constraints

BEGIN;

-- First populate the new columns with data from start_at/end_at if they exist
-- Extract day of week (0=Sunday) and time components
UPDATE public.availability_slots 
SET 
  day_of_week = COALESCE(day_of_week, EXTRACT(DOW FROM start_at)::INTEGER),
  start_time = COALESCE(start_time, start_at::TIME),
  end_time = COALESCE(end_time, end_at::TIME),
  is_recurring = COALESCE(is_recurring, true)
WHERE start_at IS NOT NULL 
  AND (day_of_week IS NULL OR start_time IS NULL OR end_time IS NULL);

-- Now make the required columns NOT NULL
ALTER TABLE public.availability_slots 
ALTER COLUMN day_of_week SET NOT NULL,
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Add check constraint for day_of_week
ALTER TABLE public.availability_slots 
DROP CONSTRAINT IF EXISTS availability_slots_day_of_week_check;

ALTER TABLE public.availability_slots 
ADD CONSTRAINT availability_slots_day_of_week_check 
CHECK (day_of_week >= 0 AND day_of_week <= 6);

-- Add unique constraint to prevent overlapping slots
ALTER TABLE public.availability_slots 
DROP CONSTRAINT IF EXISTS no_overlapping_slots;

ALTER TABLE public.availability_slots
ADD CONSTRAINT no_overlapping_slots 
UNIQUE (trainer_id, day_of_week, start_time);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_availability_trainer_day_time 
ON public.availability_slots(trainer_id, day_of_week, start_time);

COMMIT;

-- Success message
SELECT 'Availability slots migration completed successfully!' as result;