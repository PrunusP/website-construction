//检查是否时管理员，不是则跳转到login页面
//1 选择禁言/置顶 2 填入用户名/帖子uid 3 点击提交

"use strict";

const adminPageStatus =
  document.getElementById("adminPageStatus");

const adminForm =
  document.getElementById("adminForm");

const muteOptions =
  document.getElementById("muteOptions");

const muteDurationInput =
  document.getElementById("muteDurationInput");

const muteReasonInput =
  document.getElementById("muteReasonInput");

const targetLabel =
  document.getElementById("targetLabel");

const targetInput =
  document.getElementById("targetInput");

const targetHelp =
  document.getElementById("targetHelp");

const adminMessage =
  document.getElementById("adminMessage");

const adminSubmitButton =
  document.getElementById("adminSubmitButton");

let currentAdmin = null;

function redirectToLogin() {
  const returnTo =
    window.location.pathname
    + window.location.search;

  window.location.replace(
    `../login.html?returnTo=${encodeURIComponent(returnTo)}`
  );
}

function getSelectedAction() {
  return adminForm.elements.adminAction.value;
}

function updateActionFields() {
  const action = getSelectedAction();
  const isMuteAction = action === "mute";

  muteOptions.hidden = !isMuteAction;

  if (isMuteAction) {
    targetLabel.textContent = "用户名";
    targetInput.placeholder = "填写需要禁言的用户名";
    targetHelp.textContent =
      "系统会通过 profiles 表查找这个用户名";
    adminSubmitButton.textContent = "确认禁言";
  } else {
    targetLabel.textContent = "帖子 UID";
    targetInput.placeholder = "填写帖子的 post_id";
    targetHelp.textContent =
      "帖子 UID 是 posts 表中的 post_id";
    adminSubmitButton.textContent = "确认置顶";
  }

  targetInput.value = "";
  adminMessage.textContent = "";
}

async function protectAdminPage() {
  try {
    if (!window.siteSupabase) {
      throw new Error("Supabase 客户端没有加载");
    }

    const {
      data: { user },
      error: userError
    } = await window.siteSupabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      redirectToLogin();
      return;
    }

    const { data: isAdmin, error: adminError } =
      await window.siteSupabase.rpc(
        "is_admin",
        {
          check_user_id: user.id
        }
      );

    if (adminError) {
      throw adminError;
    }

    if (isAdmin !== true) {
      redirectToLogin();
      return;
    }

    currentAdmin = user;
    adminPageStatus.hidden = true;
    adminForm.hidden = false;
    updateActionFields();
  } catch (error) {
    console.error("检查管理员权限失败：", error);
    adminPageStatus.textContent =
      `无法确认管理员权限：${error.message}`;
  }
}

async function findUserIdByUsername(username) {
  const { data: profile, error } =
    await window.siteSupabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error("没有找到这个用户名对应的用户");
  }

  return profile.id;
}

async function muteUser(username) {
  const targetUserId =
    await findUserIdByUsername(username);

  if (targetUserId === currentAdmin.id) {
    throw new Error("不能禁言自己的管理员账号");
  }

  const duration =
    muteDurationInput.value || null;

  const reason =
    muteReasonInput.value.trim() || null;

  const { error } =
    await window.siteSupabase.rpc(
      "admin_mute_user",
      {
        target_user_id: targetUserId,
        mute_duration: duration,
        mute_reason: reason
      }
    );

  if (error) {
    throw error;
  }
}

async function pinPost(postId) {
  const { error } =
    await window.siteSupabase.rpc(
      "admin_set_post_pin",
      {
        target_post_id: postId,
        should_pin: true
      }
    );

  if (error) {
    throw error;
  }
}

async function submitAdminAction(event) {
  event.preventDefault();

  if (!currentAdmin) {
    redirectToLogin();
    return;
  }

  const action = getSelectedAction();
  const target = targetInput.value.trim();

  if (!target) {
    adminMessage.textContent =
      action === "mute"
        ? "请输入用户名。"
        : "请输入帖子 UID。";

    targetInput.focus();
    return;
  }

  const operationName =
    action === "mute" ? "禁言用户" : "置顶帖子";

  const confirmed = window.confirm(
    `确定要执行“${operationName}”吗？\n目标：${target}`
  );

  if (!confirmed) {
    return;
  }

  adminSubmitButton.disabled = true;
  adminMessage.textContent = "正在提交管理员操作……";

  try {
    if (action === "mute") {
      await muteUser(target);
      adminMessage.textContent = `已成功禁言用户：${target}`;
    } else {
      await pinPost(target);
      adminMessage.textContent = `帖子已置顶：${target}`;
    }

    targetInput.value = "";
    muteReasonInput.value = "";
  } catch (error) {
    console.error("管理员操作失败：", error);
    adminMessage.textContent =
      `操作失败：${error.message}`;
  } finally {
    adminSubmitButton.disabled = false;
  }
}

adminForm.addEventListener("change", function (event) {
  if (event.target.name === "adminAction") {
    updateActionFields();
  }
});

adminForm.addEventListener("submit", submitAdminAction);

protectAdminPage();
