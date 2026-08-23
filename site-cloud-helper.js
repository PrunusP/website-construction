
const SITE_SUPABASE_URL = "https://xkxkczcomdwejsziulzp.supabase.co";
const SITE_SUPABASE_ANON_KEY = "sb_publishable_AcVGnGDBzWTZTyVNof5ntw_warQ-j_Q";

window.siteSupabase = window.supabase.createClient(
  SITE_SUPABASE_URL,
  SITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
