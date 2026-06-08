# 清账本

一个静态个人记账网站。打开 `index.html` 会先看到“你好”，点击“记账本”进入 `ledger.html`。账目会保存在当前浏览器的 `localStorage` 中。

## 本地预览

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## 发布到网站

任选一种方式：

1. Netlify：把整个 `ledger-site` 文件夹拖到 Netlify 的 Deploy 页面，然后在 Domain settings 里添加你的域名。
2. Vercel：新建项目，导入这个文件夹，不需要构建命令，然后在 Domains 里添加你的域名。
3. GitHub Pages：把这几个文件提交到仓库，Pages 源选择仓库根目录或对应分支目录，然后在仓库 Pages 里填写 Custom domain。

## 域名解析

如果用 Netlify 或 Vercel，它们会在你添加域名后给出 DNS 记录。去你买域名的平台添加这些记录即可：

- 根域名，例如 `example.com`：通常添加 `A` 记录，或按平台提示添加 `ALIAS/ANAME`。
- `www` 子域名，例如 `www.example.com`：通常添加 `CNAME` 记录，指向托管平台给你的地址。

DNS 生效可能需要几分钟到 24 小时。生效后打开域名首页会显示“你好”，点击“记账本”会进入账本页面。

当前版本是纯前端本地账本。上线后每个访客的数据只存在自己的浏览器里；如果需要多设备同步、登录、团队共享或云端备份，可以再加数据库和后端。

## 用 GitHub Pages 发布 `prunuses.site`

这个文件夹里已经有 `CNAME` 文件，内容是：

```text
prunuses.site
```

### 1. 上传到 GitHub

1. 登录 GitHub。
2. 新建一个仓库，建议名字叫 `prunuses-site`。
3. 把本文件夹里的所有文件上传进去：
   - `index.html`
   - `ledger.html`
   - `styles.css`
   - `app.js`
   - `CNAME`
   - `README.md`
4. 进入仓库的 `Settings`。
5. 左侧找到 `Pages`。
6. `Source` 选择 `Deploy from a branch`。
7. `Branch` 选择 `main`，目录选择 `/root`，保存。
8. `Custom domain` 填：

```text
prunuses.site
```

### 2. 在百度云设置 DNS

进入百度云域名控制台，找到 `prunuses.site` 的解析设置。

删除或停用旧的无关记录，尤其是指向百度云旧网站的记录。然后添加下面 4 条：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |

TTL 如果不知道选什么，就保持默认。

如果还想让 `www.prunuses.site` 也能打开，再添加一条：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| www | CNAME | 你的GitHub用户名.github.io |

注意：这里的 `你的GitHub用户名` 要换成您自己的 GitHub 用户名。例如用户名是 `abc`，就填：

```text
abc.github.io
```

### 3. 等待生效

DNS 生效可能需要几分钟，也可能需要 24 小时。

生效后：

- 打开 `https://prunuses.site` 会看到“你好”
- 点击“记账本”会进入记账本

### 4. 打开 HTTPS

回到 GitHub 仓库：

1. 进入 `Settings`
2. 进入 `Pages`
3. 等 GitHub 检查通过
4. 勾选 `Enforce HTTPS`

这样网址前面就是安全的 `https://`。
