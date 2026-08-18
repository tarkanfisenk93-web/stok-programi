// Supabase bağlantısı

const SUPABASE_URL = "https://urxbtzborgopjeqwqqfu.supabase.co/rest/v1/";

const SUPABASE_KEY = "sb_publishable_eWD_FzCyLR6UitfER7EXbg_TAP9nVXD";

window.supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
