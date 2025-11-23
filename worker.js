// 全局常量
const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024; // 默认20MB
const CONFIG_ENV_VAR_NAME = 'CONFIG'; // 存储JSON配置的环境变量名
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
const RATE_LIMIT_MAX_REQUESTS = 10; // 每分钟最多10个请求

export default {
  async fetch(request, env, ctx) {
    // 只接受POST请求
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. 从环境变量获取JSON配置字符串
    const configStr = env[CONFIG_ENV_VAR_NAME];
    if (!configStr) {
      const errorMessage = `${CONFIG_ENV_VAR_NAME} 环境变量未设置。请在Cloudflare Worker的设置中添加一个名为 "${CONFIG_ENV_VAR_NAME}" 的环境变量，其值为JSON格式的配置。`;
      console.error(errorMessage);
      return new Response(errorMessage, { status: 500 });
    }

    let config;
    try {
      // 2. 解析JSON配置
      config = JSON.parse(configStr);
    } catch (e) {
      const errorMessage = `环境变量 ${CONFIG_ENV_VAR_NAME} 的JSON格式无效。错误: ${e.message}`;
      console.error(errorMessage);
      return new Response(errorMessage, { status: 500 });
    }

    // 3. 校验必要的配置项
    if (!config.IMG_BED_URL || !config.TG_BOT_TOKEN) {
      const errorMessage = `配置中缺少必要的参数 (IMG_BED_URL, TG_BOT_TOKEN)。请检查 ${CONFIG_ENV_VAR_NAME} 环境变量中的JSON内容。`;
      console.error(errorMessage);
      return new Response(errorMessage, { status: 500 });
    }

    // 4. 验证webhook请求（可选但推荐）
    if (config.WEBHOOK_SECRET) {
      const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secretHeader !== config.WEBHOOK_SECRET) {
        console.warn('Invalid webhook secret');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // 将解析后的 config 对象传递给主处理函数
    return handleRequest(request, config, env, ctx);
  }
};

// 主要处理逻辑函数，接收解析后的 config 对象
async function handleRequest(request, config, env, ctx) {
  let update;
  try {
    update = await request.json();
    if (!update.message) return new Response('OK', { status: 200 });

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text?.trim();

    // 用户授权检查
    if (config.ALLOWED_USERS && Array.isArray(config.ALLOWED_USERS)) {
      if (!config.ALLOWED_USERS.includes(userId) && !config.ALLOWED_USERS.includes(chatId)) {
        await sendMessage(chatId, '⛔ 您没有权限使用此机器人。', config);
        return new Response('OK', { status: 200 });
      }
    }

    // 速率限制检查（使用KV存储，如果可用）
    if (env.RATE_LIMIT_KV) {
      const rateLimitKey = `rate_limit:${userId}`;
      const rateLimitData = await env.RATE_LIMIT_KV.get(rateLimitKey, { type: 'json' });
      
      const now = Date.now();
      if (rateLimitData) {
        const { count, windowStart } = rateLimitData;
        if (now - windowStart < RATE_LIMIT_WINDOW) {
          if (count >= RATE_LIMIT_MAX_REQUESTS) {
            await sendMessage(chatId, '⚠️ 请求过于频繁，请稍后再试。', config);
            return new Response('OK', { status: 200 });
          }
          await env.RATE_LIMIT_KV.put(rateLimitKey, JSON.stringify({
            count: count + 1,
            windowStart
          }), { expirationTtl: 120 });
        } else {
          await env.RATE_LIMIT_KV.put(rateLimitKey, JSON.stringify({
            count: 1,
            windowStart: now
          }), { expirationTtl: 120 });
        }
      } else {
        await env.RATE_LIMIT_KV.put(rateLimitKey, JSON.stringify({
          count: 1,
          windowStart: now
        }), { expirationTtl: 120 });
      }
    }

    // 处理命令
    if (text && text.startsWith('/')) {
      return await handleCommand(text, chatId, config);
    }

    // 根据消息类型分发到不同的处理器
    if (message.photo && message.photo.length > 0) {
      ctx.waitUntil(handlePhoto(message, chatId, config));
    } else if (message.video || (message.document && (message.document.mime_type?.startsWith('video/') || message.document.file_name?.match(/\.(mp4|avi|mov|wmv|flv|mkv|webm|m4v|3gp|mpeg|mpg|ts)$/i)))) {
      ctx.waitUntil(handleVideo(message, chatId, !!message.document, config));
    } else if (message.audio || (message.document && (message.document.mime_type?.startsWith('audio/') || message.document.file_name?.match(/\.(mp3|wav|ogg|flac|aac|m4a|wma|opus|mid|midi)$/i)))) {
      ctx.waitUntil(handleAudio(message, chatId, !!message.document, config));
    } else if (message.animation || (message.document && (message.document.mime_type?.includes('animation') || message.document.file_name?.match(/\.gif$/i)))) {
      ctx.waitUntil(handleAnimation(message, chatId, !!message.document, config));
    } else if (message.document && (message.document.mime_type?.includes('svg') || message.document.file_name?.match(/\.svg$/i))) {
      ctx.waitUntil(handleSvg(message, chatId, config));
    } else if (message.document) {
      ctx.waitUntil(handleDocument(message, chatId, config));
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('处理请求时出错:', error.stack || error);
    const adminChatId = config.ADMIN_CHAT_ID || (update && update.message ? update.message.chat.id : null);
    if (adminChatId) {
      ctx.waitUntil(
        sendMessage(adminChatId, `⚠️ 处理请求时内部错误: ${error.message}`, config)
          .catch(e => console.error("发送错误消息给管理员失败:", e.stack || e))
      );
    }
    return new Response('OK', { status: 200 });
  }
}

// 处理命令
async function handleCommand(text, chatId, config) {
  const command = text.split(' ')[0];
  const maxSize = formatFileSize(config.MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE);
  
  switch (command) {
    case '/start':
      await sendMessage(chatId, 
        `🤖 *机器人已启用！*\n\n` +
        `直接发送文件即可自动上传，支持图片、视频、音频、文档等多种格式。\n\n` +
        `📊 当前支持最大 ${maxSize} 的文件上传。\n` +
        `⚡ 使用 /help 查看详细说明。`, 
        config
      );
      break;
      
    case '/help':
      await sendMessage(chatId, 
        `📖 *使用说明*\n\n` +
        `1️⃣ 发送 /start 启动机器人（仅首次需要）\n` +
        `2️⃣ 直接发送图片、视频、音频、文档或其他文件\n` +
        `3️⃣ 机器人会自动处理上传并返回链接\n` +
        `4️⃣ 当前支持最大 ${maxSize} 的文件上传\n\n` +
        `📝 *支持的文件类型*\n` +
        `• 图片：JPG, PNG, GIF, WebP, SVG 等\n` +
        `• 视频：MP4, AVI, MOV, MKV 等\n` +
        `• 音频：MP3, WAV, OGG, FLAC 等\n` +
        `• 文档：PDF, DOC, XLS, ZIP 等\n\n` +
        `⚙️ *其他命令*\n` +
        `/stats - 查看使用统计\n` +
        `/about - 关于此机器人`, 
        config
      );
      break;
      
    case '/stats':
      await sendMessage(chatId, 
        `📊 *使用统计*\n\n` +
        `此功能需要配置 KV 存储才能使用。\n` +
        `请联系管理员启用此功能。`, 
        config
      );
      break;
      
    case '/about':
      await sendMessage(chatId, 
        `ℹ️ *关于此机器人*\n\n` +
        `这是一个基于 Cloudflare Workers 的 Telegram 文件上传机器人。\n\n` +
        `✨ *特性*\n` +
        `• 支持多种文件类型\n` +
        `• 快速上传到图床\n` +
        `• 完全免费使用\n` +
        `• 开源项目\n\n` +
        `🔗 GitHub: https://github.com/Renjiu13/TG_BotScendr`, 
        config
      );
      break;
      
    default:
      await sendMessage(chatId, 
        `❓ 未知命令。使用 /help 查看可用命令。`, 
        config
      );
  }
  
  return new Response('OK', { status: 200 });
}

// --- 通用文件上传处理器 ---
async function genericFileUploadHandler(chatId, fileId, fileName, mimeType, fileTypeLabel, config) {
  const { IMG_BED_URL, TG_BOT_TOKEN, AUTH_CODE } = config;

  await sendMessage(chatId, `🔄 正在处理您的${fileTypeLabel} "${fileName}"，请稍候...`, config);

  try {
    const fileInfoResponse = await getFile(fileId, config);
    if (!fileInfoResponse || !fileInfoResponse.ok) {
      await sendMessage(chatId, `❌ 无法获取${fileTypeLabel}信息 (来自Telegram API)，请稍后再试。`, config);
      return;
    }

    const filePath = fileInfoResponse.result.file_path;
    const fileSize = fileInfoResponse.result.file_size || 0;
    const maxSize = config.MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE;

    // 提前检查文件大小
    if (fileSize > maxSize) {
      await sendMessage(chatId, 
        `⚠️ ${fileTypeLabel}太大 (${formatFileSize(fileSize)})，超过当前限制 ${formatFileSize(maxSize)}，无法处理。\n\n` +
        `💡 *建议*\n` +
        `1️⃣ 压缩文件后再上传\n` +
        `2️⃣ 使用其他文件分享服务\n` +
        `3️⃣ 联系管理员提高限制`, 
        config
      );
      return;
    }

    const telegramFileUrl = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${filePath}`;

    // 根据文件大小动态调整提示阈值
    const warningThreshold = Math.min(maxSize * 0.5, 10 * 1024 * 1024);
    if (fileSize > warningThreshold && fileSize <= maxSize) {
      await sendMessage(chatId, `ℹ️ 文件大小为 ${formatFileSize(fileSize)}，处理和上传可能需要一些时间，请耐心等待...`, config);
    }

    // 下载文件
    const tgFileResponse = await fetch(telegramFileUrl, {
      signal: AbortSignal.timeout(30000) // 30秒超时
    });
    
    if (!tgFileResponse.ok) {
      throw new Error(`从Telegram获取文件失败: ${tgFileResponse.status} ${tgFileResponse.statusText}`);
    }

    const fileBuffer = await tgFileResponse.arrayBuffer();

    // 构建multipart/form-data（Cloudflare Workers兼容方式）
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const formDataParts = [];
    
    // 添加文件部分
    formDataParts.push(`--${boundary}\r\n`);
    formDataParts.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
    formDataParts.push(`Content-Type: ${mimeType}\r\n\r\n`);
    
    // 将ArrayBuffer转换为Uint8Array
    const fileData = new Uint8Array(fileBuffer);
    
    // 结束边界
    const endBoundary = `\r\n--${boundary}--\r\n`;

    // 组合所有部分
    const textEncoder = new TextEncoder();
    const headerBytes = textEncoder.encode(formDataParts.join(''));
    const endBytes = textEncoder.encode(endBoundary);
    
    // 创建完整的请求体
    const totalLength = headerBytes.length + fileData.length + endBytes.length;
    const requestBody = new Uint8Array(totalLength);
    requestBody.set(headerBytes, 0);
    requestBody.set(fileData, headerBytes.length);
    requestBody.set(endBytes, headerBytes.length + fileData.length);

    // 构建上传URL
    const uploadUrl = new URL(IMG_BED_URL);
    uploadUrl.searchParams.append('returnFormat', 'full');
    if (AUTH_CODE) {
      uploadUrl.searchParams.append('authCode', AUTH_CODE);
    }

    console.log(`${fileTypeLabel}上传请求 URL: ${uploadUrl.toString()}`);

    // 上传到图床
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: requestBody,
      signal: AbortSignal.timeout(60000) // 60秒超时
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`图床上传失败 (${uploadResponse.status}): ${errorText.substring(0, 100)}`);
    }

    const responseText = await uploadResponse.text();
    console.log(`${fileTypeLabel}上传原始响应:`, responseText.substring(0, 500));

    let uploadResult;
    try {
      uploadResult = JSON.parse(responseText);
    } catch (e) {
      uploadResult = responseText;
    }

    const extractedUrl = extractUrlFromResult(uploadResult, IMG_BED_URL);

    if (extractedUrl) {
      const successMsg = 
        `✅ *${fileTypeLabel}上传成功！*\n\n` +
        `📄 文件名: \`${fileName}\`\n` +
        `📦 文件大小: ${formatFileSize(fileSize)}\n` +
        `🔗 下载链接:\n${extractedUrl}\n\n` +
        `_点击链接即可访问或下载文件_`;
      await sendMessage(chatId, successMsg, config);
    } else {
      await sendMessage(chatId, 
        `⚠️ 无法从图床获取${fileTypeLabel}链接。\n\n` +
        `图床原始响应 (前200字符):\n\`\`\`\n${responseText.substring(0, 200)}\n\`\`\`\n\n` +
        `如果需要，可尝试Telegram临时链接 (有效期有限):\n${telegramFileUrl}`, 
        config
      );
    }

  } catch (error) {
    console.error(`处理${fileTypeLabel}时出错:`, error.stack || error);
    let errorMessage = `❌ *处理${fileTypeLabel}时出错*\n\n错误: ${error.message}`;
    
    // 根据错误类型提供更具体的建议
    if (error.message.includes('413') || error.message.includes('too large')) {
      errorMessage += '\n\n💡 *建议*\n1️⃣ 压缩文件后再上传\n2️⃣ 使用其他文件分享服务';
    } else if (error.message.includes('timeout') || error.message.includes('timed out') || error.name === 'TimeoutError') {
      errorMessage += '\n\n💡 *建议*\n1️⃣ 检查网络连接\n2️⃣ 稍后重试\n3️⃣ 如果文件较大，考虑压缩后上传';
    } else if (error.message.includes('fetch')) {
      errorMessage += '\n\n💡 *建议*\n1️⃣ 检查图床服务是否正常\n2️⃣ 稍后重试';
    }
    
    await sendMessage(chatId, errorMessage, config);
  }
}

// --- 特定文件类型处理器 ---
async function handlePhoto(message, chatId, config) {
  const photo = message.photo[message.photo.length - 1];
  const fileId = photo.file_id;
  const fileName = `photo_${message.message_id}.jpg`;
  const mimeType = 'image/jpeg';
  await genericFileUploadHandler(chatId, fileId, fileName, mimeType, '图片', config);
}

async function handleVideo(message, chatId, isDocument, config) {
  const fileId = isDocument ? message.document.file_id : message.video.file_id;
  const fileName = isDocument ? message.document.file_name : (message.video.file_name || `video_${message.message_id}.mp4`);
  const mimeType = isDocument ? (message.document.mime_type || 'video/mp4') : (message.video.mime_type || 'video/mp4');
  await genericFileUploadHandler(chatId, fileId, fileName, mimeType, '视频', config);
}

async function handleAudio(message, chatId, isDocument, config) {
  const fileId = isDocument ? message.document.file_id : message.audio.file_id;
  const fileName = isDocument ? message.document.file_name : (message.audio.file_name || message.audio.title || `audio_${message.message_id}.mp3`);
  const mimeType = isDocument ? (message.document.mime_type || 'audio/mpeg') : (message.audio.mime_type || 'audio/mpeg');
  await genericFileUploadHandler(chatId, fileId, fileName, mimeType, '音频', config);
}

async function handleAnimation(message, chatId, isDocument, config) {
  const fileId = isDocument ? message.document.file_id : message.animation.file_id;
  const fileName = isDocument ? message.document.file_name : (message.animation.file_name || `animation_${message.message_id}.gif`);
  const mimeType = isDocument ? (message.document.mime_type || 'image/gif') : (message.animation.mime_type || 'image/gif');
  await genericFileUploadHandler(chatId, fileId, fileName, mimeType, '动画/GIF', config);
}

async function handleSvg(message, chatId, config) { // SVG 由 message.document 传入
  const fileId = message.document.file_id;
  const fileName = message.document.file_name || `svg_${message.message_id}.svg`;
  const mimeType = message.document.mime_type || 'image/svg+xml'; // Telegram 应该会提供正确的MIME类型
  await genericFileUploadHandler(chatId, fileId, fileName, mimeType, 'SVG文件', config);
}

async function handleDocument(message, chatId, config) {
  const fileId = message.document.file_id;
  const fileName = message.document.file_name || `file_${message.message_id}`;
  let mimeType = message.document.mime_type || 'application/octet-stream';
  
  if (fileName.toLowerCase().endsWith('.exe')) {
    mimeType = 'application/octet-stream';
  }

  const fileTypeLabel = getFileIcon(fileName, mimeType) + ' 文件';
  await genericFileUploadHandler(chatId, fileId, fileName, mimeType, fileTypeLabel, config);
}

// --- 辅助函数 ---
async function getFile(fileId, config) {
  const { TG_BOT_TOKEN } = config;
  const API_URL = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;
  const response = await fetch(`${API_URL}/getFile?file_id=${fileId}`);
  return await response.json();
}

async function sendMessage(chatId, text, config) {
  const { TG_BOT_TOKEN } = config;
  const API_URL = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;
  
  try {
    const response = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text, 
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(10000) // 10秒超时
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('发送消息失败:', errorData);
      
      // 如果Markdown解析失败，尝试使用纯文本
      if (errorData.description?.includes('parse')) {
        const fallbackResponse = await fetch(`${API_URL}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: text.replace(/[*_`\[\]]/g, ''), // 移除Markdown标记
            disable_web_page_preview: true
          }),
          signal: AbortSignal.timeout(10000)
        });
        return await fallbackResponse.json();
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('发送消息异常:', error);
    throw error;
  }
}

function extractUrlFromResult(result, imgBedUrl) {
  let url = '';
  let baseUrl = 'https://your.default.domain'; 
  try {
      if (imgBedUrl && (imgBedUrl.startsWith('https://') || imgBedUrl.startsWith('http://'))) {
         baseUrl = new URL(imgBedUrl).origin;
      }
  } catch (e) {
      console.error("无法解析 IMG_BED_URL 来获取 baseUrl:", imgBedUrl, e.message);
  }

  if (typeof result === 'string' && result.includes("The string did not match the expected pattern")) {
    console.warn("图床返回模式匹配错误，可能是文件扩展名或类型不被图床接受。");
    const urlMatch = result.match(/(https?:\/\/[^\s"']+)/);
    if (urlMatch) return urlMatch[0];
  }

  if (Array.isArray(result) && result.length > 0) {
    const item = result[0];
    if (item && typeof item === 'object') {
        if (item.url) url = item.url;
        else if (item.src) url = item.src.startsWith('http') ? item.src : `${baseUrl}${item.src.startsWith('/') ? item.src : '/' + item.src}`;
    } else if (typeof item === 'string') {
        url = item.startsWith('http') ? item : `${baseUrl}${item.startsWith('/') ? item : '/' + item}`;
    }
  } else if (result && typeof result === 'object') {
    if (result.url) url = result.url;
    else if (result.src) url = result.src.startsWith('http') ? result.src : `${baseUrl}${result.src.startsWith('/') ? result.src : '/' + result.src}`;
    else if (result.file) url = `${baseUrl}${result.file.startsWith('/') ? result.file : '/' + result.file}`; // 假设 file 是相对路径
    else if (result.data && result.data.url) url = result.data.url;
    else if (result.image && result.image.url) url = result.image.url;
    else if (result.link) url = result.link;
    // 新增：尝试从常见的 success:false 错误中提取 message 或 error
    else if (result.success === false && (result.message || result.error)) {
        console.warn("图床返回失败状态:", result.message || result.error);
    }
  } else if (typeof result === 'string') {
    if (result.startsWith('http://') || result.startsWith('https://')) {
        url = result;
    } else if (result.trim() !== '' && result.length < 2083) { // 避免将非常长的错误消息误认为相对路径
        // 检查是否可能是JSON错误消息
        if (!(result.startsWith('{') && result.endsWith('}'))) {
             url = `${baseUrl}${result.startsWith('/') ? result : '/' + result}`;
        }
    }
  }
  try {
    new URL(url); // 验证URL是否有效
  } catch (_) {
    // 如果提取的URL无效，并且原始结果是字符串，尝试从中匹配一个URL
    if (typeof result === 'string') {
        const fallbackMatch = result.match(/(https?:\/\/[^\s"']+)/);
        if (fallbackMatch) return fallbackMatch[0];
    }
    return ''; // 无法提取有效URL
  }
  return url;
}

function getFileIcon(filename, mimeType) {
  if (mimeType) {
    if (mimeType.startsWith('image/svg+xml')) return '🎨'; // 更具体的SVG图标
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('msword') || mimeType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('vnd.openxmlformats-officedocument.presentationml.presentation')) return '📊';
    if (mimeType.includes('text/')) return '🗒️';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('compressed')) return '🗜️';
    if (mimeType.includes('html')) return '🌐';
    if (mimeType.includes('application/x-msdownload') || (mimeType.includes('application/octet-stream') && filename?.toLowerCase().endsWith('.exe'))) return '⚙️';
  }
  
  if (filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['svg'].includes(ext)) return '🎨';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'heif', 'avif'].includes(ext)) return '🖼️';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'mpeg', 'mpg', 'ts'].includes(ext)) return '🎬';
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'mid', 'midi'].includes(ext)) return '🎵';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    if (['txt', 'rtf', 'md', 'json', 'xml', 'yaml', 'ini', 'log'].includes(ext)) return '🗒️';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return '🗜️';
    if (['exe', 'msi', 'apk', 'app', 'dmg', 'iso', 'bat', 'sh', 'cmd'].includes(ext)) return '⚙️';
    if (['html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'c', 'cpp', 'go', 'rb'].includes(ext)) return '💻';
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) return '🔤';
    if (['obj', 'fbx', 'blend', 'stl', 'psd', 'ai', 'eps', 'sketch', 'fig', 'xd'].includes(ext) && !['svg'].includes(ext) ) return '🎨'; // 避免重复SVG
    if (['torrent', 'srt', 'vtt', 'ass', 'ssa'].includes(ext)) return '📎';
  }
  
  return '📁'; // 默认通用文件图标
}

function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}