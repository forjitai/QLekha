import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  'https://yqtgfgvcohuwaaugxlrz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdGdmZ3Zjb2h1d2FhdWd4bHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTA2MjEsImV4cCI6MjA5OTk2NjYyMX0.-ovhA3WmSxmSRU5pa6p7I4Flja0MziiQwGtYzzOO7Oo',
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
)
