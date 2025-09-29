-- Comprehensive database setup for FitStream app
-- This script sets up all necessary tables, triggers, policies, and functions

-- 1. Create extensions schema and required extensions
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- 2. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'trainer')) DEFAULT 'client',
  phone TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create availability_slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id BIGSERIAL PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create bookings table
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

-- 5. Create session_notes table
CREATE TABLE IF NOT EXISTS public.session_notes (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- 7. Updated handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$;

-- 8. Create trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Create updated_at triggers for all tables
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

DROP TRIGGER IF EXISTS handle_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER handle_session_notes_updated_at
  BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. Add recommended indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_availability_trainer_id ON public.availability_slots(trainer_id);
CREATE INDEX IF NOT EXISTS idx_availability_published ON public.availability_slots(is_published);
CREATE INDEX IF NOT EXISTS idx_availability_start_at ON public.availability_slots(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_id ON public.bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_session_notes_booking ON public.session_notes(booking_id);

-- 12. Add exclusion constraint for availability slots to prevent overlaps
ALTER TABLE public.availability_slots DROP CONSTRAINT IF EXISTS availability_no_overlap;
ALTER TABLE public.availability_slots
  ADD CONSTRAINT availability_no_overlap
  EXCLUDE USING gist (
    trainer_id WITH =, 
    tstzrange(start_at, end_at, '[)') WITH &&
  );

-- 13. PROFILES policies
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

DROP POLICY IF EXISTS "Clients can view trainer profiles" ON public.profiles;
CREATE POLICY "Clients can view trainer profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'trainer');

-- 14. AVAILABILITY SLOTS policies
DROP POLICY IF EXISTS "Anyone can read published slots" ON public.availability_slots;
CREATE POLICY "Anyone can read published slots" ON public.availability_slots
  FOR SELECT TO public
  USING (is_published = true);

DROP POLICY IF EXISTS "Trainer can read own slots" ON public.availability_slots;
CREATE POLICY "Trainer can read own slots" ON public.availability_slots
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can insert own slots" ON public.availability_slots;
CREATE POLICY "Trainer can insert own slots" ON public.availability_slots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can update own slots" ON public.availability_slots;
CREATE POLICY "Trainer can update own slots" ON public.availability_slots
  FOR UPDATE TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can delete own slots" ON public.availability_slots;
CREATE POLICY "Trainer can delete own slots" ON public.availability_slots
  FOR DELETE TO authenticated
  USING (auth.uid() = trainer_id);

-- 15. BOOKINGS policies
DROP POLICY IF EXISTS "Client can read own bookings" ON public.bookings;
CREATE POLICY "Client can read own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Trainer can read own bookings" ON public.bookings;
CREATE POLICY "Trainer can read own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Client can create booking" ON public.bookings;
CREATE POLICY "Client can create booking" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND trainer_id = (SELECT trainer_id FROM public.availability_slots WHERE id = slot_id)
    AND EXISTS (
      SELECT 1 FROM public.availability_slots 
      WHERE id = slot_id AND is_published = true AND start_at > NOW()
    )
  );

DROP POLICY IF EXISTS "Client can update own booking" ON public.bookings;
CREATE POLICY "Client can update own booking" ON public.bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Trainer can update own booking" ON public.bookings;
CREATE POLICY "Trainer can update own booking" ON public.bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- 16. SESSION NOTES policies
DROP POLICY IF EXISTS "Trainer can select notes" ON public.session_notes;
CREATE POLICY "Trainer can select notes" ON public.session_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can insert notes" ON public.session_notes;
CREATE POLICY "Trainer can insert notes" ON public.session_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can update notes" ON public.session_notes;
CREATE POLICY "Trainer can update notes" ON public.session_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainer can delete notes" ON public.session_notes;
CREATE POLICY "Trainer can delete notes" ON public.session_notes
  FOR DELETE TO authenticated
  USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Client can read own notes" ON public.session_notes;
CREATE POLICY "Client can read own notes" ON public.session_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- 17. Booking management functions
CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id BIGINT, p_note TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE 
  v_trainer UUID;
  v_id BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the slot and get trainer info
  SELECT trainer_id INTO v_trainer
  FROM public.availability_slots
  WHERE id = p_slot_id
    AND is_published = true
    AND start_at > NOW()
  FOR UPDATE;

  IF v_trainer IS NULL THEN
    RAISE EXCEPTION 'Slot not available for booking';
  END IF;

  -- Create the booking
  INSERT INTO public.bookings (slot_id, trainer_id, client_id, note_from_client, status)
  VALUES (p_slot_id, v_trainer, auth.uid(), p_note, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_booking(p_booking_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE 
  v_trainer UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trainer_id INTO v_trainer 
  FROM public.bookings 
  WHERE id = p_booking_id;
  
  IF v_trainer IS NULL OR v_trainer != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to confirm this booking';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed'
  WHERE id = p_booking_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already processed';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE 
  v_trainer UUID;
  v_client UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trainer_id, client_id INTO v_trainer, v_client
  FROM public.bookings 
  WHERE id = p_booking_id;

  IF v_trainer IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF auth.uid() != v_trainer AND auth.uid() != v_client THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  UPDATE public.bookings 
  SET status = 'cancelled' 
  WHERE id = p_booking_id AND status IN ('pending', 'confirmed');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already processed';
  END IF;
END;
$$;

-- 18. Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.book_slot(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(BIGINT) TO authenticated;

-- 19. Verification query
SELECT 'Database setup completed successfully!' AS status;