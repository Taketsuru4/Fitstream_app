-- Simple migration to add specific_date column
BEGIN;

-- 1) Add specific_date column
ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS specific_date DATE;

-- 2) Update get_trainer_availability function to include one-off slots
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
          -- Recurring weekly slots (original logic)
          (a.is_recurring IS TRUE AND a.day_of_week = EXTRACT(DOW FROM target_date)) OR
          -- One-off date-specific slots (new logic)
          (a.specific_date = target_date)
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

-- Success message
SELECT 'Specific date availability added successfully!' as result;