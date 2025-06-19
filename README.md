# TG_BotScendr

一个功能强大的 Telegram 文件上传机器人，可以将各种类型的文件上传到图床并返回链接。

## 功能特点

- 支持多种文件类型：图片、视频、音频、动画/GIF、文档等
- 自动识别文件类型并进行相应处理
- 支持最大 5GB 的文件上传
- 简单易用的命令系统
- 详细的上传状态反馈
- 可配置的图床 URL 和认证码

## 什么是 TG_BotScendr？

TG_BotScendr 是一个部署在 Cloudflare Workers 上的 Telegram 机器人。它可以接收您发送到 Telegram 的图片和视频文件，并将它们自动上传到您指定的图床或对象存储服务（需要有公开的上传接口），然后将生成的公开链接返回给您。

本项目利用 Cloudflare Workers 的 Serverless 特性，可以实现低成本甚至免费（在 Cloudflare 免费额度内）运行。

## 为什么选择 TG_BotScendr？

- **无需服务器**：完全运行在 Cloudflare Workers 上，无需自己维护服务器
- **免费额度**：Cloudflare Workers 提供每天 100,000 次免费请求额度
- **全球加速**：利用 Cloudflare 的全球网络，上传速度更快
- **简单部署**：只需几步即可完成部署
- **隐私保护**：您的文件直接从 Telegram 传输到图床，不经过第三方服务器


# TG_BotScendr 环境变量配置指南

根据项目文档和配置文件，我整理了 TG_BotScendr 项目中所有的环境变量及其示例值，以便您更清晰地了解如何配置此 Telegram 机器人。

## 基本环境变量

| 环境变量 | 描述 | 必填 | 示例值 |
|---------|------|------|--------|
| `BOT_TOKEN` | Telegram 机器人的 API Token，从 BotFather 获取 | 是 | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` |
| `IMG_BED_URL` | 图床上传 API 地址 | 是 | `https://www.imgtp.com/api/upload` |
| `AUTH_CODE` | 图床认证码/Token | 是 | `your_imgbed_token_here` |
| `ADMIN_CHAT_ID` | 管理员的 Telegram 聊天 ID（可选） | 否 | `123456789` |

## 配置示例

### 图床上传配置示例

```toml
[vars]
BOT_TOKEN = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
IMG_BED_URL = "https://www.imgtp.com/api/upload"
AUTH_CODE = "your_imgbed_token_here"
```

## 推荐的图床服务及其配置

### ImgTP

- API 地址: `https://www.imgtp.com/api/upload`
- 获取 Token: 注册账号 → 个人中心 → API Token
- 支持类型: 图片、视频、文档等

### SM.MS

- API 地址: `https://sm.ms/api/v2/upload`
- 获取 Token: 注册账号 → 控制台 → API Token
- 主要支持图片

## 部署时的注意事项

1. 确保所有必填环境变量都已正确设置
2. 敏感信息（如 `BOT_TOKEN`、`AUTH_CODE`）应在 Cloudflare Dashboard 中勾选"加密"选项
3. 设置环境变量后需要重新部署应用才能生效


## 小白友好的部署指南

### 前提条件

1. 一个 Telegram 机器人 Token
   - 打开 Telegram，搜索 [@BotFather](https://t.me/BotFather) 并开始聊天
   - 发送 `/newbot` 命令给 BotFather
   - 输入您想要的机器人名称（如"我的文件上传机器人"）
   - 输入机器人的用户名，必须以"bot"结尾（如"myuploader_bot"）
   - BotFather 会发给您一个 API Token，格式类似：`123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`
   - 保存好这个 Token，后面会用到

2. 一个可用的图床服务（支持 POST 上传）
   - 推荐使用 [ImgTP](https://www.imgtp.com/)、[聚合图床](https://www.superbed.cn/) 或 [SM.MS](https://sm.ms/) 等
   - 注册账号并获取 API 上传地址和 Token（如有需要）

3. [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
   - 访问 Cloudflare 官网注册一个免费账户
   - 使用邮箱和密码完成注册
   - 不需要添加网站，直接进入控制面板即可

### 详细部署步骤（通过 GitHub 仓库部署）

#### 1. Fork 项目仓库

1. 访问 [TG_BotScendr GitHub 仓库](https://github.com/yourusername/TG_BotScendr)
2. 点击右上角的 "Fork" 按钮
3. 等待 Fork 完成，您将拥有自己的仓库副本

#### 2. 在 Cloudflare 创建应用

1. 登录 [Cloudflare 控制面板](https://dash.cloudflare.com/)
2. 在左侧菜单中点击 "Workers & Pages"
3. 点击 "创建应用程序" 或 "Create application" 按钮
4. 选择 "连接到 Git" 或 "Connect to Git"
5. 如果您是第一次使用，需要授权 Cloudflare 访问您的 GitHub 账户
6. 在列表中找到并选择您刚刚 Fork 的 TG_BotScendr 仓库
7. 在设置页面中：
   - 项目名称：输入一个名称，如 "tg-botscendr"
   - 生产分支：选择 "main" 或 "master"（取决于您的仓库默认分支）
   - 构建命令：输入 `npx wrangler deploy`
   - 构建输出目录：可以留空
   - 根目录：可以留空
8. 点击 "保存并部署" 或 "Save and Deploy" 按钮

#### 3. 设置环境变量

1. 部署开始后，点击 "设置" 或 "Settings" 选项卡
2. 找到 "环境变量" 或 "Environment Variables" 部分
3. 点击 "添加变量" 或 "Add variable" 按钮
4. 添加以下环境变量：
   - 变量名：`BOT_TOKEN`，值：您从 BotFather 获取的 Telegram 机器人 Token
   - 变量名：`IMG_BED_URL`，值：您的图床上传 API 地址
   - 如果需要认证码，添加变量名：`AUTH_CODE`，值：您的图床认证码
5. 确保勾选 "加密" 选项以保护敏感信息（特别是 BOT_TOKEN）
6. 点击 "保存" 或 "Save" 按钮
7. 返回 "部署" 或 "Deployments" 选项卡，点击 "重新部署" 或 "Redeploy" 按钮

#### 4. 设置 Telegram Webhook

1. 部署完成后，在应用详情页面找到您的应用 URL，格式类似：`https://tg-botscendr.your-username.workers.dev`
2. 打开浏览器，访问以下链接（替换相应内容）：
   ```
   https://api.telegram.org/bot您的BOT_TOKEN/setWebhook?url=https://tg-botscendr.your-username.workers.dev
   ```
   例如：
   ```
   https://api.telegram.org/bot123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ/setWebhook?url=https://tg-botscendr.your-username.workers.dev
   ```
3. 如果成功，您将看到类似以下的响应：
   ```json
   {"ok":true,"result":true,"description":"Webhook was set"}
   ```

#### 5. 测试机器人

1. 在 Telegram 中搜索您创建的机器人用户名
2. 点击 "开始" 或发送 `/start` 命令
3. 发送一张图片或视频测试上传功能
4. 机器人应该会返回上传后的链接

### 部署步骤（手动创建 Worker 方式）

如果您不想使用 GitHub 仓库部署，也可以手动创建 Worker：

#### 1. 创建 Cloudflare Worker

1. 登录 [Cloudflare 控制面板](https://dash.cloudflare.com/)
2. 在左侧菜单中点击 "Workers & Pages"
3. 点击 "创建应用程序" 或 "Create application" 按钮
4. 选择 "创建 Worker" 或 "Create Worker"
5. 为您的 Worker 起一个名字，如 "tg-botscendr"
6. 点击 "部署" 或 "Deploy" 按钮创建一个空的 Worker

#### 2. 编辑 Worker 代码

1. 在 Worker 创建成功后，点击 "编辑代码" 或 "Edit code" 按钮
2. 删除编辑器中的所有默认代码
3. 访问 [TG_BotScendr GitHub 仓库](https://github.com/yourusername/TG_BotScendr)
4. 找到并打开 `src/index.js` 文件
5. 复制其中的全部代码
6. 粘贴到 Cloudflare Worker 编辑器中
7. 点击 "保存并部署" 或 "Save and Deploy" 按钮

#### 3. 设置环境变量

1. 在 Worker 详情页面，点击 "设置" 或 "Settings" 选项卡
2. 找到 "变量" 或 "Variables" 部分
3. 点击 "添加变量" 或 "Add variable" 按钮
4. 添加以下环境变量：
   - 变量名：`BOT_TOKEN`，值：您从 BotFather 获取的 Telegram 机器人 Token
   - 变量名：`IMG_BED_URL`，值：您的图床上传 API 地址
   - 如果需要认证码，添加变量名：`AUTH_CODE`，值：您的图床认证码
5. 确保勾选 "加密" 选项以保护敏感信息（特别是 BOT_TOKEN）
6. 点击 "保存并部署" 或 "Save and Deploy" 按钮

然后按照上面的第4步和第5步设置 Webhook 并测试机器人。

## 常见问题与解决方案

### 部署问题

#### Worker 部署失败

- **问题**：部署过程中显示错误
- **解决方案**：
  1. 检查构建命令是否正确（`npx wrangler deploy`）
  2. 确认 Cloudflare 账户是否有足够权限
  3. 检查环境变量是否正确设置
  4. 尝试刷新页面后重新部署

#### 环境变量设置问题

- **问题**：无法添加或保存环境变量
- **解决方案**：
  1. 确保变量名称拼写正确（区分大小写）
  2. 检查值是否包含特殊字符
  3. 尝试使用不同浏览器

### 使用问题

#### 机器人不响应

- **问题**：发送消息给机器人但没有回应
- **解决方案**：
  1. 确认 Webhook 设置是否成功
  2. 检查 BOT_TOKEN 是否正确
  3. 在 Cloudflare Worker 监控页面查看是否有请求进入
  4. 重新设置 Webhook

#### 上传失败

- **问题**：文件发送成功但上传失败
- **解决方案**：
  1. 检查图床 URL 是否正确
  2. 确认图床服务是否正常运行
  3. 验证认证信息是否有效
  4. 检查文件大小是否超过限制

#### 返回链接无法访问

- **问题**：机器人返回的链接无法打开
- **解决方案**：
  1. 确认图床服务是否正常
  2. 检查图床返回的 JSON 格式是否与代码匹配
  3. 修改 `src/services/uploadService.js` 中的解析逻辑

## 图床推荐与设置指南

### 免费图床推荐

1. **ImgTP**
   - 网址：[https://www.imgtp.com/](https://www.imgtp.com/)
   - API 地址：`https://www.imgtp.com/api/upload`
   - 获取 Token：注册账号 → 个人中心 → API Token
   - 支持类型：图片、视频、文档等

2. **SM.MS**
   - 网址：[https://sm.ms/](https://sm.ms/)
   - API 地址：`https://sm.ms/api/v2/upload`
   - 获取 Token：注册账号 → 控制台 → API Token
   - 主要支持图片

### 设置步骤

1. 注册并登录图床网站
2. 获取 API 上传地址和 Token
3. 在 Cloudflare Worker 环境变量中设置：
   - `IMG_BED_URL`：填入 API 上传地址
   - `AUTH_CODE`：填入 Token（如需要）

## 高级配置

### 自定义响应消息

如果您想修改机器人的回复消息，可以直接在 GitHub 仓库中修改代码：

1. 在您 Fork 的仓库中找到 `src/handlers` 目录
2. 修改相应的处理器文件
3. 提交更改
4. Cloudflare 将自动重新部署您的应用

### 限制用户访问

如果您希望只允许特定用户使用您的机器人：

1. 在您 Fork 的仓库中找到 `src/utils/configValidator.js` 文件
2. 添加用户 ID 验证逻辑
3. 提交更改
4. Cloudflare 将自动重新部署您的应用

## 监控与维护

### 查看使用情况

1. 登录 Cloudflare 控制面板
2. 进入 "Workers & Pages"
3. 选择您的应用
4. 查看 "指标" 选项卡，可以看到请求次数和资源使用情况

### 更新机器人

当有新版本发布时：

1. 在您 Fork 的仓库中点击 "Sync fork" 同步上游更改
2. Cloudflare 将自动重新部署您的应用

## 技术支持

如果您在部署或使用过程中遇到问题，可以：

1. 查看本文档的常见问题部分
2. 在 GitHub 仓库提交 Issue
3. 联系项目维护者获取帮助
