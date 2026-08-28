

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

  const replyMarkdownPreview =
  document.getElementById(
    "replyMarkdownPreview"
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
    /*
     * 获取当前登录用户。
     * 未登录时 user 为 null。
     */
    const {
      data: { user },
      error: userError
    } =
      await window.siteSupabase.auth.getUser();

    if (userError) {
      console.warn(
        "读取登录用户失败：",
        userError
      );
    }

    const currentUserId =
      user?.id ?? null;

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
          usernameByUserId,
          currentUserId
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
  usernameByUserId,
  currentUserId
) {
  const article =
    document.createElement("article");

  article.className =
    "reply-card";

  article.dataset.replyId =
    reply.reply_id;


  /*
   * 回复头部。
   */
  const header =
    document.createElement("header");

  header.className =
    "reply-card-header";


  /*
   * 作者用户名。
   */
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


  /*
   * 右侧时间和操作按钮区域。
   */
  const headerActions =
    document.createElement("div");

  headerActions.className =
    "reply-card-actions";


  /*
   * 回复时间。
   */
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

  headerActions.append(time);


  /*
   * 只有回复作者本人才能看到删除按钮。
   */
  const isReplyAuthor =
    currentUserId
    && currentUserId === reply.author_id;

  if (isReplyAuthor) {
    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
      "reply-delete-button";

    deleteButton.textContent =
      "删除";

    deleteButton.setAttribute(
      "aria-label",
      "删除这条回复"
    );

    deleteButton.addEventListener(
      "click",
      function () {
        deleteReply(
          reply.reply_id,
          deleteButton
        );
      }
    );

    headerActions.append(
      deleteButton
    );
  }

  header.append(
    author,
    headerActions
  );


  /*
   * 回复正文，支持 Markdown。
   */
  const content =
    document.createElement("div");

  content.className =
    "reply-card-content markdown-body";

  renderReplyMarkdown(
    content,
    reply.content ?? ""
  );

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
  replyMessage.textContent =
    "登录状态已失效，请重新登录后发表回复。";

  showLoginPrompt(
    "登录状态已失效，请重新登录后发表回复。"
  );

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

   renderReplyMarkdown(
  replyMarkdownPreview,
  ""
);

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

let replyCloseTimer = null;


/*
 * 打开回复抽屉。
 */
function openReplyComposer() {
  if (
    !replyComposer
    || !replyComposerBackdrop
  ) {
    console.error(
      "找不到回复抽屉元素"
    );

    return;
  }

  /*
   * 防止上一次关闭计时器
   * 在重新打开后又把抽屉隐藏。
   */
  if (replyCloseTimer) {
    window.clearTimeout(
      replyCloseTimer
    );

    replyCloseTimer = null;
  }

  /*
   * 先取消 hidden，
   * 让元素参与页面渲染。
   */
  replyComposer.hidden = false;
  replyComposerBackdrop.hidden = false;

  /*
   * 下一帧再添加动画 class，
   * 浏览器才能产生滑入动画。
   */
  window.requestAnimationFrame(
    function () {
      replyComposer.classList.add(
        "is-open"
      );

      replyComposerBackdrop.classList.add(
        "is-visible"
      );
    }
  );

  replyComposer.setAttribute(
    "aria-hidden",
    "false"
  );

  replyComposerBackdrop.setAttribute(
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

  renderReplyMarkdown(
  replyMarkdownPreview,
  replyContentInput?.value ?? ""
);

  window.setTimeout(
    function () {
      replyContentInput?.focus();
    },
    280
  );
}


/*
 * 关闭回复抽屉。
 */
function closeReplyComposer() {
  if (
    !replyComposer
    || !replyComposerBackdrop
  ) {
    return;
  }

  /*
   * 先移除动画 class，
   * 抽屉开始向下滑动。
   */
  replyComposer.classList.remove(
    "is-open"
  );

  replyComposerBackdrop.classList.remove(
    "is-visible"
  );

  replyComposer.setAttribute(
    "aria-hidden",
    "true"
  );

  replyComposerBackdrop.setAttribute(
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

  /*
   * 等关闭动画结束后，
   * 再设置 hidden。
   */
  replyCloseTimer =
    window.setTimeout(
      function () {
        if (
          !replyComposer.classList.contains(
            "is-open"
          )
        ) {
          replyComposer.hidden = true;
          replyComposerBackdrop.hidden = true;
        }

        replyCloseTimer = null;
      },
      280
    );

  openReplyButton?.focus();
}



if (openReplyButton) {
  openReplyButton.addEventListener(
    "click",
    handleOpenReply
  );
}

if (closeReplyButton) {
  closeReplyButton.addEventListener(
    "click",
    closeReplyComposer
  );
}

if (cancelReplyButton) {
  cancelReplyButton.addEventListener(
    "click",
    function () {
      closeReplyComposer();
    }
  );
}

if (replyComposerBackdrop) {
  replyComposerBackdrop.addEventListener(
    "click",
    closeReplyComposer
  );
}

document.addEventListener(
  "keydown",
  function (event) {
    const isOpen =
      replyComposer?.classList.contains(
        "is-open"
      );

    if (
      event.key === "Escape"
      && isOpen
    ) {
      closeReplyComposer();
    }
  }
);


function renderReplyMarkdown(
  targetElement,
  markdownText
) {
  if (!targetElement) {
    return;
  }

  const trimmedText =
    markdownText.trim();

  /*
   * 输入为空时显示默认提示。
   */
  if (!trimmedText) {
    targetElement.replaceChildren();

    const emptyMessage =
      document.createElement("p");

    emptyMessage.className =
      "markdown-preview-empty";

    emptyMessage.textContent =
      "Markdown 预览会显示在这里";

    targetElement.append(emptyMessage);
    return;
  }

  try {
    /*
     * Markdown 转换为 HTML。
     */
    const unsafeHtml =
      marked.parse(markdownText);

    /*
     * 删除可能存在的危险 HTML。
     */
    const safeHtml =
      DOMPurify.sanitize(
        unsafeHtml,
        {
          USE_PROFILES: {
            html: true
          }
        }
      );

    targetElement.innerHTML =
      safeHtml;
  } catch (error) {
    console.error(
      "回复 Markdown 渲染失败：",
      error
    );

    targetElement.textContent =
      "预览生成失败，请检查 Markdown 格式。";
  }
}

replyContentInput?.addEventListener(
  "input",
  function () {
    renderReplyMarkdown(
      replyMarkdownPreview,
      replyContentInput.value
    );
  }
);

function showLoginPrompt(message) {
  const shouldGoToLogin =
    window.confirm(
      `${message}\n\n是否现在前往登录页面？`
    );

  if (shouldGoToLogin) {
    goToLoginWithReturnUrl();
  }
}

async function handleOpenReply() {
  openReplyButton.disabled = true;

  try {
    const {
      data: { user },
      error
    } =
      await window.siteSupabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      showLoginPrompt(
        "你尚未登录，登录后才能回复这篇讨论。"
      );

      return;
    }

    /*
     * 已登录才打开回复抽屉。
     */
    openReplyComposer();
  } catch (error) {
    console.error(
      "检查登录状态失败：",
      error
    );

    window.alert(
      `无法确认登录状态：${
        error?.message ?? "未知错误"
      }`
    );
  } finally {
    openReplyButton.disabled = false;
  }
}

function goToLoginWithReturnUrl() {
  const returnUrl =
    window.location.href;

  window.location.href =
    `../login.html?returnTo=${encodeURIComponent(
      returnUrl
    )}`;
}

async function deleteReply(
  replyId,
  deleteButton
) {
  if (!replyId) {
    return;
  }

  const confirmed =
    window.confirm(
      "确定要删除这条回复吗？此操作无法撤销。"
    );

  if (!confirmed) {
    return;
  }

  deleteButton.disabled = true;
  deleteButton.textContent =
    "正在删除……";

  try {
    /*
     * 再次取得当前用户。
     */
    const {
      data: { user },
      error: userError
    } =
      await window.siteSupabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error(
        "登录状态已失效，请重新登录。"
      );
    }

    /*
     * 同时限定 reply_id 和 author_id。
     */
    const {
      data: deletedReply,
      error: deleteError
    } =
      await window.siteSupabase
        .from("replies")
        .delete()
        .eq(
          "reply_id",
          replyId
        )
        .eq(
          "author_id",
          user.id
        )
        .select("reply_id")
        .maybeSingle();

    if (deleteError) {
      throw deleteError;
    }

    /*
     * RLS 拒绝时可能没有错误，
     * 但 deletedReply 会是 null。
     */
    if (!deletedReply) {
      throw new Error(
        "回复没有被删除，你可能没有删除权限。"
      );
    }

    /*
     * 重新读取回复列表。
     */
    await loadReplies(
      currentPost.post_id
    );
  } catch (error) {
    console.error(
      "删除回复失败：",
      error
    );

    window.alert(
      `删除回复失败：${
        error?.message ?? "未知错误"
      }`
    );

    deleteButton.disabled = false;
    deleteButton.textContent =
      "删除";
  }
}
