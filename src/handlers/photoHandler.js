import { getFile, getFileDownloadUrl, sendMessage } from '../utils/telegramApi.js';
import { uploadToImageBed, extractUrlFromResult } from '../utils/uploadUtils.js';
import { formatFileSize } from '../utils/formatUtils.js';

/**
 * 处理图片消息
 * @param {Object} message - 消息对象
 * @param {string|number} chatId - 聊天ID
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function handlePhoto(message, chatId, env) {
  try {
    // 发送处理中消息
    await sendMessage(chatId, `🖼️ 正在处理图片...`, env);
    
    // 获取最大尺寸的图片
    const photo = message.photo[message.photo.length - 1];
    const fileId = photo.file_id;
    
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
    
    // 生成文件名
    const fileName = `photo_${Date.now()}.jpg`;
    
    // 上传文件
    await sendMessage(chatId, `📤 正在上传图片 (${formatFileSize(fileSize)})...`, env);
    const uploadResult = await uploadToImageBed(fileBuffer, fileName, 'image/jpeg', env);
    
    // 提取URL
    const imageUrl = extractUrlFromResult(uploadResult, env.IMG_BED_URL);
    
    if (!imageUrl) {
      throw new Error('无法从上传结果中提取URL');
    }
    
    // 发送结果
    await sendMessage(chatId, `✅ 图片上传成功！\n\n🔗 <a href="${imageUrl}">${imageUrl}</a>`, env);
  } catch (error) {
    console.error('处理图片时出错:', error);
    await sendMessage(chatId, `❌ 处理图片时出错: ${error.message}`, env);
  }
}