-- Check current database state for FitStream authentication
-- Run this to see what's already set up in your database

-- Check if profiles table exists and its structure
SELECT 
  'profiles table' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
    THEN 'EXISTS ✅'
    ELSE 'NOT FOUND ❌'
  END as status;

-- Check profiles table columns if it exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('handle_new_user', 'handle_updated_at');

-- Check if triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Check sample of existing users in auth.users (without sensitive data)
SELECT 
  'auth.users count' as info,
  COUNT(*) as total_users
FROM auth.users;

-- Check existing profiles data
SELECT 
  'profiles count' as info,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'client' THEN 1 END) as clients,
  COUNT(CASE WHEN role = 'trainer' THEN 1 END) as trainers,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as no_role
FROM public.profiles;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles' 
  AND schemaname = 'public';