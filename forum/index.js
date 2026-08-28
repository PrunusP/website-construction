
      const forumDrawer =
        document.getElementById("forumDrawer");

      const drawerButton =
        document.getElementById("drawerButton");

      const userGreeting =
        document.getElementById("userGreeting");

      const startDiscussionButton =
        document.getElementById(
          "startDiscussionButton"
        );

        const adminPageButton =
  document.getElementById(
    "adminPageButton"
  );

      function setDrawerOpen(isOpen) {
        forumDrawer.classList.toggle(
          "is-open",
          isOpen
        );

        drawerButton.setAttribute(
          "aria-expanded",
          String(isOpen)
        );

        drawerButton.setAttribute(
          "aria-label",
          isOpen
            ? "关闭论坛导航"
            : "打开论坛导航"
        );

        drawerButton
          .querySelector("span")
          .textContent = isOpen ? "›" : "‹";
      }

      // 点击右侧把手时切换打开状态
      drawerButton.addEventListener(
        "click",
        function () {
          const isOpen =
            forumDrawer.classList.contains(
              "is-open"
            );

          setDrawerOpen(!isOpen);
        }
      );

      // 点击侧栏外面时关闭侧栏
      document.addEventListener(
        "pointerdown",
        function (event) {
          if (
            forumDrawer.classList.contains(
              "is-open"
            ) &&
            !forumDrawer.contains(event.target)
          ) {
            setDrawerOpen(false);
          }
        }
      );

      // 按 Escape 键关闭侧栏
      document.addEventListener(
        "keydown",
        function (event) {
          if (event.key === "Escape") {
            setDrawerOpen(false);
            drawerButton.focus();
          }
        }
      );
async function loadCurrentUser() {
  /*
   * 默认隐藏管理员入口。
   */
  adminPageButton.hidden = true;

  try {
    const {
      data: { user },
      error: userError
    } =
      await window.siteSupabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    /*
     * 没有登录。
     */
    if (!user) {
      userGreeting.textContent =
        "Hi, 访客";

      startDiscussionButton.href =
        "../login.html";

      startDiscussionButton
        .querySelector("span")
        .textContent =
          "登录后发起讨论";

      return;
    }

    /*
     * 先使用 Auth metadata 中的用户名。
     */
    let username =
      user.user_metadata?.username
      ?? "用户";

    /*
     * 从 profiles 表读取用户名。
     */
    const {
      data: profile,
      error: profileError
    } =
      await window.siteSupabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.warn(
        "读取用户资料失败：",
        profileError
      );
    } else if (profile?.username) {
      username = profile.username;
    }

    userGreeting.textContent =
      `Hi, ${username}`;

    /*
     * 检查当前用户是不是管理员。
     */

      const {
  data: adminRole,
  error: adminError
} =
  await window.siteSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

    if (adminError) {
      console.error(
        "检查管理员身份失败：",
        adminError
      );

      adminPageButton.hidden = true;
      return;
    }

/*
 * 找到 admin 记录就显示按钮，
 * 没找到就隐藏按钮。
 */
adminPageButton.hidden =
  adminRole?.role !== "admin";
  } catch (error) {
    console.error(
      "读取当前用户失败：",
      error
    );

    userGreeting.textContent =
      "Hi, 访客";

    adminPageButton.hidden = true;
  }
}
      loadCurrentUser();


  /*
   * 数据库 category 值和 HTML 容器的对应关系。
   */
  const categoryContainers = {
    physics: document.getElementById(
      "physicsPostList"
    ),

    literature: document.getElementById(
      "literaturePostList"
    ),

    chat: document.getElementById(
      "chatPostList"
    ),
  };

  /*
   * 数据库标签值与中文名称的对应关系。
   */
  const tagNames = {
    unsolved: "未解决",
    solved: "已解决",
    other: "其他",

    Physics1: "AP Physics 1",
    Physics2: "AP Physics 2",
    PhysicsC: "AP Physics C",
    solution: "题解",

    english: "English",
    chinese: "中文",
    otherLanguage: "其他语言",
    jotting: "随笔",
    criticize: "文学批评",
    novel: "小说"

 
  };

  async function loadForumPosts() {
    /*
     * 先清空所有区域中的“正在加载”文字。
     */
    for (
      const container
      of Object.values(categoryContainers)
    ) {
      if (container) {
        container.replaceChildren();
      }
    }

    try {
      const { data: posts, error } =
        await window.siteSupabase
          .from("posts")
          .select(`
            post_id,
            author_id,
            title,
            category,
            tags,
            content,
            created_at
          `)
          .order("created_at", {
            ascending: false
          })
          .limit(100);

      if (error) {
        throw error;
      }
      const authorIds = [
        ...new Set(
          posts
            .map(function (post) {
              return post.author_id;
            })
            .filter(Boolean)
        )
      ];

      let usernameByUserId = {};
          if (authorIds.length > 0) {
      const {
        data: profiles,
        error: profilesError
      } =
        await window.siteSupabase
          .from("profiles")
          .select("id, username")
          .in("id", authorIds);

    if (profilesError) {
      console.warn(
        "读取帖子作者用户名失败：",
        profilesError
      );
    } else {
      usernameByUserId =
        Object.fromEntries(
          (profiles ?? []).map(
            function (profile) {
              return [
                profile.id,
                profile.username
              ];
            }
          )
        );
    }
      }
      /*
       * 把每个帖子放到它所属的区域中。
       */
      for (const post of posts) {
        const targetContainer =//储存目标区域的id
          categoryContainers[post.category];

        /*
         * 如果数据库中的 category 不在我们定义的
         * 区域中，就暂时跳过这个帖子。
         */
        if (!targetContainer) {
          console.warn(
            "未知的帖子区域：",
            post.category,
            post
          );

          continue;
        }

        const postElement =
          createPostElement(post,usernameByUserId);

        targetContainer.append(postElement);
      }

      showEmptyCategoryMessages();
    } catch (error) {
      console.error("加载帖子失败：", error);

      for (
        const container
        of Object.values(categoryContainers)
      ) {
        if (!container) {
          continue;
        }

        const errorMessage =
          document.createElement("p");

        errorMessage.className =
          "forum-post-empty";

        errorMessage.textContent =
          "帖子加载失败，请稍后重试。";

        container.append(errorMessage);
      }
    }
  }

  /*
   * 根据一条数据库记录创建帖子 HTML。
   */
  function createPostElement(post,usernameByUserId) {
    const card =
      document.createElement("a");

    card.className = "forum-post-card";

    card.href =
    `./discussion.html?id=${encodeURIComponent(
      post.post_id
    )}`;


    const heading =
      document.createElement("div");

    heading.className = "forum-post-heading";

    const title =
      document.createElement("h3");

    /*
     * 使用 textContent，避免帖子内容被当成 HTML 执行。
     */
    title.textContent = post.title || "无标题讨论";

if (post.isPinned) {
  const pinIcon =
    document.createElement("span");

  pinIcon.className =
    "forum-post-pin";

  pinIcon.textContent = "📌";

  pinIcon.setAttribute(
    "aria-label",
    "置顶帖子"
  );

  title.append(" ", pinIcon);
}

    const time =
      document.createElement("time");

    time.className = "forum-post-time";

    const createdDate =
      new Date(post.created_at);

    time.dateTime = post.created_at;

    time.textContent =
      createdDate.toLocaleString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

    heading.append(title, time);

    const tagsContainer =
      document.createElement("div");

    tagsContainer.className = "forum-post-tags";

    for (const tag of post.tags ?? []) {
      const tagElement =
        document.createElement("span");

      tagElement.textContent =
        tagNames[tag] ?? tag;
//tagElement.className = "forum-post-tags-names"
      tagsContainer.append(tagElement);
    }

    const footer =
      document.createElement("footer");

    footer.className = "forum-post-footer";

    const author =
      document.createElement("span");

    /*
     * 显示用户名，
     * 若没有用户名显示用户 UUID 的前八位。
     */
    const username =
      usernameByUserId[post.author_id]
      ?? `用户 ${
        post.author_id?.slice(0, 8) ?? "未知"
      }`;

    author.textContent = username;

    const openText =
        document.createElement("span");

    openText.className = "forum-post-open";
    openText.textContent = "查看讨论 ›";

    

    footer.append(author, openText);

    card.append(
      heading,
      tagsContainer,
      footer
    );

    return card;
  } 
  
  /*
   * 如果某个区域没有帖子，显示空状态。
   */
  function showEmptyCategoryMessages() {
    for (
      const [category, container]
      of Object.entries(categoryContainers)
    ) {
      if (!container || container.children.length > 0) {
        continue;
      }

      const emptyMessage =
        document.createElement("p");

      emptyMessage.className =
        "forum-post-empty";

      emptyMessage.textContent =
        "这个区域暂时还没有讨论。";

      container.append(emptyMessage);
    }
  }

  loadForumPosts();
