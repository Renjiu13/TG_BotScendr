# 部署指南

本文档提供详细的部署步骤和常见问题解决方案。

## 📋 部署前检查清单

- [ ] 已注册 Cloudflare 账户
- [ ] 已从 @BotFather 获取 Bot Token
- [ ] 已准备好图床 API 地址
- [ ] 已安装 Node.js (v18+)
- [ ] 已安装 Git

## 🚀 详细部署步骤

### 步骤 1: 准备 Telegram Bot

1. 在 Telegram 中搜索 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. 保存返回的 Bot Token（格式：`123456:ABC-DEF...`）

**可选配置：**

```bash
# 设置机器人描述
/setdescription

# 设置机器人简介
/setabouttext

# 设置机器人头像
/setuserpic

# 设置命令列表
/setcommands
```

命令列表示例：
```
start - 启动机器人
help - 查看帮助信息
stats - 查看使用统计
about - 关于此机器人
```

### 步骤 2: 选择图床服务

支持任何提供 HTTP API 的图床或对象存储服务：

#### 推荐服务：

1. **Cloudflare R2**
   - 免费额度：10GB 存储，每月 1000 万次读取
   - 配置：创建 R2 bucket，使用 Workers 作为上传接口

2. **Imgur**
   - API: `https://api.imgur.com/3/upload`
   - 需要注册获取 Client ID

3. **SM.MS**
   - API: `https://sm.ms/api/v2/upload`
   - 免费使用，可注册获取 API Token

4. **自建图床**
   - 使用 Chevereto、Lsky Pro 等开源图床程序

#### 获取图床 API 信息：

- API 地址（上传端点）
- 鉴权方式（API Key、Token 等）
- 返回格式（JSON、纯文本等）

### 步骤 3: 克隆并配置项目

```bash
# 克隆项目
git clone https://github.com/Renjiu13/TG_BotScendr.git
cd TG_BotScendr

# 安装依赖
npm install

# 复制配置模板
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置。

### 步骤 4: 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器，登录你的 Cloudflare 账户并授权。

### 步骤 5: 配置 Worker

#### 5.1 设置 Secret 配置

准备配置 JSON：

```json
{
  "TG_BOT_TOKEN": "你的Bot Token",
  "IMG_BED_URL": "你的图床API地址",
  "MAX_FILE_SIZE": 20971520,
  "AUTH_CODE": "图床鉴权码（如需要）",
  "ADMIN_CHAT_ID": 你的Telegram ID,
  "ALLOWED_USERS": [你的Telegram ID],
  "WEBHOOK_SECRET": "随机字符串"
}
```

**生成随机 WEBHOOK_SECRET：**

```bash
# Linux/Mac
openssl rand -hex 32

# 或使用在线工具
# https://www.random.org/strings/
```

**设置 Secret：**

```bash
npx wrangler secret put CONFIG
# 粘贴上面的 JSON，按回车
```

#### 5.2 （可选）创建 KV 命名空间

用于速率限制功能：

```bash
npx wrangler kv:namespace create RATE_LIMIT_KV
```

复制输出的 `id`，编辑 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "你的KV命名空间ID"
```

### 步骤 6: 部署 Worker

```bash
npm run deploy
```

成功后会显示 Worker URL，例如：
```
https://tg-botscendr.your-subdomain.workers.dev
```

### 步骤 7: 设置 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<你的Bot Token>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tg-botscendr.your-subdomain.workers.dev",
    "secret_token": "你的WEBHOOK_SECRET",
    "max_connections": 40,
    "allowed_updates": ["message"]
  }'
```

**验证设置：**

```bash
curl "https://api.telegram.org/bot<你的Bot Token>/getWebhookInfo"
```

应该看到类似输出：

```json
{
  "ok": true,
  "result": {
    "url": "https://tg-botscendr.your-subdomain.workers.dev",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### 步骤 8: 测试机器人

1. 在 Telegram 中搜索你的机器人
2. 发送 `/start`
3. 发送一张图片测试上传功能

## 🔄 更新部署

### 更新代码

```bash
git pull origin main
npm run deploy
```

### 更新配置

```bash
npx wrangler secret put CONFIG
# 输入新的配置 JSON
```

### 查看当前配置

```bash
npx wrangler secret list
```

## 🐛 故障排除

### 问题 1: 机器人没有响应

**检查 Webhook 状态：**

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

**可能原因：**
- Webhook URL 设置错误
- Worker 部署失败
- 配置错误

**解决方法：**

```bash
# 查看 Worker 日志
npx wrangler tail

# 重新设置 Webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
# 然后重新设置
```

### 问题 2: 上传失败

**检查图床 API：**

```bash
# 测试图床 API 是否可访问
curl -I https://your-image-host.com/upload
```

**查看详细错误：**

```bash
npx wrangler tail
```

**常见错误：**
- `413 Payload Too Large` - 文件太大
- `401 Unauthorized` - 鉴权失败
- `timeout` - 网络超时

### 问题 3: 配置无效

**验证 JSON 格式：**

使用在线工具验证 JSON：https://jsonlint.com/

**重新设置配置：**

```bash
npx wrangler secret delete CONFIG
npx wrangler secret put CONFIG
```

### 问题 4: 速率限制不生效

**检查 KV 绑定：**

```bash
npx wrangler kv:namespace list
```

确保 `wrangler.toml` 中正确配置了 KV 绑定。

## 📊 监控与日志

### 实时日志

```bash
npx wrangler tail
```

### Cloudflare Dashboard

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)：

1. 进入 Workers & Pages
2. 选择你的 Worker
3. 查看 Metrics 和 Logs

### 设置告警

在 Cloudflare Dashboard 中可以设置：
- 错误率告警
- 请求量告警
- CPU 使用率告警

## 🔒 安全最佳实践

1. **使用 Webhook Secret**
   ```json
   {
     "WEBHOOK_SECRET": "use-a-long-random-string"
   }
   ```

2. **限制用户访问**
   ```json
   {
     "ALLOWED_USERS": [123456789]
   }
   ```

3. **启用速率限制**
   - 创建并绑定 KV 命名空间

4. **定期检查日志**
   ```bash
   npx wrangler tail
   ```

5. **不要提交敏感信息**
   - 将 `.env` 添加到 `.gitignore`
   - 使用 `wrangler secret` 管理敏感配置

## 💰 成本估算

### Cloudflare Workers 免费额度

- 每天 100,000 次请求
- 每次请求最多 10ms CPU 时间
- 每次请求最多 128MB 内存

### 超出免费额度

- $5/月 可获得 1000 万次请求
- 对于个人使用，免费额度通常足够

### KV 存储（可选）

- 免费：100,000 次读取/天
- 免费：1,000 次写入/天
- 免费：1GB 存储

## 🎯 性能优化建议

1. **使用 ctx.waitUntil()**
   - 异步处理文件上传
   - 快速响应 Telegram

2. **启用 KV 缓存**
   - 缓存常用数据
   - 减少重复计算

3. **优化文件处理**
   - 流式传输大文件
   - 避免全部加载到内存

4. **设置合理的超时**
   - 下载超时：30秒
   - 上传超时：60秒
   - API 调用超时：10秒

## 📚 相关资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Telegram Bot API 文档](https://core.telegram.org/bots/api)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [项目 GitHub](https://github.com/Renjiu13/TG_BotScendr)

## 🆘 获取帮助

如果遇到问题：

1. 查看本文档的故障排除部分
2. 查看项目 [Issues](https://github.com/Renjiu13/TG_BotScendr/issues)
3. 提交新的 Issue
4. 加入讨论组（如有）

---

**祝部署顺利！🎉**
