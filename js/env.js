// Environment configuration
// This file contains configuration values that would normally come from environment variables
// In a production environment, these would be injected during the build process

const env = {
  // Supabase configuration
  SUPABASE_URL: 'https://fzrxktbxjbcmbudiouqa.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cnhrdGJ4amJjbWJ1ZGlvdXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3ODE0OTIsImV4cCI6MjA2MTM1NzQ5Mn0.5YdJ6ehev3gCqdxcTEjI__l7ScHuphdMSHNkwHIGWYI',

  // Application settings
  APP_NAME: 'Plug&Save',
  APP_VERSION: '1.0.0',
  
  // Helper method to get a value
  get: function(key) {
    return this[key];
  }
};

export default env;
