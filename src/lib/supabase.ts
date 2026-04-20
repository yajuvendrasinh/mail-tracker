import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder';

// For general client-side/server-side operations with user permissions
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For background operations or privileged tasks (like the tracking endpoint)
// ONLY use this on the server
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
