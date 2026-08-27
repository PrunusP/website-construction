
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

      const discussionForm =
        document.getElementById("discussionForm");

      const titleInput =
        document.getElementById("titleInput");

      const categorySelect =
        document.getElementById("categorySelect");

      const tagsField =
        document.getElementById("tagsField");

      const tagsContainer =
        document.getElementById("tagsContainer");

      const tagsHelp =
        document.getElementById("tagsHelp");

      const contentInput =
        document.getElementById("contentInput");

      const discussionMessage =
        document.getElementById(
          "discussionMessage"
        );

      const submitButton =
        document.getElementById("submitButton");

        const markdownPreview =
          document.getElementById("markdownPreview");


        const contentLengthMessage =
          document.getElementById(
            "contentLengthMessage"
          );
        

      /*
       * 用户选择区域后重新生成标签。
       */
      categorySelect.addEventListener(
        "change",
        function () {
          const category = categorySelect.value;
          const availableTags =
            tagsByCategory[category] ?? [];

          tagsContainer.replaceChildren();

          if (availableTags.length === 0) {
            tagsField.disabled = true;
            tagsHelp.textContent =
              "请先选择一个区域";
            return;
          }

          tagsField.disabled = false;
          tagsHelp.textContent =
            "请选择 1～5 个标签";

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

            const text =
              document.createElement("span");

            text.textContent = tag.label;

            label.append(input, text);
            tagsContainer.append(label);
          }
        }
      );

      /*
       * 最多只能选5个标签。
       */
      tagsContainer.addEventListener(
        "change",
        function (event) {
          const selectedTags = getSelectedTags();

          if (selectedTags.length > 5) {
            event.target.checked = false;

            discussionMessage.textContent =
              "最多只能选择 5 个标签。";
          } else {
            discussionMessage.textContent = "";
          }
        }
      );

      function getSelectedTags() {
        return Array.from(
          document.querySelectorAll(
            'input[name="tags"]:checked'
          ),
          function (input) {
            return input.value;
          }
        );
      }

      /*
       * 提交讨论。
       */
      discussionForm.addEventListener(
        "submit",
        async function (event) {
          event.preventDefault();

          const title = titleInput.value.trim();
          const category = categorySelect.value;
          const tags = getSelectedTags();
          const content = contentInput.value.trim();

          if (title.length < 4) {
            discussionMessage.textContent =
              "标题至少需要 4 个字符。";

            titleInput.focus();
            return;
          }

          if (!category) {
            discussionMessage.textContent =
              "请选择讨论区域。";

            categorySelect.focus();
            return;
          }

          if (tags.length === 0) {
            discussionMessage.textContent =
              "请至少选择一个标签。";

            return;
          }

          if (content.length < 10) {
            discussionMessage.textContent =
              "讨论内容至少需要 10 个字符。";

            contentInput.focus();
            return;
          }

          if (content.length > 10000) {
            discussionMessage.textContent =
              "讨论内容最多 10000 个字符。";

            contentInput.focus();
            return;
          }

          submitButton.disabled = true;
          discussionMessage.textContent =
            "正在提交讨论……";

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
              window.location.href = "../login.html";
              return;
            }

            const { data: post, error: postError } =
              await window.siteSupabase
                .from("posts")
                .insert({
                  author_id: user.id,
                  title: title,
                  category: category,
                  tags: tags,
                  content: content
                })
                .select()
                .single();

            if (postError) {
              throw postError;
            }

            discussionMessage.textContent =
              "讨论提交成功，正在返回论坛……";

            window.location.replace(
              `./index.html?post=${encodeURIComponent(
                post.post_id
              )}`
            );
          } catch (error) {
            console.error("提交讨论失败：", error);

            discussionMessage.textContent =
              "提交失败，请稍后再试。";

            submitButton.disabled = false;
          }
        }
      );

function renderMarkdownInto(targetElement,markdownText) {
  /*
   * 第一步：Markdown 转换成 HTML。
   */
  const unsafeHtml =
    marked.parse(markdownText);

  /*
   * 第二步：清理危险 HTML。
   */
  const safeHtml =
    DOMPurify.sanitize(unsafeHtml, {
      USE_PROFILES: {
        html: true
      }
    });

    targetElement.innerHTML = safeHtml;
    
     renderMathInElement(targetElement, {
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

    /*
     * 公式写错时不让整个预览崩溃。
     */
    throwOnError: false,

    /*
     * 不允许公式执行需要信任权限的功能。
     */
    trust: false
  });
  
}
contentInput.addEventListener(
  "input",
  function () {
    const originalText =
      contentInput.value;

    const markdownText =
      originalText.trim();

    const contentLength =
      markdownText.length;

    /*
     * 实时更新字符数量。
     */
    if (contentLength === 0) {
      contentLengthMessage.textContent =
        "至少 10 个字符，最多 10000 个字符";

      contentLengthMessage.classList.remove(
        "input-error-message"
      );
    } else if (contentLength < 10) {
      const remaining =
        10 - contentLength;

      contentLengthMessage.textContent =
        `还需要输入 ${remaining} 个字符`;

      contentLengthMessage.classList.add(
        "input-error-message"
      );
    } else {
      contentLengthMessage.textContent =
        `已经输入 ${contentLength} / 10000 个字符`;

      contentLengthMessage.classList.remove(
        "input-error-message"
      );
    }

    /*
     * 输入为空时显示默认提示。
     */
    if (!markdownText) {
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

    /*
     * 实时渲染 Markdown 和数学公式。
     */
    try {
      renderMarkdownInto(
        markdownPreview,
        originalText
      );
    } catch (error) {
      console.error(
        "Markdown 或公式预览失败：",
        error
      );

      markdownPreview.textContent =
        "预览生成失败，请检查公式语法。";
    }
  }
);

