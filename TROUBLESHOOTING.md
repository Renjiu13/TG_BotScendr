# 故障排除指南 🔧

本指南帮助你解决常见问题。

## 📋 目录

- [机器人问题](#机器人问题)
- [上传问题](#上传问题)
- [配置问题](#配置问题)
- [部署问题](#部署问题)
- [性能问题](#性能问题)
- [安全问题](#安全问题)

---

## 机器人问题

### ❌ 机器人没有响应

**症状：** 发送消息给机器人，没有任何回复

**诊断步骤：**

1. **检查 Webhook 状态**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
   ```

   正常输出应该包含：
   ```json
   {
     "ok": true,
     "result": {
       "url": "https://your-worker.workers.dev",
       "has_custom_certificate": false,
       "pending_update_count": 0
     }
   }
   ```

2. **检查 Worker 状态**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 Workers & Pages
   - 查看你的 Worker 是否正在运行

3. **查看实时日志**
   ```bash
   npx wrangler tail
   ```
   然后向机器人发送消息，观察日志输出

**常见原因和解决方案：**

| 原因 | 解决方案 |
|------|----------|
| Webhook 未设置 | 重新设置 Webhook |
| Webhook URL 错误 | 使用正确的 Worker URL |
| Worker 部署失败 | 重新部署 `npm run deploy` |
| 配置错误 | 检查 CONFIG secret |
| Webhook Secret 不匹配 | 更新配置或 Webhook |

**解决步骤：**

```bash
# 1. 删除旧 Webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# 2. 重新部署 Worker
npm run deploy

# 3. 设置新 Webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"<WORKER_URL>","secret_token":"<YOUR_SECRET>"}'

# 4. 验证
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### ❌ 机器人响应很慢

**症状：** 机器人回复延迟很大

**可能原因：**
- 图床响应慢
- 文件太大
- Worker 冷启动
- 网络问题

**解决方案：**

1. **测试图床速度**
   ```bash
   time curl -I https://your-image-host.com/upload
   ```

2. **检查 Worker 性能**
   - 在 Cloudflare Dashboard 查看 Metrics
   - 查看 CPU 时间和请求延迟

3. **优化配置**
   - 减小 MAX_FILE_SIZE
   - 使用更快的图床
   - 启用 KV 缓存

### ❌ 机器人返回错误消息

**症状：** 机器人回复 "处理请求时出错"

**诊断：**

```bash
# 查看详细错误日志
npx wrangler tail
```

**常见错误和解决方案：**

| 错误消息 | 原因 | 解决方案 |
|---------|------|----------|
| "CONFIG 环境变量未设置" | 配置未设置 | 运行 `wrangler secret put CONFIG` |
| "JSON格式无效" | 配置格式错误 | 验证 JSON 格式 |
| "缺少必要的参数" | 配置不完整 | 添加必需的配置项 |
| "Unauthorized" | Webhook Secret 不匹配 | 更新配置或 Webhook |

---

## 上传问题

### ❌ 文件上传失败

**症状：** 机器人提示 "处理文件时出错"

**诊断步骤：**

1. **查看详细错误**
   ```bash
   npx wrangler tail
   ```

2. **测试图床 API**
   ```bash
   curl -X POST "https://your-image-host.com/upload" \
     -F "file=@test.jpg"
   ```

**常见错误：**

#### 413 Payload Too Large

**原因：** 文件超过图床限制

**解决方案：**
```json
{
  "MAX_FILE_SIZE": 10485760  // 减小到 10MB
}
```

#### 401 Unauthorized

**原因：** 图床鉴权失败

**解决方案：**
```json
{
  "AUTH_CODE": "正确的鉴权码"
}
```

#### Timeout Error

**原因：** 上传超时

**解决方案：**
- 减小文件大小限制
- 使用更快的图床
- 检查网络连接

#### 无法获取文件链接

**原因：** 图床返回格式不符合预期

**解决方案：**
1. 查看日志中的原始响应
2. 修改 `extractUrlFromResult` 函数以适配你的图床

### ❌ 特定文件类型上传失败

**症状：** 某些文件类型无法上传

**可能原因：**
- 图床不支持该文件类型
- MIME 类型识别错误
- 文件扩展名问题

**解决方案：**

1. **检查图床支持的文件类型**
2. **查看日志中的 MIME 类型**
3. **测试其他文件类型**

### ❌ 上传成功但链接无效

**症状：** 机器人返回链接，但无法访问

**诊断：**

1. **检查返回的 URL**
   - 是否是完整的 URL
   - 是否包含正确的协议（http/https）

2. **测试链接**
   ```bash
   curl -I "返回的链接"
   ```

**解决方案：**

修改 `extractUrlFromResult` 函数以正确提取 URL：

```javascript
// 在 worker.js 中找到并修改此函数
function extractUrlFromResult(result, imgBedUrl) {
  // 根据你的图床返回格式调整
  if (result.data && result.data.url) {
    return result.data.url;
  }
  // 添加更多格式支持
}
```

---

## 配置问题

### ❌ 无法设置配置

**症状：** `wrangler secret put CONFIG` 失败

**解决步骤：**

1. **验证 JSON 格式**
   ```bash
   # 使用在线工具验证
   # https://jsonlint.com/
   ```

2. **检查登录状态**
   ```bash
   npx wrangler whoami
   ```

3. **重新登录**
   ```bash
   npx wrangler logout
   npx wrangler login
   ```

### ❌ 配置不生效

**症状：** 修改配置后没有变化

**解决方案：**

```bash
# 1. 更新配置
npx wrangler secret put CONFIG

# 2. 重新部署
npm run deploy

# 3. 等待几秒钟让更改生效
```

### ❌ 找不到配置

**症状：** Worker 提示 "CONFIG 环境变量未设置"

**解决方案：**

```bash
# 1. 列出所有 secrets
npx wrangler secret list

# 2. 如果没有 CONFIG，创建它
npx wrangler secret put CONFIG

# 3. 重新部署
npm run deploy
```

---

## 部署问题

### ❌ 部署失败

**症状：** `npm run deploy` 报错

**常见错误：**

#### "Not logged in"

```bash
npx wrangler login
```

#### "Invalid configuration"

```bash
# 验证 wrangler.toml
npx wrangler deploy --dry-run
```

#### "Script too large"

**原因：** Worker 脚本超过大小限制

**解决方案：**
- 移除不必要的代码
- 优化函数
- 使用 ES modules

### ❌ 部署成功但无法访问

**症状：** 部署成功，但访问 Worker URL 返回错误

**诊断：**

```bash
# 测试 Worker
curl -X POST "https://your-worker.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**解决方案：**

1. 检查 Worker 日志
2. 验证配置是否正确
3. 确认 Webhook 已设置

---

## 性能问题

### ❌ CPU 时间超限

**症状：** Worker 返回 "CPU time limit exceeded"

**原因：**
- 处理大文件
- 复杂的计算
- 无限循环

**解决方案：**

1. **减小文件大小限制**
   ```json
   {
     "MAX_FILE_SIZE": 10485760
   }
   ```

2. **优化代码**
   - 使用流式处理
   - 减少不必要的计算
   - 使用 `ctx.waitUntil()` 异步处理

### ❌ 内存超限

**症状：** Worker 崩溃或返回 500 错误

**解决方案：**

1. **减小文件大小限制**
2. **使用流式处理**
3. **避免将整个文件加载到内存**

### ❌ 请求超时

**症状：** 上传大文件时超时

**解决方案：**

1. **增加超时时间**（在代码中）
   ```javascript
   signal: AbortSignal.timeout(120000) // 120秒
   ```

2. **减小文件大小限制**

3. **使用更快的图床**

---

## 安全问题

### ❌ 机器人被滥用

**症状：** 大量未授权的上传请求

**解决方案：**

1. **启用用户白名单**
   ```json
   {
     "ALLOWED_USERS": [你的Telegram ID]
   }
   ```

2. **启用速率限制**
   ```bash
   npm run setup:kv
   # 更新 wrangler.toml
   ```

3. **启用 Webhook Secret**
   ```json
   {
     "WEBHOOK_SECRET": "use_a_long_random_string"
   }
   ```

### ❌ 配置泄露

**症状：** 担心配置信息泄露

**最佳实践：**

1. ✅ 使用 `wrangler secret` 而不是环境变量
2. ✅ 不要在代码中硬编码敏感信息
3. ✅ 将 `.env` 添加到 `.gitignore`
4. ✅ 定期更换 Token 和密钥
5. ✅ 使用 Webhook Secret 验证请求

---

## 🔍 调试技巧

### 查看实时日志

```bash
npx wrangler tail
```

### 查看特定时间的日志

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages
2. 选择你的 Worker
3. 点击 "Logs" 标签

### 本地测试

```bash
# 启动本地开发服务器
npm run dev

# 使用 ngrok 或 Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8787
```

### 测试配置

```bash
# 验证 JSON 格式
cat config.example.json | jq '.'

# 测试 Telegram API
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# 测试图床 API
curl -I "https://your-image-host.com/upload"
```

---

## 📞 获取帮助

如果以上方法都无法解决你的问题：

1. **查看日志**
   ```bash
   npx wrangler tail
   ```

2. **搜索 Issues**
   - [GitHub Issues](https://github.com/Renjiu13/TG_BotScendr/issues)

3. **提交新 Issue**
   - 包含错误日志
   - 描述复现步骤
   - 说明你的配置（隐藏敏感信息）

4. **查看文档**
   - [README.md](README.md)
   - [DEPLOYMENT.md](DEPLOYMENT.md)
   - [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
   - [Telegram Bot API 文档](https://core.telegram.org/bots/api)

---

## 📝 报告问题时请提供

- [ ] 错误消息（完整的）
- [ ] Worker 日志（`wrangler tail` 输出）
- [ ] 配置信息（隐藏敏感数据）
- [ ] 复现步骤
- [ ] 预期行为 vs 实际行为
- [ ] 环境信息（Wrangler 版本等）

**示例：**

```
### 问题描述
上传图片时返回 "处理图片时出错"

### 错误日志
```
❌ 处理图片时出错: 图床上传失败 (401)
```

### 配置（已隐藏敏感信息）
```json
{
  "IMG_BED_URL": "https://api.imgur.com/3/upload",
  "MAX_FILE_SIZE": 20971520
}
```

### 复现步骤
1. 向机器人发送 /start
2. 发送一张 2MB 的 JPG 图片
3. 收到错误消息

### 环境
- Wrangler: 3.78.0
- Node.js: 18.x
```

---

**祝你顺利解决问题！** 🎉
