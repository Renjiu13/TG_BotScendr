import { getFile, getFileDownloadUrl, sendMessage } from '../utils/telegramApi.js';
import { uploadToImageBed, extractUrlFromResult } from '../utils/uploadUtils.js';
import { formatFileSize } from '../utils/formatUtils.js';

/**
 * 处理动画/GIF消息
 * @param {Object} message - 消息对象
 * @param {string|number} chatId - 聊天ID
 * @param {boolean} isDocument - 是否作为文档发送
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function handleAnimation(message, chatId, isDocument, env) {
  try {
    // 发送处理中消息
    await sendMessage(chatId, `🎞️ 正在处理动画/GIF...`, env);
    
    // 获取文件ID和信息
    let fileId, fileName, mimeType;
    
    if (isDocument) {
      fileId = message.document.file_id;
      fileName = message.document.file_name || `animation_${Date.now()}.gif`;
      mimeType = message.document.mime_type || 'image/gif';
    } else {
      fileId = message.animation.file_id;
      fileName = `animation_${Date.now()}.gif`;
      mimeType = message.animation.mime_type || 'image/gif';
    }
    
    // 获取文件信息
    const fileInfo = await getFile(fileId, env);
    if (!fileInfo.ok) {
      throw new Error(`获取文件信息失败: ${fileInfo.description}`);
    }
    
    const filePath = fileInfo.result.file_path;
    const fileSize = fileInfo.result.file_size;
    
    // 获取文件下载URL
    const fileUrl = getFileDownloadUrl(filePath, env);
    
    // 下载文件
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`下载文件失败: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // 上传到图床
    await sendMessage(chatId, `📤 正在上传动画 (${formatFileSize(fileSize)})...`, env);
    const uploadResult = await uploadToImageBed(fileBuffer, fileName, mimeType, env);
    
    // 提取URL
    const animationUrl = extractUrlFromResult(uploadResult, env.IMG_BED_URL);
    
    if (!animationUrl) {
      throw new Error('无法从上传结果中提取URL');
    }
    
    // 发送结果
    await sendMessage(chatId, `✅ 动画上传成功！\n\n🔗 <a href="${animationUrl}">${animationUrl}</a>`, env);
  } catch (error) {
    console.error('处理动画时出错:', error);
    await sendMessage(chatId, `❌ 处理动画时出错: ${error.message}`, env);
  }
}