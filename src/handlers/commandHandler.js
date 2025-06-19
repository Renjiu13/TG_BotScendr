import { sendMessage } from '../utils/telegramApi.js';

/**
 * 处理命令消息
 * @param {Object} message - 消息对象
 * @param {string|number} chatId - 聊天ID
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function handleCommand(message, chatId, env) {
  const text = message.text.trim();
  const command = text.split(' ')[0].toLowerCase();

  switch (command) {
    case '/start':
      await sendMessage(chatId, `👋 欢迎使用文件上传机器人！\n\n直接发送图片、视频、音频或文档，我会将它们上传并返回链接。\n\n使用 /help 查看更多命令。`, env);
      break;
    
    case '/help':
      await sendMessage(chatId, `📚 <b>可用命令</b>：\n\n/start - 开始使用机器人\n/help - 显示帮助信息\n/info - 显示机器人信息\n\n直接发送文件即可上传并获取链接。支持的文件类型：\n- 图片 🖼️\n- 视频 🎬\n- 音频 🎵\n- 动画/GIF 🎞️\n- 文档 📄`, env);
      break;
    
    case '/info':
      await sendMessage(chatId, `ℹ️ <b>机器人信息</b>\n\n这是一个文件上传机器人，可以将您发送的文件上传到图床并返回公开链接。\n\n<b>支持的最大文件大小</b>：5GB\n<b>支持的文件类型</b>：几乎所有类型`, env);
      break;
    
    default:
      await sendMessage(chatId, `❓ 未知命令。使用 /help 查看可用命令。`, env);
      break;
  }
}