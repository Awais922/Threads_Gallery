const supabaseUrl = 'https://dxmpzipsopamcqspowqx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bXB6aXBzb3BhbWNxc3Bvd3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDM2ODQsImV4cCI6MjEwMDM3OTY4NH0.0p5c_hk4x8UmO7YwEHO7tzYi8JwTk-wynrMOvmvsW6I';

if (!window.supabase) {
    throw new Error('Supabase JS client library must be loaded before supabase_configuration.js');
}

window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase initialized successfully');