# 快速开始指南 🚀

5分钟内完成部署！

## 📋 准备工作

在开始之前，请确保你有：

- ✅ Cloudflare 账户（[免费注册](https://dash.cloudflare.com/sign-up)）
- ✅ Telegram Bot Token（从 [@BotFather](https://t.me/BotFather) 获取）
- ✅ 图床 API 地址（如 Imgur、SM.MS 等）

## ⚡ 快速部署

### 方法 1: 使用自动化脚本（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Renjiu13/TG_BotScendr.git
cd TG_BotScendr

# 2. 安装依赖
npm install

# 3. 运行设置脚本
./setup.sh
```

脚本会引导你完成所有配置！

### 方法 2: 手动部署

```bash
# 1. 克隆项目
git clone https://github.com/Renjiu13/TG_BotScendr.git
cd TG_BotScendr

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 设置配置
npx wrangler secret put CONFIG
```

粘贴以下 JSON（替换为你的实际值）：

```json
{
  "TG_BOT_TOKEN": "你的Bot Token",
  "IMG_BED_URL": "你的图床API地址",
  "MAX_FILE_SIZE": 20971520,
  "WEBHOOK_SECRET": "随机字符串"
}
```

```bash
# 5. 部署
npm run deploy

# 6. 设置 Webhook
curl -X POST "https://api.telegram.org/bot你的Token/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"你的Worker地址","secret_token":"你的WEBHOOK_SECRET"}'
```

## 🎯 测试机器人

1. 在 Telegram 中搜索你的机器人
2. 发送 `/start`
3. 发送一张图片测试

## 📝 常用配置

### 最小配置（仅必需项）

```json
{
  "TG_BOT_TOKEN": "123456:ABC-DEF",
  "IMG_BED_URL": "https://api.imgur.com/3/upload"
}
```

### 推荐配置

```json
{
  "TG_BOT_TOKEN": "123456:ABC-DEF",
  "IMG_BED_URL": "https://api.imgur.com/3/upload",
  "MAX_FILE_SIZE": 20971520,
  "WEBHOOK_SECRET": "use_openssl_rand_hex_32",
  "ADMIN_CHAT_ID": 你的Telegram ID
}
```

### 完整配置

```json
{
  "TG_BOT_TOKEN": "123456:ABC-DEF",
  "IMG_BED_URL": "https://api.imgur.com/3/upload",
  "AUTH_CODE": "图床鉴权码",
  "MAX_FILE_SIZE": 20971520,
  "WEBHOOK_SECRET": "use_openssl_rand_hex_32",
  "ADMIN_CHAT_ID": 你的Telegram ID,
  "ALLOWED_USERS": [123456789, 987654321]
}
```

## 🔧 常用命令

```bash
# 部署更新
npm run deploy

# 查看日志
npm run tail

# 本地开发
npm run dev

# 验证配置
npm run validate

# 更新配置
npx wrangler secret put CONFIG
```

## 🐛 遇到问题？

### 机器人没有响应

```bash
# 检查 Webhook 状态
curl "https://api.telegram.org/bot你的Token/getWebhookInfo"

# 查看日志
npm run tail
```

### 上传失败

1. 检查图床 API 是否正常
2. 验证 AUTH_CODE 是否正确
3. 确认文件大小未超过限制

### 配置错误

```bash
# 重新设置配置
npx wrangler secret delete CONFIG
npx wrangler secret put CONFIG
```

## 📚 更多信息

- 📖 [完整文档](README.md)
- 🚀 [详细部署指南](DEPLOYMENT.md)
- 📝 [更新日志](CHANGELOG.md)

## 💡 提示

1. **生成随机密钥**
   ```bash
   openssl rand -hex 32
   ```

2. **获取你的 Telegram ID**
   - 发送消息给 [@userinfobot](https://t.me/userinfobot)

3. **测试图床 API**
   ```bash
   curl -I https://your-image-host.com/upload
   ```

4. **启用速率限制**
   ```bash
   npm run setup:kv
   # 然后更新 wrangler.toml
   ```

## 🎉 完成！

现在你的机器人已经可以使用了！

在 Telegram 中：
1. 搜索你的机器人
2. 发送 `/start`
3. 发送文件测试上传

---

**需要帮助？** 查看 [Issues](https://github.com/Renjiu13/TG_BotScendr/issues) 或提交新问题。
