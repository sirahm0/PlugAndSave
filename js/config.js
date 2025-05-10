// This file sets up and configures the Supabase client for database and authentication
// Supabase is our backend-as-a-service (BaaS) provider

// Import the Supabase client creation function from the CDN
// Using ESM (ECMAScript Module) version for better compatibility
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Import environment variables from our local env.js file
// This keeps sensitive data like API keys separate from the code
import env from './env.js';

// Create an object to store Supabase configuration
// This makes it easier to manage and export the config values
const SUPABASE_CONFIG = {
    // Get the Supabase project URL from environment variables
    // This is the unique URL for your Supabase project
    supabaseUrl: env.get('SUPABASE_URL'),
    
    // Get the public anon/API key from environment variables
    // This key is safe to expose in client-side code
    supabaseKey: env.get('SUPABASE_KEY')
};

// Initialize the Supabase client with our configuration
// This creates the main interface we'll use to interact with Supabase
const supabase = createClient(
    SUPABASE_CONFIG.supabaseUrl,     // The project URL
    SUPABASE_CONFIG.supabaseKey,     // The API key
    {
        auth: {
            // Keep user logged in between page refreshes
            persistSession: true,
            
            // Automatically refresh the auth token when it expires
            autoRefreshToken: true,
            
            // Look for auth tokens in URL (needed for OAuth and password reset)
            detectSessionInUrl: true,
            
            // Store auth session in browser's localStorage
            // This allows the session to persist even when browser is closed
            storage: window.localStorage
        }
    }
);

// Log successful initialization for debugging
console.log('Supabase client initialized');

// Export the configuration object for use in other files
// This allows other parts of the app to access the Supabase URLs and keys
export default SUPABASE_CONFIG;

// Export the initialized Supabase client
// This is what most files will import to interact with Supabase
export { supabase };
