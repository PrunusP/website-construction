

      const tagNames = {
        unsolved: "未解决",
        other: "其他",
        solved: "已解决",

        Physics1: "AP Physics 1",
        Physics2: "AP Physics 2",
        PhysicsC: "AP Physics C",
        solution: "题解",

        english: "English",
        chinese: "中文",
        otherLanguage: "其他语言",
        jotting: "随笔",
        criticize: "文学批评",
        novel:  "小说",

        
      };

      
      const discussionStatus =
        document.getElementById(
          "discussionStatus"
        );

      const discussionDetail =
        document.getElementById(
          "discussionDetail"
        );

      const discussionTitle =
        document.getElementById(
          "discussionTitle"
        );

      const discussionAuthor =
        document.getElementById(
          "discussionAuthor"
        );

      const discussionTime =
        document.getElementById(
          "discussionTime"
        );

      const discussionTags =
        document.getElementById(
          "discussionTags"
        );

      const discussionContent =
        document.getElementById(
          "discussionContent"
        );

        const ownerActions =
        document.getElementById("ownerActions");

const editPostButton =
  document.getElementById("editPostButton");

const deletePostButton =
  document.getElementById("deletePostButton");

let currentPost = null;


async function checkPostOwnership(post) {
  const {
    data: { user },
    error
  } = await window.siteSupabase.auth.getUser();

  if (error) {
    console.error("获取用户失败：", error);
    return;
  }

  const isAuthor =
    user && user.id === post.author_id;

  ownerActions.hidden = !isAuthor;
}
      async function loadDiscussion() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const postId =
    parameters.get("id");

  if (!postId) {
    discussionStatus.textContent =
      "链接中没有帖子 ID。";

    return;
  }

  try {
    discussionStatus.textContent =
      "正在连接数据库……";

    if (!window.siteSupabase) {
      throw new Error(
        "Supabase 客户端没有加载"
      );
    }

    const {
      data: post,
      error
    } =
      await window.siteSupabase
        .from("posts")
        .select(`
          post_id,
          author_id,
          title,
          category,
          tags,
          content,
          created_at,
          updated_at
        `)
        .eq("post_id", postId)
        .single();

    if (error) {
      throw error;
    }

    if (!post) {
      throw new Error("没有找到帖子");
    }

    currentPost = post;

    /*
     * 查询成功后立即显示。
     */
    renderDiscussion(post);

    /*
     * 作者检查不阻塞帖子显示。
     */
    checkPostOwnership(post).catch(
      function (ownershipError) {
        console.error(
          "检查作者身份失败：",
          ownershipError
        );

        ownerActions.hidden = true;
      }
    );
  } catch (error) {
    console.error(
      "加载讨论失败：",
      error
    );

    discussionStatus.hidden = false;

    discussionStatus.textContent =
      `帖子加载失败：${
        error?.message ?? "未知错误"
      }`;
  }
}

      loadDiscussion();
      
   async function deleteCurrentPost() {
  if (!currentPost) {
    alert("帖子还没有加载完成。");
    return;
  }

  const confirmed =
    window.confirm(
      "确定要永久删除这个帖子吗？此操作无法撤销。"
    );

  if (!confirmed) {
    return;
  }

  deletePostButton.disabled = true;
  deletePostButton.textContent =
    "正在删除……";

  try {
    const {
      data: { user },
      error: userError
    } =
      await window.siteSupabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      window.location.href =
        "../login.html";

      return;
    }

    const {
      data: deletedPost,
      error: deleteError
    } =
      await window.siteSupabase
        .from("posts")
        .delete()
        .eq(
          "post_id",
          currentPost.post_id
        )
        .eq(
          "author_id",
          user.id
        )
        .select("post_id")
        .maybeSingle();

    if (deleteError) {
      throw deleteError;
    }

    if (!deletedPost) {
      throw new Error(
        "帖子没有被删除，请检查 Supabase 删除权限。"
      );
    }

    window.location.replace(
      "./index.html"
    );
  } catch (error) {
    console.error(
      "删除帖子失败：",
      error
    );

    alert(
      `删除失败：${
        error?.message ?? "未知错误"
      }`
    );

    deletePostButton.disabled = false;
    deletePostButton.textContent =
      "删除帖子";
  }
}


      function renderDiscussion(post) {
        discussionTitle.textContent =
          post.title || "无标题讨论";

        const shortAuthorId =
          post.author_id?.slice(0, 8)
          ?? "未知";

        discussionAuthor.textContent =
          `用户 ${shortAuthorId}`;
const createdDate =
  new Date(post.created_at);

discussionTime.dateTime =
  post.created_at;

const createdTimeText =
  createdDate.toLocaleString(
    "zh-CN",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

discussionTime.textContent =
  `发布于 ${createdTimeText}`;


/*
 * 判断帖子是否被编辑过。
 */
if (post.updated_at) {
  const createdTimestamp =
    new Date(post.created_at).getTime();

  const updatedTimestamp =
    new Date(post.updated_at).getTime();

  /*
   * 相差超过一秒才显示为编辑过，
   * 避免创建时的微小时间差。
   */
  const wasEdited =
    updatedTimestamp
    > createdTimestamp + 1000;

  if (wasEdited) {
    const editedTimeText =
      new Date(post.updated_at)
        .toLocaleString(
          "zh-CN",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }
        );

    discussionTime.textContent +=
      ` · 编辑于 ${editedTimeText}`;
  }
}

        discussionTags.replaceChildren();

        for (const tag of post.tags ?? []) {
          const tagElement =
            document.createElement("span");

          tagElement.textContent =
            tagNames[tag] ?? tag;

          discussionTags.append(tagElement);
        }

        /*
         * textContent 会保留文本安全性。
         * CSS 中使用 white-space 保留换行。
         */
        const unsafeHtml =
          marked.parse(post.content ?? "");

        const safeHtml =
          DOMPurify.sanitize(unsafeHtml, {
            USE_PROFILES: {
              html: true
            }
          });

        discussionContent.innerHTML =
          safeHtml;

        discussionStatus.hidden = true;
        discussionDetail.hidden = false;

        document.title =
          `${post.title} - 论坛`;
      }

      

      if (editPostButton) {
  editPostButton.addEventListener(
    "click",
    function () {
      if (!currentPost) {
        return;
      }

      window.location.href =
        `./edit_discussion.html?id=${encodeURIComponent(
          currentPost.post_id
        )}`;
    }
  );
} else {
  console.error(
    "没有找到 #editPostButton"
  );
}

/*
 * 编辑按钮。
 */
if (editPostButton) {
  editPostButton.addEventListener(
    "click",
    function () {
      if (!currentPost) {
        return;
      }

      window.location.href =
        `./edit_discussion.html?id=${encodeURIComponent(
          currentPost.post_id
        )}`;
    }
  );
} else {
  console.error(
    "没有找到 #editPostButton"
  );
}


/*
 * 删除按钮。
 */
if (deletePostButton) {
  deletePostButton.addEventListener(
    "click",
    deleteCurrentPost
  );
} else {
  console.error(
    "没有找到 #deletePostButton"
  );
}

/*
 * 页面加载完成后读取原帖。
 */

