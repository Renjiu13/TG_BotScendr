/**
 * 上传文件到图床
 * @param {ArrayBuffer} fileBuffer - 文件数据
 * @param {string} fileName - 文件名
 * @param {string} mimeType - MIME类型
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadToImageBed(fileBuffer, fileName, mimeType, env) {
  const IMG_BED_URL = env.IMG_BED_URL;
  const AUTH_CODE = env.AUTH_CODE;
  
  const formData = new FormData();
  formData.append('file', new File([fileBuffer], fileName, { type: mimeType }));

  const uploadUrl = new URL(IMG_BED_URL);
  uploadUrl.searchParams.append('returnFormat', 'full');

  if (AUTH_CODE) {
    uploadUrl.searchParams.append('authCode', AUTH_CODE);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  const responseText = await uploadResponse.text();

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return responseText;
  }
}

/**
 * 从图床返回结果中提取URL
 * @param {Object|string} result - 上传结果
 * @param {string} imgBedUrl - 图床基础URL
 * @returns {string} - 提取的URL
 */
export function extractUrlFromResult(result, imgBedUrl) {
  let url = '';
  let baseUrl = 'https://your.default.domain'; // 提供一个备用基础URL
  try {
    if (imgBedUrl && (imgBedUrl.startsWith('https://') || imgBedUrl.startsWith('http://'))){
      baseUrl = new URL(imgBedUrl).origin;
    }
  } catch (e) {
    console.error("无法解析 IMG_BED_URL:", imgBedUrl, e);
  }

  if (typeof result === 'string' && result.includes("The string did not match the expected pattern")) {
    console.error("遇到模式匹配错误，可能是文件扩展名问题");
    const urlMatch = result.match(/(https?:\/\/[^\"]+)/);
    if (urlMatch) {
      return urlMatch[0];
    }
  }

  if (Array.isArray(result) && result.length > 0) {
    const item = result[0];
    if (item.url) url = item.url;
    else if (item.src) url = item.src.startsWith('http') ? item.src : `${baseUrl}${item.src}`;
    else if (typeof item === 'string') url = item.startsWith('http') ? item : `${baseUrl}/file/${item}`;
  } else if (result && typeof result === 'object') {
    if (result.url) url = result.url;
    else if (result.src) url = result.src.startsWith('http') ? result.src : `${baseUrl}${result.src}`;
    else if (result.file) url = `${baseUrl}/file/${result.file}`;
    else if (result.data && result.data.url) url = result.data.url;
  } else if (typeof result === 'string') {
    if (result.startsWith('http://') || result.startsWith('https://')) {
      url = result;
    } else {
      url = `${baseUrl}/file/${result}`;
    }
  }
  return url;
}
