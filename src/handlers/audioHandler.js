import { getFile, getFileDownloadUrl, sendMessage } from '../utils/telegramApi.js';
import { uploadToImageBed, extractUrlFromResult } from '../utils/uploadUtils.js';
import { formatFileSize } from '../utils/formatUtils.js';

/**
 * 处理音频消息
 * @param {Object} message - 消息对象
 * @param {string|number} chatId - 聊天ID
 * @param {boolean} isDocument - 是否作为文档发送
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function handleAudio(message, chatId, isDocument, env) {
  try {
    // 发送处理中消息
    await sendMessage(chatId, `🎵 正在处理音频...`, env);
    
    // 获取文件ID和信息
    let fileId, fileName, mimeType;
    
    if (isDocument) {
      fileId = message.document.file_id;
      fileName = message.document.file_name || `audio_${Date.now()}.mp3`;
      mimeType = message.document.mime_type || 'audio/mpeg';
    } else {
      fileId = message.audio.file_id;
      fileName = message.audio.title ? `${message.audio.title}.mp3` : `audio_${Date.now()}.mp3`;
      mimeType = message.audio.mime_type || 'audio/mpeg';
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
    await sendMessage(chatId, `📤 正在上传音频 (${formatFileSize(fileSize)})...`, env);
    const uploadResult = await uploadToImageBed(fileBuffer, fileName, mimeType, env);
    
    // 提取URL
    const audioUrl = extractUrlFromResult(uploadResult, env.IMG_BED_URL);
    
    if (!audioUrl) {
      throw new Error('无法从上传结果中提取URL');
    }
    
    // 发送结果
    await sendMessage(chatId, `✅ 音频上传成功！\n\n🔗 <a href="${audioUrl}">${audioUrl}</a>`, env);
  } catch (error) {
    console.error('处理音频时出错:', error);
    await sendMessage(chatId, `❌ 处理音频时出错: ${error.message}`, env);
  }
}