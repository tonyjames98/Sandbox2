// Supabase configuration
// Replace these with your actual Supabase project URL and Anon key
const SUPABASE_URL = 'https://vvkwvsmtlbpgqpztwoqh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z3Pf5eDXwxe9hVA2iSzWGQ_AFPeRipU';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
