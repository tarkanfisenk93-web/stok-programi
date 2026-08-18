// Supabase bilgilerini buraya yaz.
const SUPABASE_URL = "BURAYA_SUPABASE_PROJECT_URL";
const SUPABASE_KEY = "BURAYA_SUPABASE_PUBLISHABLE_KEY"; // Service role kullanma!
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
