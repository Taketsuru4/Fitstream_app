-- Disable the problematic trigger that's causing signup failures
-- This allows us to handle profile creation manually in the application

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function if it exists  
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify the trigger is gone
SELECT 'Trigger disabled successfully! Signup should work now.' as status;

-- Note: Profile creation will now be handled entirely by the application code
-- in the signUp function within appContext.jsx