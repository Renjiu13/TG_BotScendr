/**
 * 发送消息到Telegram
 * @param {string|number} chatId - 聊天ID
 * @param {string} text - 消息文本
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} - API响应
 */
export async function sendMessage(chatId, text, env) {
  const BOT_TOKEN = env.BOT_TOKEN;
  const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const response = await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
  return await response.json();
}

/**
 * 获取文件信息
 * @param {string} fileId - 文件ID
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} - 文件信息
 */
export async function getFile(fileId, env) {
  const BOT_TOKEN = env.BOT_TOKEN;
  const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const response = await fetch(`${API_URL}/getFile?file_id=${fileId}`);
  return await response.json();
}

/**
 * 获取文件下载URL
 * @param {string} filePath - 文件路径
 * @param {Object} env - 环境变量
 * @returns {string} - 文件下载URL
 */
export function getFileDownloadUrl(filePath, env) {
  const BOT_TOKEN = env.BOT_TOKEN;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}