-- Add specific_date to availability slots and update availability function
BEGIN;

-- 1) Add specific_date column (one-off slots)
ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS specific_date DATE;

-- 2) Keep existing NOT NULL constraints for day_of_week/start_time/end_time
-- Ensure day_of_week matches specific_date for one-off rows (optional backfill)
UPDATE public.availability_slots
SET day_of_week = COALESCE(day_of_week, EXTRACT(DOW FROM specific_date)::INTEGER)
WHERE specific_date IS NOT NULL AND day_of_week IS NULL;

-- 3) Replace overlapping unique constraint with partial unique indexes
ALTER TABLE public.availability_slots
  DROP CONSTRAINT IF EXISTS no_overlapping_slots;

-- Recurring weekly: unique per (trainer_id, day_of_week, start_time)
CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_recurring
  ON public.availability_slots(trainer_id, day_of_week, start_time)
  WHERE is_recurring IS TRUE AND day_of_week IS NOT NULL;

-- One-off by specific date: unique per (trainer_id, specific_date, start_time)
CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_oneoff
  ON public.availability_slots(trainer_id, specific_date, start_time)
  WHERE is_recurring IS FALSE AND specific_date IS NOT NULL;

-- 4) Update helper function to include one-off slots for the selected date
CREATE OR REPLACE FUNCTION get_trainer_availability(
  trainer_uuid UUID,
  target_date DATE
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
    WITH candidate_slots AS (
      SELECT a.start_time, a.end_time
      FROM public.availability_slots a
      WHERE a.trainer_id = trainer_uuid
        AND (
          (a.is_recurring IS TRUE AND a.day_of_week = EXTRACT(DOW FROM target_date)) OR
          (a.is_recurring IS FALSE AND a.specific_date = target_date)
        )
    )
    SELECT 
      cs.start_time,
      cs.end_time,
      NOT EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.trainer_id = trainer_uuid 
          AND b.booking_date = target_date
          AND b.status NOT IN ('cancelled')
          AND (
            (b.start_time <= cs.start_time AND b.end_time > cs.start_time) OR
            (b.start_time < cs.end_time AND b.end_time >= cs.end_time) OR
            (b.start_time >= cs.start_time AND b.end_time <= cs.end_time)
          )
      ) as is_available
    FROM candidate_slots cs
    GROUP BY cs.start_time, cs.end_time
    ORDER BY cs.start_time;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Run this migration in Supabase SQL editor. After running, trainers can add one-off slots by date, and the Book page will include them automatically.
