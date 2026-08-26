

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

const createdTime =
  new Date(post.created_at).getTime();

const updatedTime =
  new Date(post.updated_at).getTime();

const wasEdited =
  updatedTime > createdTime + 1000;

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
        /*
         * 从地址中取得帖子 ID。
         *
         * 例如：
         * discussion.html?id=abc123
         */
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
          const { data: post, error } =
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
          await checkPostOwnership(post);

          renderDiscussion(post);
        } catch (error) {
          console.error(
            "加载讨论失败：",
            error
          );

          discussionStatus.textContent =
            "帖子加载失败。";
        }
      }

      deletePostButton.addEventListener(
  "click",
  async function () {
    if (!currentPost) {
      return;
    }

    const confirmed = window.confirm(
      "确定要永久删除这个帖子吗？"
    );

    if (!confirmed) {
      return;
    }

    deletePostButton.disabled = true;

    const { error } =
      await window.siteSupabase
        .from("posts")
        .delete()
        .eq("post_id", currentPost.post_id);

    if (error) {
      console.error("删除帖子失败：", error);
      alert(`删除失败：${error.message}`);
      deletePostButton.disabled = false;
      return;
    }

    window.location.href = "./index.html";
  }
);
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

      loadDiscussion();

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
