import { createClient } from '@supabase/supabase-js'

// Public Supabase credentials (anon key) for client-side usage.
const supabaseUrl = 'https://zxmgqdtsumaokrvzxstq.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bWdxZHRzdW1hb2tydnp4c3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjY5NDksImV4cCI6MjA5MDA0Mjk0OX0.KAPCj3pu6qfJ997eMxEhYz-FwtBeMn2V4gcViU4W5Lo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export default supabase

