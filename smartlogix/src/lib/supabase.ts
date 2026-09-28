import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://tukysvupnqlypzjdcqwl.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1a3lzdnVwbnFseXB6amRjcXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzIyNTgsImV4cCI6MjEwNjEwODI1OH0.JXqpUAt-gvb5trfuE8TM-GiAL2DDKn-pX2AdbJDyExk';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
