
      /*
       * 每个区域允许使用的固定标签。
       *
       * 左边是数据库保存的值，
       * 右边是展示给用户的中文。
       */
      const tagsByCategory = {
        physics: [
          { value: "unsolved", label: "未解决" },
          { value: "solved", label: "已解决" },
          { value: "Physics1", label: "AP Physics 1" },
          { value: "Physics2", label: "AP Physics 2" },
          { value: "PhysicsC", label: "AP Physics C" },
          { value: "solution", label: "题解" },
          { value: "other", label: "其他" }
        ],
        
        literature: [
        {value: "english",label: "English"},
        {value: "chinese",label: "中文"},
        {value: "otherLanguage",label: "其他语言"},
        {value: "jotting",label: "随笔"},
        {value: "criticize",label: "文学批评"},
        {value: "novel",label: "小说"},
        {value: "other",label: "其他"}
        ],

        chat: [
          {value: "other",label: "其他"},
        ]
      };

/*
 * 取得页面中的 HTML 元素。
 */
const editDiscussionForm =
  document.getElementById(
    "editDiscussionForm"
  );

const titleInput =
  document.getElementById(
    "titleInput"
  );

const categoryInput =
  document.getElementById(
    "categoryInput"
  );

const tagsContainer =
  document.getElementById(
    "tagsContainer"
  );

const contentInput =
  document.getElementById(
    "contentInput"
  );

const markdownPreview =
  document.getElementById(
    "markdownPreview"
  );

const editMessage =
  document.getElementById(
    "editMessage"
  );

const savePostButton =
  document.getElementById(
    "savePostButton"
  );


/*
 * 从网址中读取帖子 ID。
 *
 * 例如：
 * edit_discussion.html?id=abc123
 */
const parameters =
  new URLSearchParams(
    window.location.search
  );

const postId =
  parameters.get("id");


/*
 * 保存当前登录用户和原来的帖子。
 */
let currentUser = null;
let originalPost = null;


/*
 * 显示消息。
 */
function showMessage(message, isError = false) {
  editMessage.textContent = message;

  editMessage.classList.toggle(
    "input-error-message",
    isError
  );
}


/*
 * 获取当前选中的标签。
 */
function getSelectedTags() {
  return Array.from(
    tagsContainer.querySelectorAll(
      'input[name="tags"]:checked'
    )
  ).map(function (input) {
    return input.value;
  });
}


/*
 * 根据区域生成标签选项。
 *
 * selectedTags 用于恢复原帖已经选择的标签。
 */
function renderTagOptions(
  category,
  selectedTags = []
) {
  tagsContainer.replaceChildren();

  const availableTags =
    tagsByCategory[category] ?? [];

  if (availableTags.length === 0) {
    const message =
      document.createElement("p");

    message.className =
      "discussion-tags-empty";

    message.textContent =
      "这个区域暂时没有可用标签。";

    tagsContainer.append(message);
    return;
  }

  for (const tag of availableTags) {
    const label =
      document.createElement("label");

    label.className =
      "discussion-tag-option";

    const input =
      document.createElement("input");

    input.type = "checkbox";
    input.name = "tags";
    input.value = tag.value;

    /*
     * 如果原帖包含这个标签，
     * 就把它恢复为选中状态。
     */
    input.checked =
      selectedTags.includes(tag.value);

    const text =
      document.createElement("span");

    text.textContent = tag.label;

    label.append(input, text);
    tagsContainer.append(label);
  }
}


/*
 * 把 Markdown 内容转换为安全的 HTML，
 * 然后渲染数学公式。
 */
function renderMarkdown(markdownText) {
  const trimmedText =
    markdownText.trim();

  if (!trimmedText) {
    markdownPreview.replaceChildren();

    const emptyMessage =
      document.createElement("p");

    emptyMessage.className =
      "markdown-preview-empty";

    emptyMessage.textContent =
      "Markdown 和公式预览会显示在这里";

    markdownPreview.append(emptyMessage);
    return;
  }

  try {
    const unsafeHtml =
      marked.parse(markdownText);

    const safeHtml =
      DOMPurify.sanitize(unsafeHtml, {
        USE_PROFILES: {
          html: true
        }
      });

    markdownPreview.innerHTML = safeHtml;

    /*
     * 如果 KaTeX 已经成功加载，
     * 就继续渲染数学公式。
     */
    if (
      typeof renderMathInElement
      === "function"
    ) {
      renderMathInElement(
        markdownPreview,
        {
          delimiters: [
            {
              left: "$$",
              right: "$$",
              display: true
            },
            {
              left: "$",
              right: "$",
              display: false
            }
          ],
          throwOnError: false,
          trust: false
        }
      );
    }
  } catch (error) {
    console.error(
      "Markdown 预览失败：",
      error
    );

    markdownPreview.textContent =
      "预览生成失败，请检查 Markdown 或公式语法。";
  }
}


/*
 * 用户改变区域后，
 * 清空原来的标签并显示新区域的标签。
 */
categoryInput.addEventListener(
  "change",
  function () {
    renderTagOptions(
      categoryInput.value
    );

    showMessage("");
  }
);


/*
 * 标签最多只能选择5个。
 */
tagsContainer.addEventListener(
  "change",
  function (event) {
    const target = event.target;

    if (
      !(target instanceof HTMLInputElement)
      || target.name !== "tags"
    ) {
      return;
    }

    const selectedTags =
      getSelectedTags();

    if (selectedTags.length > 5) {
      target.checked = false;

      showMessage(
        "最多只能选择 5 个标签。",
        true
      );

      return;
    }

    showMessage("");
  }
);


/*
 * 正文改变时实时更新预览。
 */
contentInput.addEventListener(
  "input",
  function () {
    renderMarkdown(
      contentInput.value
    );
  }
);


/*
 * 加载需要编辑的帖子。
 */
async function loadPostForEditing() {
  if (!postId) {
    showMessage(
      "链接中缺少帖子 ID。",
      true
    );

    editDiscussionForm.hidden = true;
    return;
  }

  savePostButton.disabled = true;
  showMessage("正在加载帖子……");

  try {
    /*
     * 获取当前登录用户。
     */
    const {
      data: userData,
      error: userError
    } =
      await window.siteSupabase
        .auth
        .getUser();

    if (userError) {
      throw userError;
    }

    currentUser = userData.user;

    if (!currentUser) {
      window.location.href =
        "../login.html";

      return;
    }

    /*
     * 从 posts 表读取帖子。
     */
    const {
      data: post,
      error: postError
    } =
      await window.siteSupabase
        .from("posts")
        .select(`
          post_id,
          author_id,
          title,
          category,
          tags,
          content
        `)
        .eq("post_id", postId)
        .single();

    if (postError) {
      throw postError;
    }

    /*
     * 前端再次检查当前用户是不是作者。
     *
     * 真正的安全保护仍然需要 Supabase RLS。
     */
    if (
      post.author_id
      !== currentUser.id
    ) {
      showMessage(
        "你没有权限编辑这个帖子。",
        true
      );

      editDiscussionForm.hidden = true;
      return;
    }

    originalPost = post;

    /*
     * 恢复原帖内容。
     */
    titleInput.value =
      post.title ?? "";

    categoryInput.value =
      post.category ?? "";

    contentInput.value =
      post.content ?? "";

    renderTagOptions(
      post.category,
      post.tags ?? []
    );

    renderMarkdown(
      post.content ?? ""
    );

    savePostButton.disabled = false;
    showMessage("");
  } catch (error) {
    console.error(
      "加载帖子失败：",
      error
    );

    showMessage(
      `加载帖子失败：${
        error?.message
        ?? "未知错误"
      }`,
      true
    );

    editDiscussionForm.hidden = true;
  }
}


/*
 * 提交帖子修改。
 */
editDiscussionForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    if (!originalPost || !currentUser) {
      showMessage(
        "帖子尚未加载完成。",
        true
      );

      return;
    }

    const title =
      titleInput.value.trim();

    const category =
      categoryInput.value;

    const tags =
      getSelectedTags();

    const content =
      contentInput.value.trim();

    /*
     * 检查标题。
     */
    if (title.length < 4) {
      showMessage(
        "标题至少需要 4 个字符。",
        true
      );

      titleInput.focus();
      return;
    }

    if (title.length > 100) {
      showMessage(
        "标题最多只能有 100 个字符。",
        true
      );

      titleInput.focus();
      return;
    }

    /*
     * 检查区域。
     */
    if (!tagsByCategory[category]) {
      showMessage(
        "请选择有效的讨论区域。",
        true
      );

      categoryInput.focus();
      return;
    }

    /*
     * 检查标签数量。
     */
    if (tags.length === 0) {
      showMessage(
        "请至少选择一个标签。",
        true
      );

      return;
    }

    if (tags.length > 5) {
      showMessage(
        "最多只能选择 5 个标签。",
        true
      );

      return;
    }

    /*
     * 检查标签是否属于当前区域。
     */
    const allowedTagValues =
      new Set(
        tagsByCategory[category].map(
          function (tag) {
            return tag.value;
          }
        )
      );

    const hasInvalidTag =
      tags.some(function (tag) {
        return !allowedTagValues.has(tag);
      });

    if (hasInvalidTag) {
      showMessage(
        "存在不属于当前区域的标签。",
        true
      );

      return;
    }

    /*
     * 检查正文长度。
     */
    if (content.length < 10) {
      showMessage(
        "讨论内容至少需要 10 个字符。",
        true
      );

      contentInput.focus();
      return;
    }

    if (content.length > 10000) {
      showMessage(
        "讨论内容最多 10000 个字符。",
        true
      );

      contentInput.focus();
      return;
    }

    savePostButton.disabled = true;
    showMessage("正在保存修改……");

    try {
      /*
       * 更新帖子。
       *
       * 同时限定 post_id 和 author_id，
       * 避免修改到其他用户的帖子。
       */
      const {
        data: updatedPost,
        error: updateError
      } =
        await window.siteSupabase
          .from("posts")
          .update({
            title: title,
            category: category,
            tags: tags,
            content: content
            
          })
          .eq(
            "post_id",
            originalPost.post_id
          )
          .eq(
            "author_id",
            currentUser.id
          )
          .select("post_id")
          .single();

      if (updateError) {
        throw updateError;
      }

      showMessage(
        "修改保存成功，正在返回帖子……"
      );

      window.location.replace(
        `./discussion.html?id=${encodeURIComponent(
          updatedPost.post_id
        )}`
      );
    } catch (error) {
      console.error(
        "保存帖子失败：",
        error
      );

      showMessage(
        `保存失败：${
          error?.message
          ?? "未知错误"
        }`,
        true
      );

      savePostButton.disabled = false;
    }
  }
);

loadPostForEditing();
