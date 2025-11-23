# Telegram 文件上传机器人 🤖

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

这是一个部署在 Cloudflare Workers 上的 Telegram 机器人，可以自动将用户发送的文件上传到指定图床或对象存储服务，并返回公开访问链接。

## ✨ 功能特点

- 🎯 **多文件类型支持** - 图片、视频、音频、文档、压缩包等
- 🚀 **快速上传** - 基于 Cloudflare 全球网络，上传速度快
- 🔒 **安全可靠** - 支持用户白名单、速率限制、Webhook验证
- 💰 **完全免费** - 在 Cloudflare Workers 免费额度内运行
- 📊 **智能识别** - 自动识别文件类型并显示对应图标
- ⚡ **实时反馈** - 上传进度提示和详细的错误信息
- 🛡️ **防滥用** - 内置速率限制和文件大小限制
- 🌐 **全球可用** - 部署在 Cloudflare 边缘网络

## 📋 支持的文件类型

| 类型 | 格式 |
|------|------|
| 🖼️ 图片 | JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC, AVIF |
| 🎬 视频 | MP4, AVI, MOV, MKV, WebM, FLV, MPEG |
| 🎵 音频 | MP3, WAV, OGG, FLAC, AAC, M4A, OPUS |
| 📄 文档 | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX |
| 🗜️ 压缩 | ZIP, RAR, 7Z, TAR, GZ |
| 💻 代码 | HTML, CSS, JS, Python, Java, Go 等 |
| 📁 其他 | 几乎所有文件类型 |

## 🚀 快速开始

### 前置要求

1. **Cloudflare 账户** - [免费注册](https://dash.cloudflare.com/sign-up)
2. **Telegram Bot Token** - 从 [@BotFather](https://t.me/BotFather) 获取
3. **图床 API** - 支持文件上传的图床或对象存储服务

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/Renjiu13/TG_BotScendr.git
cd TG_BotScendr
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境

创建配置 JSON（稍后会用到）：

```json
{
  "TG_BOT_TOKEN": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "IMG_BED_URL": "https://your-image-host.com/upload",
  "MAX_FILE_SIZE": 20971520,
  "AUTH_CODE": "your_auth_code_if_needed",
  "ADMIN_CHAT_ID": 123456789,
  "ALLOWED_USERS": [123456789, 987654321],
  "WEBHOOK_SECRET": "your_random_secret_string"
}
```

**配置说明：**

| 参数 | 必需 | 说明 |
|------|------|------|
| `TG_BOT_TOKEN` | ✅ | Telegram Bot Token |
| `IMG_BED_URL` | ✅ | 图床上传 API 地址 |
| `MAX_FILE_SIZE` | ❌ | 最大文件大小（字节），默认 20MB |
| `AUTH_CODE` | ❌ | 图床鉴权码（如需要） |
| `ADMIN_CHAT_ID` | ❌ | 管理员 Telegram ID，接收错误通知 |
| `ALLOWED_USERS` | ❌ | 允许使用的用户 ID 列表 |
| `WEBHOOK_SECRET` | ❌ | Webhook 验证密钥 |

#### 4. 登录 Cloudflare

```bash
npx wrangler login
```

#### 5. 设置配置（Secret）

```bash
npm run setup:secret
# 或
npx wrangler secret put CONFIG
```

粘贴上面准备的 JSON 配置，按回车确认。

#### 6. （可选）创建 KV 命名空间用于速率限制

```bash
npm run setup:kv
# 或
npx wrangler kv:namespace create RATE_LIMIT_KV
```

复制输出的 `id`，更新 `wrangler.toml` 中的 KV 配置：

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your_kv_namespace_id"
```

#### 7. 部署到 Cloudflare Workers

```bash
npm run deploy
# 或
npx wrangler deploy
```

部署成功后，你会看到类似输出：

```
Published tg-botscendr (1.23 sec)
  https://tg-botscendr.your-subdomain.workers.dev
```

#### 8. 设置 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tg-botscendr.your-subdomain.workers.dev",
    "secret_token": "your_random_secret_string"
  }'
```

**注意：** `secret_token` 应与配置中的 `WEBHOOK_SECRET` 一致。

验证 Webhook 设置：

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## 📱 使用方法

### 基本命令

- `/start` - 启动机器人
- `/help` - 查看帮助信息
- `/stats` - 查看使用统计（需配置 KV）
- `/about` - 关于此机器人

### 上传文件

直接在 Telegram 中向机器人发送任何文件，机器人会自动：

1. 接收文件
2. 验证文件大小和类型
3. 上传到配置的图床
4. 返回公开访问链接

### 示例

```
用户: [发送图片]
机器人: 🔄 正在处理您的图片 "photo.jpg"，请稍候...
机器人: ✅ 图片上传成功！

📄 文件名: photo.jpg
📦 文件大小: 2.5 MB
🔗 下载链接:
https://your-image-host.com/files/abc123.jpg

点击链接即可访问或下载文件
```

## 🔧 高级配置

### 用户白名单

限制只有特定用户可以使用机器人：

```json
{
  "ALLOWED_USERS": [123456789, 987654321]
}
```

获取你的 Telegram ID：发送消息给 [@userinfobot](https://t.me/userinfobot)

### 速率限制

启用 KV 命名空间后，自动限制每个用户每分钟最多 10 个请求。

修改限制（在 `worker.js` 中）：

```javascript
const RATE_LIMIT_WINDOW = 60 * 1000; // 时间窗口（毫秒）
const RATE_LIMIT_MAX_REQUESTS = 10; // 最大请求数
```

### 自定义文件大小限制

```json
{
  "MAX_FILE_SIZE": 52428800  // 50MB (50 * 1024 * 1024)
}
```

**注意：** Cloudflare Workers 有 100MB 的请求体限制。

### Webhook 安全验证

设置 `WEBHOOK_SECRET` 后，机器人会验证来自 Telegram 的请求：

```json
{
  "WEBHOOK_SECRET": "use_a_long_random_string_here"
}
```

## 🛠️ 开发与调试

### 本地开发

```bash
npm run dev
```

这会启动本地开发服务器。由于 Telegram Webhook 需要公网地址，你需要使用隧道工具：

**使用 Cloudflare Tunnel：**

```bash
cloudflared tunnel --url http://localhost:8787
```

**使用 ngrok：**

```bash
ngrok http 8787
```

然后设置 Webhook 到隧道地址。

### 查看日志

```bash
npm run tail
# 或
npx wrangler tail
```

### 验证配置

```bash
npm run validate
# 或
npx wrangler deploy --dry-run
```

## 📊 监控与维护

### 查看 Worker 状态

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → 你的 Worker

### 查看请求日志

在 Cloudflare Dashboard 中查看实时日志，或使用：

```bash
npx wrangler tail
```

### 更新配置

更新 Secret 配置：

```bash
npx wrangler secret put CONFIG
```

重新部署：

```bash
npm run deploy
```

## 🐛 故障排除

### 机器人没有响应

1. 检查 Webhook 设置：
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. 查看 Worker 日志：
   ```bash
   npx wrangler tail
   ```

3. 验证配置是否正确设置

### 上传失败

1. 检查图床 API 是否正常
2. 验证 `AUTH_CODE` 是否正确
3. 确认文件大小未超过限制
4. 查看错误消息中的具体原因

### 速率限制不生效

确保已创建并绑定 KV 命名空间：

```bash
npx wrangler kv:namespace list
```

## 🔒 安全建议

1. ✅ 使用 `WEBHOOK_SECRET` 验证 Telegram 请求
2. ✅ 设置 `ALLOWED_USERS` 限制使用者
3. ✅ 启用速率限制防止滥用
4. ✅ 定期检查 Worker 日志
5. ✅ 不要在代码中硬编码敏感信息
6. ✅ 使用 `wrangler secret` 管理敏感配置

## 📈 性能优化

- 使用 `ctx.waitUntil()` 异步处理文件上传，快速响应 Telegram
- 利用 Cloudflare 全球网络加速文件传输
- 实现超时控制避免长时间等待
- 使用 KV 存储实现高效的速率限制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🙏 鸣谢

- [Cloudflare Workers](https://workers.cloudflare.com/) - 强大的边缘计算平台
- [Telegram Bot API](https://core.telegram.org/bots/api) - 优秀的机器人 API
- 所有贡献者和使用者

## 📞 支持

- 提交 [Issue](https://github.com/Renjiu13/TG_BotScendr/issues)
- 查看 [Wiki](https://github.com/Renjiu13/TG_BotScendr/wiki)
- 加入讨论组（如有）

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
