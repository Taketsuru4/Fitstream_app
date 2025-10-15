-- Create messages table for real-time messaging
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, recipient_id);

-- Enable RLS (Row Level Security)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read messages where they are either sender or recipient
CREATE POLICY "Users can read their own messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = recipient_id
    );

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

-- Users can update their own sent messages (for editing)
CREATE POLICY "Users can edit their sent messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;
CREATE TRIGGER trigger_update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- Create function to get conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants(user_id UUID)
RETURNS TABLE (
    participant_id UUID,
    participant_name TEXT,
    participant_email TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH conversations AS (
        SELECT 
            CASE 
                WHEN m.sender_id = user_id THEN m.recipient_id
                ELSE m.sender_id
            END as other_user_id,
            m.content as last_msg,
            m.created_at as last_msg_at,
            ROW_NUMBER() OVER (
                PARTITION BY 
                CASE 
                    WHEN m.sender_id = user_id THEN m.recipient_id
                    ELSE m.sender_id
                END
                ORDER BY m.created_at DESC
            ) as rn
        FROM messages m
        WHERE m.sender_id = user_id OR m.recipient_id = user_id
    ),
    unread_counts AS (
        SELECT 
            m.sender_id,
            COUNT(*) as unread_count
        FROM messages m
        WHERE m.recipient_id = user_id 
        AND m.read_at IS NULL
        GROUP BY m.sender_id
    )
    SELECT 
        c.other_user_id,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.email,
        c.last_msg,
        c.last_msg_at,
        COALESCE(uc.unread_count, 0) as unread_count
    FROM conversations c
    JOIN auth.users u ON u.id = c.other_user_id
    LEFT JOIN unread_counts uc ON uc.sender_id = c.other_user_id
    WHERE c.rn = 1
    ORDER BY c.last_msg_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_participants TO authenticated;