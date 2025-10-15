-- Create workout sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT DEFAULT 'training' CHECK (session_type IN ('training', 'assessment', 'consultation')),
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create workout exercises table
CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    sets_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {reps, weight, notes}
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_trainer_id ON workout_sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_trainer_client ON workout_sessions(trainer_id, client_id);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_session_id ON workout_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_name ON workout_exercises(exercise_name);

-- Enable RLS (Row Level Security)
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_sessions
-- Trainers can manage sessions for their clients
CREATE POLICY "Trainers can manage their sessions" ON workout_sessions
    FOR ALL USING (
        auth.uid() = trainer_id
    );

-- Clients can view their own sessions
CREATE POLICY "Clients can view their sessions" ON workout_sessions
    FOR SELECT USING (
        auth.uid() = client_id
    );

-- RLS Policies for workout_exercises
-- Access through session permissions
CREATE POLICY "Exercise access through sessions" ON workout_exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workout_sessions ws 
            WHERE ws.id = workout_exercises.session_id 
            AND (ws.trainer_id = auth.uid() OR ws.client_id = auth.uid())
        )
    );

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_workout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_workout_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_workout_sessions_updated_at ON workout_sessions;
CREATE TRIGGER trigger_update_workout_sessions_updated_at
    BEFORE UPDATE ON workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_workout_sessions_updated_at();

DROP TRIGGER IF EXISTS trigger_update_workout_exercises_updated_at ON workout_exercises;
CREATE TRIGGER trigger_update_workout_exercises_updated_at
    BEFORE UPDATE ON workout_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_workout_exercises_updated_at();

-- Create function to get client workout statistics
CREATE OR REPLACE FUNCTION get_client_workout_stats(client_uuid UUID)
RETURNS TABLE (
    total_sessions BIGINT,
    total_minutes BIGINT,
    unique_exercises BIGINT,
    avg_session_duration NUMERIC,
    recent_sessions BIGINT -- last 30 days
) AS $$
BEGIN
    RETURN QUERY
    WITH session_stats AS (
        SELECT 
            COUNT(*) as total_sessions,
            SUM(duration) as total_minutes,
            AVG(duration) as avg_duration,
            COUNT(CASE WHEN session_date >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_count
        FROM workout_sessions
        WHERE client_id = client_uuid AND status = 'completed'
    ),
    exercise_stats AS (
        SELECT COUNT(DISTINCT we.exercise_name) as unique_exercise_count
        FROM workout_exercises we
        JOIN workout_sessions ws ON ws.id = we.session_id
        WHERE ws.client_id = client_uuid AND ws.status = 'completed'
    )
    SELECT 
        COALESCE(ss.total_sessions, 0),
        COALESCE(ss.total_minutes, 0),
        COALESCE(es.unique_exercise_count, 0),
        COALESCE(ss.avg_duration, 0),
        COALESCE(ss.recent_count, 0)
    FROM session_stats ss
    CROSS JOIN exercise_stats es;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get exercise progress for a client
CREATE OR REPLACE FUNCTION get_exercise_progress(client_uuid UUID, exercise_name_param TEXT)
RETURNS TABLE (
    session_date TIMESTAMP WITH TIME ZONE,
    max_weight NUMERIC,
    total_volume NUMERIC,
    sets_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.session_date,
        (
            SELECT MAX((set_data->>'weight')::NUMERIC)
            FROM jsonb_array_elements(we.sets_data) as set_data
            WHERE set_data->>'weight' IS NOT NULL AND set_data->>'weight' != ''
        ) as max_weight,
        (
            SELECT SUM(
                COALESCE((set_data->>'reps')::NUMERIC, 0) * 
                COALESCE((set_data->>'weight')::NUMERIC, 0)
            )
            FROM jsonb_array_elements(we.sets_data) as set_data
        ) as total_volume,
        jsonb_array_length(we.sets_data) as sets_count
    FROM workout_exercises we
    JOIN workout_sessions ws ON ws.id = we.session_id
    WHERE ws.client_id = client_uuid 
    AND ws.status = 'completed'
    AND we.exercise_name ILIKE exercise_name_param
    ORDER BY ws.session_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get trainer session summary
CREATE OR REPLACE FUNCTION get_trainer_session_summary(trainer_uuid UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS TABLE (
    total_sessions BIGINT,
    total_clients BIGINT,
    total_minutes BIGINT,
    avg_session_duration NUMERIC,
    session_types JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT client_id) as total_clients,
        SUM(duration) as total_minutes,
        AVG(duration) as avg_duration,
        jsonb_object_agg(session_type, type_count) as session_types
    FROM (
        SELECT 
            ws.*,
            COUNT(*) OVER (PARTITION BY session_type) as type_count
        FROM workout_sessions ws
        WHERE ws.trainer_id = trainer_uuid 
        AND ws.status = 'completed'
        AND (start_date IS NULL OR ws.session_date::DATE >= start_date)
        AND (end_date IS NULL OR ws.session_date::DATE <= end_date)
    ) grouped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workout_exercises TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_workout_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_trainer_session_summary TO authenticated;