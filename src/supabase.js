import { createClient } from '@supabase/supabase-js';

// Your unique Supabase Project URL
const supabaseUrl = 'https://cpvhzdxxpgftjkjqadec.supabase.co';

// Replace this with your Supabase anon public API key from Project Settings -> API -> anon public
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdmh6ZHh4cGdmdGpranFhZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDY4NjEsImV4cCI6MjA5NTg4Mjg2MX0._nBO3Dlv09pHh8LjcLfMH7sovDvQJDz9qKAN_rlrP4I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
