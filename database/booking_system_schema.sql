-- FitStream Booking System Database Schema
-- This script creates the tables needed for the booking system
-- Run this in your Supabase SQL editor

-- 1. Availability Slots Table
-- Stores trainer availability (recurring weekly schedule)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure trainer can't have overlapping slots on same day
  CONSTRAINT no_overlapping_slots UNIQUE (trainer_id, day_of_week, start_time)
);

-- 2. Bookings Table
-- Stores actual booking sessions between clients and trainers
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Session details
  session_type VARCHAR(20) DEFAULT 'virtual' CHECK (session_type IN ('virtual', 'in_person')),
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Booking status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  
  -- Additional info
  client_notes TEXT,
  trainer_notes TEXT,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_times CHECK (end_time > start_time),
  CONSTRAINT future_booking CHECK (booking_date >= CURRENT_DATE),
  CONSTRAINT positive_price CHECK (total_price >= 0)
);

-- 3. Booking Status History (for tracking changes)
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add foreign key constraints after table creation
ALTER TABLE booking_status_history 
ADD CONSTRAINT fk_booking_status_history_booking_id 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_availability_trainer_day ON availability_slots(trainer_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer ON bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking_status_history(booking_id);

-- 6. RLS (Row Level Security) Policies
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

-- Availability Slots Policies
CREATE POLICY "Trainers can manage their own availability" ON availability_slots
  FOR ALL USING (trainer_id = auth.uid() OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'trainer' AND id = trainer_id
  ));

CREATE POLICY "Anyone can view availability slots" ON availability_slots
  FOR SELECT USING (true);

-- Bookings Policies
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    client_id = auth.uid() OR 
    trainer_id = auth.uid()
  );

CREATE POLICY "Clients can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    client_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'client')
  );

CREATE POLICY "Clients and trainers can update their bookings" ON bookings
  FOR UPDATE USING (
    client_id = auth.uid() OR trainer_id = auth.uid()
  );

-- Booking Status History Policies  
CREATE POLICY "Users can view booking history for their bookings" ON booking_status_history
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE client_id = auth.uid() OR trainer_id = auth.uid()
    )
  );

-- 7. Functions for automated status tracking
CREATE OR REPLACE FUNCTION update_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set timestamp based on status change
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN NEW.confirmed_at = NOW();
      WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
      WHEN 'completed' THEN NEW.completed_at = NOW();
      ELSE NULL;
    END CASE;
    
    -- Insert status history record
    INSERT INTO booking_status_history (booking_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_timestamps();

-- 8. Helper function to get trainer availability for a specific date
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
  SELECT 
    a.start_time,
    a.end_time,
    NOT EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.trainer_id = trainer_uuid 
        AND b.booking_date = target_date
        AND b.status NOT IN ('cancelled')
        AND (
          (b.start_time <= a.start_time AND b.end_time > a.start_time) OR
          (b.start_time < a.end_time AND b.end_time >= a.end_time) OR
          (b.start_time >= a.start_time AND b.end_time <= a.end_time)
        )
    ) as is_available
  FROM availability_slots a
  WHERE a.trainer_id = trainer_uuid
    AND a.day_of_week = EXTRACT(DOW FROM target_date)
  ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql;

-- 9. Sample data for development (optional)
-- Uncomment to add sample availability slots
/*
INSERT INTO availability_slots (trainer_id, day_of_week, start_time, end_time) VALUES
-- Monday (1) to Friday (5) for trainer 1
('22222222-2222-2222-2222-222222222222', 1, '09:00', '10:00'),
('22222222-2222-2222-2222-222222222222', 1, '10:00', '11:00'),
('22222222-2222-2222-2222-222222222222', 1, '14:00', '15:00'),
('22222222-2222-2222-2222-222222222222', 1, '15:00', '16:00'),
('22222222-2222-2222-2222-222222222222', 2, '09:00', '10:00'),
('22222222-2222-2222-2222-222222222222', 2, '10:00', '11:00'),
('22222222-2222-2222-2222-222222222222', 3, '09:00', '10:00'),
('22222222-2222-2222-2222-222222222222', 3, '14:00', '15:00');
*/