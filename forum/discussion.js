"use strict";

/* ------------------------------
 * 标签名称
 * ------------------------------ */
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
  novel: "小说",
  
};

/* ------------------------------
 * 页面元素
 * ------------------------------ */
const discussionStatus = document.getElementById("discussionStatus");
const discussionDetail = document.getElementById("discussionDetail");
const discussionTitle = document.getElementById("discussionTitle");
const discussionAuthor = document.getElementById("discussionAuthor");
const discussionTime = document.getElementById("discussionTime");
const discussionTags = document.getElementById("discussionTags");
const discussionContent = document.getElementById("discussionContent");

const ownerActions = document.getElementById("ownerActions");
const editPostButton = document.getElementById("editPostButton");
const deletePostButton = document.getElementById("deletePostButton");

const replyCount = document.getElementById("replyCount");
const replyList = document.getElementById("replyList");
const openReplyButton = document.getElementById("openReplyButton");

const replyComposer = document.getElementById("replyComposer");
const replyComposerBackdrop = document.getElementById("replyComposerBackdrop");
const closeReplyButton = document.getElementById("closeReplyButton");
const cancelReplyButton = document.getElementById("cancelReplyButton");

const replyForm = document.getElementById("replyForm");
const replyContentInput = document.getElementById("replyContentInput");
const replyMarkdownPreview = document.getElementById("replyMarkdownPreview");
const replyMessage = document.getElementById("replyMessage");
const replySubmitButton = document.getElementById("replySubmitButton");

let currentPost = null;
let closeComposerTimer = null;

/* ------------------------------
 * 通用工具
 * ------------------------------ */
function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function markdownToSafeHtml(markdown) {
  const unsafeHtml = window.marked.parse(markdown ?? "");

  return window.DOMPurify.sanitize(unsafeHtml, {
    USE_PROFILES: {
      html: true
    }
  });
}

function fallbackUsername(authorId) {
  if (!authorId) {
    return "未知用户";
  }

  return `用户 ${authorId.slice(0, 8)}`;
}

async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await window.siteSupabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

async function getUsername(authorId) {
  if (!authorId) {
    return "未知用户";
  }

  const { data, error } = await window.siteSupabase
    .from("profiles")
    .select("username")
    .eq("id", authorId)
    .maybeSingle();

  if (error) {
    console.warn("读取用户名失败：", error);
    return fallbackUsername(authorId);
  }

  return data?.username || fallbackUsername(authorId);
}

async function getUsernames(authorIds) {
  const uniqueIds = [...new Set(authorIds.filter(Boolean))];
  const usernameMap = new Map();

  if (uniqueIds.length === 0) {
    return usernameMap;
  }

  const { data, error } = await window.siteSupabase
    .from("profiles")
    .select("id, username")
    .in("id", uniqueIds);

  if (error) {
    console.warn("读取回复用户名失败：", error);
    return usernameMap;
  }

  for (const profile of data ?? []) {
    usernameMap.set(profile.id, profile.username);
  }

  return usernameMap;
}

function goToLogin() {
  const returnTo =
    window.location.pathname
    + window.location.search
    + window.location.hash;

  window.location.href =
    `../login.html?returnTo=${encodeURIComponent(returnTo)}`;
}

function askUserToLogin(actionName) {
  const confirmed = window.confirm(
    `登录后才能${actionName}。现在前往登录页面吗？`
  );

  if (confirmed) {
    goToLogin();
  }
}

/* ------------------------------
 * 加载并显示帖子
 * ------------------------------ */
async function loadDiscussion() {
  const parameters = new URLSearchParams(window.location.search);
  const postId = parameters.get("id");

  if (!postId) {
    discussionStatus.textContent = "链接中没有帖子 ID。";
    return;
  }

  try {
    const { data: post, error } = await window.siteSupabase
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
    renderDiscussion(post);

    await Promise.all([
      showPostAuthor(post),
      checkPostOwnership(post),
      loadReplies(post.post_id)
    ]);
  } catch (error) {
    console.error("加载讨论失败：", error);
    discussionStatus.hidden = false;
    discussionStatus.textContent = "帖子加载失败。";
    discussionDetail.hidden = true;
  }
}

function renderDiscussion(post) {
  discussionTitle.textContent = post.title || "无标题讨论";
  discussionAuthor.textContent = fallbackUsername(post.author_id);

  discussionTime.dateTime = post.created_at || "";
  discussionTime.textContent = `发布于 ${formatDate(post.created_at)}`;

  if (post.updated_at) {
    const createdTimestamp = new Date(post.created_at).getTime();
    const updatedTimestamp = new Date(post.updated_at).getTime();

    if (updatedTimestamp > createdTimestamp + 1000) {
      discussionTime.textContent +=
        ` · 编辑于 ${formatDate(post.updated_at)}`;
    }
  }

  discussionTags.replaceChildren();

  for (const tag of post.tags ?? []) {
    const tagElement = document.createElement("span");
    tagElement.textContent = tagNames[tag] ?? tag;
    discussionTags.append(tagElement);
  }

  discussionContent.innerHTML = markdownToSafeHtml(post.content);

  discussionStatus.hidden = true;
  discussionDetail.hidden = false;
  document.title = `${post.title || "查看讨论"} - 论坛`;
}

async function showPostAuthor(post) {
  discussionAuthor.textContent = await getUsername(post.author_id);
}

async function checkPostOwnership(post) {
  try {
    const user = await getCurrentUser();
    ownerActions.hidden = !(user && user.id === post.author_id);
  } catch (error) {
    console.warn("检查帖子权限失败：", error);
    ownerActions.hidden = true;
  }
}

/* ------------------------------
 * 编辑、删除帖子
 * ------------------------------ */
editPostButton.addEventListener("click", function () {
  if (!currentPost) {
    return;
  }

  window.location.href =
    `./edit_discussion.html?id=${encodeURIComponent(currentPost.post_id)}`;
});

deletePostButton.addEventListener("click", async function () {
  if (!currentPost) {
    return;
  }

  if (!window.confirm("确定要永久删除这个帖子吗？")) {
    return;
  }

  deletePostButton.disabled = true;

  try {
    const user = await getCurrentUser();

    if (!user) {
      askUserToLogin("删除帖子");
      return;
    }

    if (user.id !== currentPost.author_id) {
      window.alert("只有帖子作者才能删除这篇帖子。");
      return;
    }

    const { data: deletedPost, error } = await window.siteSupabase
      .from("posts")
      .delete()
      .eq("post_id", currentPost.post_id)
      .eq("author_id", user.id)
      .select("post_id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deletedPost) {
      throw new Error("帖子没有被删除，请检查 Supabase 的删除策略。");
    }

    window.location.href = "./index.html";
  } catch (error) {
    console.error("删除帖子失败：", error);
    window.alert(`删除失败：${error.message}`);
  } finally {
    deletePostButton.disabled = false;
  }
});

/* ------------------------------
 * 加载并显示回复
 * ------------------------------ */
async function loadReplies(postId = currentPost?.post_id) {
  if (!postId) {
    return;
  }

  replyList.innerHTML = '<p class="reply-status">正在加载回复……</p>';

  try {
    const { data: replies, error } = await window.siteSupabase
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

    if (error) {
      throw error;
    }

    let currentUser = null;

    try {
      currentUser = await getCurrentUser();
    } catch (error) {
      console.warn("读取当前用户失败：", error);
    }

    const usernameMap = await getUsernames(
      (replies ?? []).map((reply) => reply.author_id)
    );

    renderReplies(replies ?? [], usernameMap, currentUser?.id ?? null);
  } catch (error) {
    console.error("加载回复失败：", error);
    replyCount.textContent = "0 条回复";
    replyList.innerHTML =
      '<p class="reply-status">回复加载失败，请稍后重试。</p>';
  }
}

function renderReplies(replies, usernameMap, currentUserId) {
  replyList.replaceChildren();
  replyCount.textContent = `${replies.length} 条回复`;

  if (replies.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "reply-status";
    emptyMessage.textContent = "还没有回复，来发表第一条回复吧。";
    replyList.append(emptyMessage);
    return;
  }

  for (const reply of replies) {
    replyList.append(
      createReplyElement(reply, usernameMap, currentUserId)
    );
  }
}

function createReplyElement(reply, usernameMap, currentUserId) {
  const article = document.createElement("article");
  article.className = "reply-card";
  article.dataset.replyId = reply.reply_id;

  const header = document.createElement("header");
  header.className = "reply-card-header";

  const author = document.createElement("strong");
  author.className = "reply-author";
  author.textContent =
    usernameMap.get(reply.author_id)
    || fallbackUsername(reply.author_id);

  const headerActions = document.createElement("div");
  headerActions.className = "reply-card-actions";

  const time = document.createElement("time");
  time.className = "reply-time";
  time.dateTime = reply.created_at || "";
  time.textContent = formatDate(reply.created_at);
  headerActions.append(time);

  if (currentUserId && currentUserId === reply.author_id) {
    const deleteButton = document.createElement("button");
    deleteButton.className = "reply-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", function () {
      deleteReply(reply, deleteButton);
    });
    headerActions.append(deleteButton);
  }

  header.append(author, headerActions);

  const content = document.createElement("div");
  content.className = "reply-content markdown-body";
  content.innerHTML = markdownToSafeHtml(reply.content);

  article.append(header, content);
  return article;
}

async function deleteReply(reply, deleteButton) {
  if (!window.confirm("确定要删除这条回复吗？")) {
    return;
  }

  deleteButton.disabled = true;

  try {
    const user = await getCurrentUser();

    if (!user) {
      askUserToLogin("删除回复");
      return;
    }

    if (user.id !== reply.author_id) {
      window.alert("只能删除自己的回复。");
      return;
    }

    const { data: deletedReply, error } = await window.siteSupabase
      .from("replies")
      .delete()
      .eq("reply_id", reply.reply_id)
      .eq("author_id", user.id)
      .select("reply_id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deletedReply) {
      throw new Error("回复没有被删除，请检查 Supabase 的删除策略。");
    }

    await loadReplies();
  } catch (error) {
    console.error("删除回复失败：", error);
    window.alert(`删除回复失败：${error.message}`);
  } finally {
    deleteButton.disabled = false;
  }
}

/* ------------------------------
 * 回复抽屉
 * ------------------------------ */
function openReplyComposer() {
  window.clearTimeout(closeComposerTimer);

  replyComposer.hidden = false;
  replyComposerBackdrop.hidden = false;

  window.requestAnimationFrame(function () {
    replyComposer.classList.add("is-open");
    replyComposerBackdrop.classList.add("is-visible");
  });

  replyComposer.setAttribute("aria-hidden", "false");
  replyComposerBackdrop.setAttribute("aria-hidden", "false");
  openReplyButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("reply-composer-open");

  window.setTimeout(function () {
    replyContentInput.focus();
  }, 100);
}

function closeReplyComposer() {
  replyComposer.classList.remove("is-open");
  replyComposerBackdrop.classList.remove("is-visible");

  replyComposer.setAttribute("aria-hidden", "true");
  replyComposerBackdrop.setAttribute("aria-hidden", "true");
  openReplyButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("reply-composer-open");

  window.clearTimeout(closeComposerTimer);
  closeComposerTimer = window.setTimeout(function () {
    replyComposer.hidden = true;
    replyComposerBackdrop.hidden = true;
  }, 280);

  openReplyButton.focus();
}

async function handleOpenReply() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      askUserToLogin("发表回复");
      return;
    }

    replyMessage.textContent = "";
    openReplyComposer();
  } catch (error) {
    console.error("检查登录状态失败：", error);
    replyMessage.textContent = "无法读取登录状态，请稍后重试。";
  }
}

/* ------------------------------
 * 回复预览与提交
 * ------------------------------ */
function updateReplyPreview() {
  const content = replyContentInput.value.trim();

  if (!content) {
    replyMarkdownPreview.innerHTML =
      '<p class="markdown-preview-empty">Markdown 预览会显示在这里</p>';
    return;
  }

  replyMarkdownPreview.innerHTML = markdownToSafeHtml(content);
}

async function submitReply(event) {
  event.preventDefault();

  if (!currentPost) {
    replyMessage.textContent = "帖子尚未加载完成。";
    return;
  }

  const content = replyContentInput.value.trim();

  if (content.length < 1) {
    replyMessage.textContent = "请输入回复内容。";
    replyContentInput.focus();
    return;
  }

  if (content.length > 3000) {
    replyMessage.textContent = "回复内容不能超过 3000 个字符。";
    replyContentInput.focus();
    return;
  }

  replySubmitButton.disabled = true;
  replyMessage.textContent = "正在提交……";

  try {
    const user = await getCurrentUser();

    if (!user) {
      replyMessage.textContent = "登录后才能发表回复。";
      askUserToLogin("发表回复");
      return;
    }

    const { error } = await window.siteSupabase
      .from("replies")
      .insert({
        post_id: currentPost.post_id,
        author_id: user.id,
        content
      });

    if (error) {
      throw error;
    }

    replyForm.reset();
    updateReplyPreview();
    replyMessage.textContent = "回复发表成功。";
    await loadReplies();
    closeReplyComposer();
  } catch (error) {
    console.error("提交回复失败：", error);
    replyMessage.textContent = `提交失败：${error.message}`;
  } finally {
    replySubmitButton.disabled = false;
  }
}

/* ------------------------------
 * 事件监听与初始化
 * ------------------------------ */
openReplyButton.addEventListener("click", handleOpenReply);
closeReplyButton.addEventListener("click", closeReplyComposer);
cancelReplyButton.addEventListener("click", closeReplyComposer);
replyComposerBackdrop.addEventListener("click", closeReplyComposer);
replyContentInput.addEventListener("input", updateReplyPreview);
replyForm.addEventListener("submit", submitReply);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !replyComposer.hidden) {
    closeReplyComposer();
  }
});

updateReplyPreview();
loadDiscussion();
