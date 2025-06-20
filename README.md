# Telegram 文件上传机器人

这是一个部署在 Cloudflare Workers 上的 Telegram 机器人，可以自动将用户发送的文件上传到指定图床，并返回公开链接。

## 功能特点
- 支持图片、视频、音频、文档等多种文件类型
- 自动识别文件类型并生成对应的图标
- 文件大小限制可配置（默认 20MB）
- 上传过程中提供进度提示
- 错误处理和详细的错误提示
- 完全免费（在 Cloudflare Workers 免费额度内）

## 部署步骤

### 1. 准备工作
1. **获取 Telegram Bot Token**
   - 与 @BotFather 对话创建机器人，获取类似 `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` 的 Token

2. **选择图床或对象存储服务**
   - 确保该服务提供公开的文件上传 API（如 imgur、七牛云、阿里云 OSS 等）
   - 获取上传 API 的 URL（如 `https://api.imgur.com/3/upload`）

3. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login  # 登录 Cloudflare 账户
```

### 2. 配置 Cloudflare Workers 环境变量

1. 进入项目目录：
   ```bash
   cd TG_BotScendr
   ```
2. 设置主配置（推荐用 secret 方式，防止泄露敏感信息）：
   ```bash
   wrangler secret put CONFIG
   ```
   按提示输入如下 JSON（示例）：
   ```json
   {
     "TG_BOT_TOKEN": "你的BotToken",
     "IMG_BED_URL": "你的图床API地址",
     "MAX_FILE_SIZE": 20971520, // 可选，单位字节，默认20MB
     "AUTH_CODE": "可选，图床鉴权码",
     "ADMIN_CHAT_ID": 123456789 // 可选，管理员Telegram ID
   }
   ```

### 3. 部署到 Cloudflare Workers

1. 安装依赖（如未安装 wrangler）：
   ```bash
   npm install
   ```
2. 部署：
   ```bash
   npm run deploy
   # 或
   wrangler publish
   ```

3. 获取你的 Worker 公网地址（如 `https://telegram-file-uploader.yourname.workers.dev`）。

4. 设置 Telegram Webhook：
   ```bash
   curl -X POST "https://api.telegram.org/bot<你的BotToken>/setWebhook?url=<你的Worker地址>"
   # 例：
   # curl -X POST "https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://telegram-file-uploader.yourname.workers.dev"
   ```

---

## 使用方法

1. 在 Telegram 中找到你的机器人，发送 `/start` 激活。
2. 直接发送图片、视频、音频、文档等文件，机器人会自动上传并返回公开链接。
3. 支持命令：
   - `/start` 启动机器人
   - `/help` 查看使用说明

**注意事项：**
- 单个文件大小不能超过配置的最大值（默认20MB）。
- 上传大文件时，机器人会提示"正在上传"，请耐心等待。
- 支持多种主流文件类型，自动识别并显示对应图标。

---

## 常见问题 FAQ

### Q: 上传失败怎么办？
A: 可能原因有：
- 文件超出大小限制
- 图床/对象存储服务异常
- 网络超时
- 配置错误（如 Token、API 地址）

请检查机器人返回的错误提示，并根据建议操作。

### Q: 如何更换图床或对象存储？
A: 修改 `CONFIG` 环境变量中的 `IMG_BED_URL` 即可，无需重新部署代码。

### Q: 如何限制/防止滥用？
A: 可在 `CONFIG` 中设置 `ADMIN_CHAT_ID`，机器人遇到异常会自动通知管理员。高级用法可自行扩展频率限制等逻辑。

---

## 本地开发与调试

1. 启动本地开发环境（需本地 ngrok/Cloudflare Tunnel 映射公网）：
   ```bash
   npm run dev
   # 或
   wrangler dev
   ```
2. 用 ngrok 或 Cloudflare Tunnel 将本地端口映射到公网，设置 Telegram Webhook 到该公网地址。

---

## 贡献与许可证

欢迎提交 issue 和 PR 进行改进！

本项目基于 MIT License 开源。

---

## 鸣谢
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- 各大图床/对象存储服务
