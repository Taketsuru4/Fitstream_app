import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Environment Check:')
console.log('URL present:', !!supabaseUrl)
console.log('Key present:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.error('Available env vars:', Object.keys(import.meta.env))
  throw new Error('Supabase configuration is missing. Please check your environment variables in Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
