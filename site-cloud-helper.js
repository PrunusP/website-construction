// 整个网站通用的云端存储助手。
// 使用前需要在页面里先引入 Supabase：
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SITE_SUPABASE_URL = "https://xkxkczcomdwejsziulzp.supabase.co";
const SITE_SUPABASE_ANON_KEY = "sb_publishable_AcVGnGDBzWTZTyVNof5ntw_warQ-j_Q";
const SITE_GUEST_USERNAME = "Homo Sapien";

const siteCloud = (() => {
  const client = supabase.createClient(SITE_SUPABASE_URL, SITE_SUPABASE_ANON_KEY);

  function cleanUsername(username) {
    return String(username || "").trim();
  }

  function isGuestMode() {
    return localStorage.getItem("site_guest_mode") === "yes";
  }

  function enterGuestMode() {
    localStorage.setItem("site_guest_mode", "yes");
  }

  function leaveGuestMode() {
    localStorage.removeItem("site_guest_mode");
  }

  async function currentUser() {
    const { data } = await client.auth.getSession();
    return data.session?.user || null;
  }

  async function currentProfile() {
    if (isGuestMode()) return { username: SITE_GUEST_USERNAME, isGuest: true };

    const user = await currentUser();
    if (!user) return null;

    const { data, error } = await client
      .from("profiles")
      .select("user_id, username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data ? { ...data, isGuest: false } : null;
  }

  async function usernameAvailable(username) {
    const clean = cleanUsername(username);
    if (!clean) return false;

    const { data, error } = await client
      .from("profiles")
      .select("username")
      .eq("username", clean)
      .maybeSingle();

    if (error) throw error;
    return !data;
  }

  async function saveProfile(username) {
    const user = await currentUser();
    if (!user) throw new Error("请先登录");

    const clean = cleanUsername(username);
    if (clean.length < 2 || clean.length > 24) {
      throw new Error("用户名需要 2 到 24 个字。");
    }

    const { data, error } = await client
      .from("profiles")
      .upsert({
        user_id: user.id,
        username: clean,
        updated_at: new Date().toISOString(),
      })
      .select("user_id, username")
      .single();

    if (error) throw error;
    return data;
  }

  async function register(email, password, username) {
    const clean = cleanUsername(username);
    if (!clean) return { error: { message: "请填写用户名。" } };

    const available = await usernameAvailable(clean);
    if (!available) return { error: { message: "这个用户名已经有人用了，请换一个。" } };

    const result = await client.auth.signUp({ email, password });
    if (result.error) return result;

    localStorage.setItem("site_pending_username", clean);

    if (result.data.session?.user) {
      try {
        await saveProfile(clean);
