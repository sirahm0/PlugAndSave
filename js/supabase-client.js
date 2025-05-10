// Initialize Supabase client using values from env.js
import env from './env.js';

// Create and export the Supabase client
const supabaseClient = supabase.createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export default supabaseClient;
