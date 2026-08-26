

      const tagNames = {
        unsolved: "未解决",
        solved: "已解决",
        Physics1: "AP Physics 1",
        Physics2: "AP Physics 2",
        PhysicsC: "AP Physics C",
        solution: "题解",
        other: "其他"
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
                created_at
              `)
              .eq("post_id", postId)
              .single();

          if (error) {
            throw error;
          }

          renderDiscussion(post);
        } catch (error) {
          console.error(
            "加载讨论失败：",
            error
          );

          discussionStatus.textContent =
            "无法找到这篇讨论，或者帖子加载失败。";
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

        discussionTime.textContent =
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
