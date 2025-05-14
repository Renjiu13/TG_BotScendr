import { getFile, getFileDownloadUrl, sendMessage } from '../utils/telegramApi.js';
import { uploadToImageBed, extractUrlFromResult } from '../utils/uploadUtils.js';
import { formatFileSize } from '../utils/formatUtils.js';

/**
 * 处理视频消息
 * @param {Object} message - 消息对象
 * @param {string|number} chatId - 聊天ID
 * @param {boolean} isDocument - 是否作为文档发送
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function handleVideo(message, chatId, isDocument, env) {
  try {
    // 发送处理中消息
    await sendMessage(chatId, `🎬 正在处理视频...`, env);
    
    // 获取文件ID和信息
    let fileId, fileName, mimeType;
    
    if (isDocument) {
      fileId = message.document.file_id;
      fileName = message.document.file_name || `video_${Date.now()}.mp4`;
      mimeType = message.document.mime_type || 'video/mp4';
    } else {
      fileId = message.video.file_id;
      fileName = `video_${Date.now()}.mp4`;
      mimeType = message.video.mime_type || 'video/mp4';
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
    await sendMessage(chatId, `📤 正在上传视频 (${formatFileSize(fileSize)})...`, env);
    const uploadResult = await uploadToImageBed(fileBuffer, fileName, mimeType, env);
    
    // 提取URL
    const videoUrl = extractUrlFromResult(uploadResult, env.IMG_BED_URL);
    
    if (!videoUrl) {
      throw new Error('无法从上传结果中提取URL');
    }
    
    // 发送结果
    await sendMessage(chatId, `✅ 视频上传成功！\n\n🔗 <a href="${videoUrl}">${videoUrl}</a>`, env);
  } catch (error) {
    console.error('处理视频时出错:', error);
    await sendMessage(chatId, `❌ 处理视频时出错: ${error.message}`, env);
  }
}