// 整个网站通用的云端存储助手。
// 使用前需要在页面里先引入 Supabase：
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SITE_SUPABASE_URL = "https://xkxkczcomdwejsziulzp.supabase.co";
const SITE_SUPABASE_ANON_KEY = "sb_publishable_AcVGnGDBzWTZTyVNof5ntw_warQ-j_Q";

const siteCloud = (() => {
  const client = supabase.createClient(SITE_SUPABASE_URL, SITE_SUPABASE_ANON_KEY);

  async function currentUser() {
    const { data } = await client.auth.getSession();
    return data.session?.user || null;
  }

  async function register(email, password) {
    return client.auth.signUp({ email, password });
  }

  async function login(email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  async function logout() {
    return client.auth.signOut();
  }

  async function list(app, options = {}) {
    let query = client
      .from("site_items")
      .select("*")
      .eq("app", app)
      .order("item_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (options.itemType) query = query.eq("item_type", options.itemType);
    if (options.fromDate) query = query.gte("item_date", options.fromDate);
    if (options.toDate) query = query.lt("item_date", options.toDate);

    return query;
  }

  async function add(app, item) {
    const user = await currentUser();
    if (!user) throw new Error("请先登录");

    return client.from("site_items").insert({
      user_id: user.id,
      app,
      item_type: item.itemType || "item",
      title: item.title || "",
      data: item.data || {},
      item_date: item.itemDate || null,
    });
  }

  async function update(id, changes) {
    return client
      .from("site_items")
      .update({
        title: changes.title,
        data: changes.data,
        item_date: changes.itemDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  async function remove(id) {
    return client.from("site_items").delete().eq("id", id);
  }

  return { client, currentUser, register, login, logout, list, add, update, remove };
})();
