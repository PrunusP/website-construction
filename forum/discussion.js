

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

const replyList =
  document.getElementById(
    "replyList"
  );

const replyCount =
  document.getElementById(
    "replyCount"
  );

const replyForm =
  document.getElementById(
    "replyForm"
  );

const replyContentInput =
  document.getElementById(
    "replyContentInput"
  );

const replyMessage =
  document.getElementById(
    "replyMessage"
  );

const replySubmitButton =
  document.getElementById(
    "replySubmitButton"
  );


  const openReplyButton =
  document.getElementById(
    "openReplyButton"
  );

const closeReplyButton =
  document.getElementById(
    "closeReplyButton"
  );

const cancelReplyButton =
  document.getElementById(
    "cancelReplyButton"
  );

const replyComposer =
  document.getElementById(
    "replyComposer"
  );

const replyComposerBackdrop =
  document.getElementById(
    "replyComposerBackdrop"
  );

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

    loadReplies(post.post_id);
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

async function loadAuthorUsername(authorId) {
  if (!authorId) {
    return "未知用户";
  }

  const {
    data: profile,
    error
  } =
    await window.siteSupabase
      .from("profiles")
      .select("username")
      .eq("id", authorId)
      .maybeSingle();

  if (error) {
    console.warn(
      "读取作者用户名失败：",
      error
    );

    return `用户 ${authorId.slice(0, 8)}`;
  }

  return (
    profile?.username
    ?? `用户 ${authorId.slice(0, 8)}`
  );
}

      function renderDiscussion(post) {
  discussionTitle.textContent =
    post.title || "无标题讨论";

  /*
   * 先显示用户 ID，避免阻塞帖子显示。
   */
  const shortAuthorId =
    post.author_id?.slice(0, 8)
    ?? "未知";

  discussionAuthor.textContent =
    `用户 ${shortAuthorId}`;

  /*
   * 再异步查询真实用户名。
   */
  loadAuthorUsername(post.author_id)
    .then(function (username) {
      discussionAuthor.textContent =
        username;
    })
    .catch(function (error) {
      console.warn(
        "显示作者用户名失败：",
        error
      );
    });

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


async function loadReplies(postId) {
  replyList.replaceChildren();

  const loadingMessage =
    document.createElement("p");

  loadingMessage.className =
    "reply-status";

  loadingMessage.textContent =
    "正在加载回复……";

  replyList.append(loadingMessage);

  try {
    const {
      data: replies,
      error: repliesError
    } =
      await window.siteSupabase
        .from("replies")
        .select(`
          reply_id,
          post_id,
          author_id,
          content,
          created_at,
          updated_at
        `)
        .eq("post_id", postId)
        .order("created_at", {
          ascending: true
        });

    if (repliesError) {
      throw repliesError;
    }

    /*
     * 收集所有回复作者的用户 ID。
     */
    const authorIds = [
      ...new Set(
        (replies ?? [])
          .map(function (reply) {
            return reply.author_id;
          })
          .filter(Boolean)
      )
    ];

    let usernameByUserId = {};

    /*
     * 从 profiles 表读取用户名。
     */
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
          "读取回复作者用户名失败：",
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

    replyList.replaceChildren();

    const replyTotal =
      replies?.length ?? 0;

    replyCount.textContent =
      `${replyTotal} 条回复`;

    if (replyTotal === 0) {
      const emptyMessage =
        document.createElement("p");

      emptyMessage.className =
        "reply-status";

      emptyMessage.textContent =
        "暂时还没有回复，来发表第一条回复吧。";

      replyList.append(emptyMessage);
      return;
    }

    for (const reply of replies) {
      const replyElement =
        createReplyElement(
          reply,
          usernameByUserId
        );

      replyList.append(replyElement);
    }
  } catch (error) {
    console.error(
      "加载回复失败：",
      error
    );

    replyList.replaceChildren();

    const errorMessage =
      document.createElement("p");

    errorMessage.className =
      "reply-status reply-error";

    errorMessage.textContent =
      `回复加载失败：${
        error?.message ?? "未知错误"
      }`;

    replyList.append(errorMessage);
  }
}

function createReplyElement(
  reply,
  usernameByUserId
) {
  const article =
    document.createElement("article");

  article.className =
    "reply-card";

  article.dataset.replyId =
    reply.reply_id;

  const header =
    document.createElement("header");

  header.className =
    "reply-card-header";

  const author =
    document.createElement("strong");

  const fallbackAuthor =
    `用户 ${
      reply.author_id?.slice(0, 8)
      ?? "未知"
    }`;

  author.textContent =
    usernameByUserId[reply.author_id]
    ?? fallbackAuthor;

  const time =
    document.createElement("time");

  time.dateTime =
    reply.created_at;

  time.textContent =
    new Date(
      reply.created_at
    ).toLocaleString(
      "zh-CN",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  header.append(author, time);

  const content =
    document.createElement("p");

  content.className =
    "reply-card-content";

  /*
   * 使用 textContent 防止回复中的文字
   * 被浏览器当成 HTML 执行。
   */
  content.textContent =
    reply.content;

  article.append(
    header,
    content
  );

  return article;
}

if (replyForm) {
  replyForm.addEventListener(
    "submit",
    submitReply
  );
}

async function submitReply(event) {
  event.preventDefault();

  if (!currentPost) {
    replyMessage.textContent =
      "帖子尚未加载完成。";

    return;
  }

  const content =
    replyContentInput.value.trim();

  if (content.length === 0) {
    replyMessage.textContent =
      "回复内容不能为空。";

    replyContentInput.focus();
    return;
  }

  if (content.length > 3000) {
    replyMessage.textContent =
      "回复内容最多 3000 个字符。";

    replyContentInput.focus();
    return;
  }

  replySubmitButton.disabled = true;

  replyMessage.textContent =
    "正在提交回复……";

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
      error: insertError
    } =
      await window.siteSupabase
        .from("replies")
        .insert({
          post_id:
            currentPost.post_id,

          author_id:
            user.id,

          content:
            content
        });

    if (insertError) {
      throw insertError;
    }

   replyContentInput.value = "";

replyMessage.textContent =
  "回复发表成功。";

await loadReplies(
  currentPost.post_id
);

closeReplyComposer();

    replyMessage.textContent = "";
  } catch (error) {
    console.error(
      "发表回复失败：",
      error
    );

    replyMessage.textContent =
      `回复失败：${
        error?.message ?? "未知错误"
      }`;
  } finally {
    replySubmitButton.disabled = false;
  }
}


function openReplyComposer() {
  if (!replyComposer) {
    return;
  }

  replyComposer.classList.add(
    "is-open"
  );

  replyComposerBackdrop?.classList.add(
    "is-visible"
  );

  replyComposer.setAttribute(
    "aria-hidden",
    "false"
  );

  replyComposerBackdrop?.setAttribute(
    "aria-hidden",
    "false"
  );

  openReplyButton?.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.classList.add(
    "reply-composer-open"
  );

  /*
   * 等待抽屉开始显示后，
   * 将输入焦点放到回复框。
   */
  window.setTimeout(
    function () {
      replyContentInput?.focus();
    },
    220
  );
}

function closeReplyComposer() {
  if (!replyComposer) {
    return;
  }

  replyComposer.classList.remove(
    "is-open"
  );

  replyComposerBackdrop?.classList.remove(
    "is-visible"
  );

  replyComposer.setAttribute(
    "aria-hidden",
    "true"
  );

  replyComposerBackdrop?.setAttribute(
    "aria-hidden",
    "true"
  );

  openReplyButton?.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "reply-composer-open"
  );

  openReplyButton?.focus();
}

openReplyButton?.addEventListener(
  "click",
  openReplyComposer
);

closeReplyButton?.addEventListener(
  "click",
  closeReplyComposer
);

cancelReplyButton?.addEventListener(
  "click",
  closeReplyComposer
);

replyComposerBackdrop?.addEventListener(
  "click",
  closeReplyComposer
);

document.addEventListener(
  "keydown",
  function (event) {
    if (
      event.key === "Escape"
      && replyComposer?.classList.contains(
        "is-open"
      )
    ) {
      closeReplyComposer();
    }
  }
);
