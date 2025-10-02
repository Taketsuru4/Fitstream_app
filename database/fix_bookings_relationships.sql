-- Fix foreign key relationships for bookings table
-- Run this in Supabase SQL Editor

BEGIN;

-- Add foreign key constraints if they don't exist
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_trainer_id_fkey;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_trainer_id_fkey 
FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Refresh the schema cache by recreating RLS policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
CREATE POLICY "Clients can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR trainer_id = auth.uid());

COMMIT;

-- Force schema refresh by checking the relationships
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'bookings'
  AND tc.table_schema = 'public';

-- Success message
SELECT 'Bookings foreign key relationships created successfully!' as result;