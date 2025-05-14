import { handleCommand } from './commandHandler.js';
import { handlePhoto } from './photoHandler.js';
import { handleVideo } from './videoHandler.js';
import { handleAudio } from './audioHandler.js';
import { handleAnimation } from './animationHandler.js';
import { handleDocument } from './documentHandler.js';
import { sendMessage } from '../utils/telegramApi.js';
import { validateConfig } from '../utils/configValidator.js';

/**
 * 主要请求处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} - 响应对象
 */
export async function handleRequest(request, env) {
  // 验证配置
  const configValidation = validateConfig(env);
  if (!configValidation.valid) {
    return new Response(configValidation.message, { status: 500 });
  }

  if (request.method !== 'POST') {
    return new Response('只接受POST请求', { status: 405 });
  }

  try {
    const update = await request.json();
    if (!update.message) return new Response('OK', { status: 200 });

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text?.trim();

    // 处理命令
    if (text && text.startsWith('/')) {
      await handleCommand(message, chatId, env);
      return new Response('OK', { status: 200 });
    }

    // 根据消息类型分发处理
    if (message.photo && message.photo.length > 0) {
      await handlePhoto(message, chatId, env);
    }
    // 自动处理视频
    else if (message.video || (message.document &&
            (message.document.mime_type?.startsWith('video/') ||
             message.document.file_name?.match(/\.(mp4|avi|mov|wmv|flv|mkv|webm|m4v|3gp|mpeg|mpg|ts)$/i)))) {
      await handleVideo(message, chatId, !!message.document, env);
    }
    // 自动处理音频
    else if (message.audio || (message.document &&
            (message.document.mime_type?.startsWith('audio/') ||
             message.document.file_name?.match(/\.(mp3|wav|ogg|flac|aac|m4a|wma|opus|mid|midi)$/i)))) {
      await handleAudio(message, chatId, !!message.document, env);
    }
    // 自动处理动画/GIF
    else if (message.animation || (message.document &&
            (message.document.mime_type?.includes('animation') ||
             message.document.file_name?.match(/\.gif$/i)))) {
      await handleAnimation(message, chatId, !!message.document, env);
    }
    // 处理其他所有文档类型
    else if (message.document) {
      await handleDocument(message, chatId, env);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('处理请求时出错:', error);
    try {
      await sendMessage(env.ADMIN_CHAT_ID || chatId, `处理请求时内部错误: ${error.message}`, env);
    } catch (e) {
      console.error("Failed to send error message:", e);
    }
    return new Response('处理请求时出错', { status: 500 });
  }
}