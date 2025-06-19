# TG_BotScendr

一个功能强大的 Telegram 文件上传机器人，支持多种文件类型（图片、视频、音频、文档、GIF 等）上传到自定义图床，并自动返回可访问的外链。

---

## 功能特性
- 支持图片、视频、音频、动画、文档等多种类型的 Telegram 文件上传
- 自动将文件上传到自定义图床（支持带鉴权码）
- 上传成功后自动回复外链
- Cloudflare Worker 部署，免费、快速、无需服务器
- 支持多用户并发
- 错误自动通知管理员

---

## 快速部署到 Cloudflare Worker

### 1. Fork 本仓库到你的 GitHub 账号

### 2. 登录 Cloudflare
- 进入 [Cloudflare Workers & Pages](https://dash.cloudflare.com/) > 创建应用程序
- 选择"从 Git 提供商连接"，授权并选择你 Fork 的仓库

### 3. 构建和部署设置
- **构建命令**：留空（本项目为纯 Worker 脚本，无需构建）
- **生产目录**：留空或填 `.`
- **入口文件**：Cloudflare 会自动识别 `wrangler.toml` 的 `main` 字段（已配置为 `src/index.js`）
- 点击部署

### 4. 配置环境变量（可在 Cloudflare Dashboard 设置覆盖）
`wrangler.toml` 示例：
```toml
[vars]
IMG_BED_URL = "https://your-image-bed.com/upload"   # 图床上传接口
BOT_TOKEN = "你的 Telegram Bot Token"
AUTH_CODE = "你的图床鉴权码（如有）"
#ADMIN_CHAT_ID = "可选，管理员 Telegram ID"
```

### 5. 获取 Worker 访问 URL
部署成功后，Cloudflare 会分配一个访问 URL，例如：
```
https://your-worker.your-subdomain.workers.dev
```

---

## 使用方法
1. 在 Telegram 添加你的 Bot（使用 @BotFather 创建并获取 Token）
2. 向 Bot 发送图片、视频、音频、文档等文件
3. Bot 会自动上传文件到图床，并回复外链
4. 支持 /start、/help 等基础命令

---

## 主要环境变量说明
- `IMG_BED_URL`：你的图床上传接口地址，需支持 POST 上传
- `BOT_TOKEN`：你的 Telegram Bot Token
- `AUTH_CODE`：图床鉴权码（如有）
- `ADMIN_CHAT_ID`：可选，管理员 Telegram ID，用于接收错误通知

---

## 常见问题
- **Q: 为什么上传失败？**
  - 检查图床接口地址和鉴权码是否正确，确保图床支持 POST 上传
- **Q: 如何本地调试？**
  - 安装依赖：`npm install`
  - 本地开发：`npx wrangler dev`
- **Q: 支持哪些文件类型？**
  - 支持图片、视频、音频、GIF、文档等主流类型
- **Q: Node.js API 可以用吗？**
  - 不可以，Cloudflare Worker 仅支持 Web 标准 API

---

## 参考
- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [Telegram Bot API 文档](https://core.telegram.org/bots/api)

---

如有问题欢迎提 Issue 或 PR！
