// Supabase Configuration
// Update these values with your Supabase cloud project details

// For Supabase Cloud (Production)
export const SUPABASE_CONFIG = {
  // Replace with your actual Supabase project URL
  url: 'https://vroanjodovwsyydxrmma.supabase.co',
  // Replace with your actual Supabase anon key
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw',
  
  // For local development (uncomment to use local)
  // url: 'http://192.168.1.10:54321',
  // anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};

// Environment detection
export const isLocalDevelopment = SUPABASE_CONFIG.url.includes('localhost') || SUPABASE_CONFIG.url.includes('192.168.1.10');
export const isCloudProduction = !isLocalDevelopment; 