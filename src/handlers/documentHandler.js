import { getFile, getFileDownloadUrl, sendMessage } from '../utils/telegramApi.js';
import { uploadToImageBed, extractUrlFromResult } from '../utils/uploadUtils.js';
import { formatFileSize, getFileIcon } from '../utils/formatUtils.js';

/**
 * 处理文档消息
 * @param {Object} message - 消息对象
 * @param {string|number} chatId - 聊天ID
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function handleDocument(message, chatId, env) {
  try {
    const document = message.document;
    const fileName = document.file_name || `file_${Date.now()}`;
    const mimeType = document.mime_type || 'application/octet-stream';
    const fileIcon = getFileIcon(fileName, mimeType);
    
    // 发送处理中消息
    await sendMessage(chatId, `${fileIcon} 正在处理文件 "${fileName}"...`, env);
    
    // 获取文件信息
    const fileInfo = await getFile(document.file_id, env);
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
    await sendMessage(chatId, `📤 正在上传文件 "${fileName}" (${formatFileSize(fileSize)})...`, env);
    const uploadResult = await uploadToImageBed(fileBuffer, fileName, mimeType, env);
    
    // 提取URL
    const documentUrl = extractUrlFromResult(uploadResult, env.IMG_BED_URL);
    
    if (!documentUrl) {
      throw new Error('无法从上传结果中提取URL');
    }
    
    // 发送结果
    await sendMessage(chatId, `✅ 文件上传成功！\n\n${fileIcon} <b>${fileName}</b>\n📦 ${formatFileSize(fileSize)}\n🔗 <a href="${documentUrl}">${documentUrl}</a>`, env);
  } catch (error) {
    console.error('处理文档时出错:', error);
    await sendMessage(chatId, `❌ 处理文档时出错: ${error.message}`, env);
  }
}