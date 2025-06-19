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

  console.log(`文件上传请求 URL: ${uploadUrl.toString()}`);

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  const responseText = await uploadResponse.text();
  console.log('上传原始响应:', responseText);

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
    if (imgBedUrl && (imgBedUrl.startsWith('https://') || imgBedUrl.startsWith('http://'))) {
      baseUrl = new URL(imgBedUrl).origin;
    }
  } catch (e) {
    console.error("无法解析 IMG_BED_URL:", imgBedUrl, e);
  }

  if (typeof result === 'string' && result.includes("The string did not match the expected pattern")) {
    console.error("遇到模式匹配错误，可能是文件扩展名问题");
    const urlMatch = result.match(/(https?:\/\/[^"]+)/);
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

/**
 * 上传文件到 WebDAV 服务器 (AList)
 * @param {ArrayBuffer} fileBuffer - 文件数据
 * @param {string} fileName - 文件名
 * @param {string} mimeType - MIME类型
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadToWebDAV(fileBuffer, fileName, mimeType, env) {
  const WEBDAV_URL = env.WEBDAV_URL;
  const WEBDAV_USERNAME = env.WEBDAV_USERNAME;
  const WEBDAV_PASSWORD = env.WEBDAV_PASSWORD;
  const WEBDAV_PATH = env.WEBDAV_PATH || '/';
  const WEBDAV_PUBLIC_URL = env.WEBDAV_PUBLIC_URL;
  
  if (!WEBDAV_URL) {
    throw new Error('未配置 WebDAV URL');
  }

  let uploadPath = `${WEBDAV_URL}`;
  if (!uploadPath.endsWith('/')) uploadPath += '/';
  
  let customPath = WEBDAV_PATH;
  if (customPath.startsWith('/')) customPath = customPath.substring(1);
  if (customPath && !customPath.endsWith('/')) customPath += '/';
  
  uploadPath += customPath + fileName;
  
  console.log(`WebDAV 上传路径: ${uploadPath}`);
  
  const headers = {};
  if (WEBDAV_USERNAME && WEBDAV_PASSWORD) {
    const authString = `${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`;
    const base64Auth = btoa(authString);
    headers['Authorization'] = `Basic ${base64Auth}`;
  }
  headers['Content-Type'] = mimeType;
  
  try {
    const response = await fetch(uploadPath, {
      method: 'PUT',
      headers: headers,
      body: fileBuffer
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WebDAV 上传失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    let publicUrl = '';
    if (WEBDAV_PUBLIC_URL) {
      publicUrl = WEBDAV_PUBLIC_URL;
      if (!publicUrl.endsWith('/')) publicUrl += '/';
      publicUrl += customPath + fileName;
    } else {
      publicUrl = uploadPath;
    }
    
    return {
      success: true,
      url: publicUrl
    };
  } catch (error) {
    console.error('WebDAV 上传错误:', error);
    throw error;
  }
}

/**
 * 根据配置选择合适的上传方法，添加重试限制和错误处理
 * @param {ArrayBuffer} fileBuffer - 文件数据
 * @param {string} fileName - 文件名
 * @param {string} mimeType - MIME类型
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadFile(fileBuffer, fileName, mimeType, env) {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      if (env.UPLOAD_METHOD === 'webdav' && env.WEBDAV_URL) {
        return await uploadToWebDAV(fileBuffer, fileName, mimeType, env);
      } else {
        return await uploadToImageBed(fileBuffer, fileName, mimeType, env);
      }
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`上传失败 (尝试 ${retryCount}/${maxRetries}):`, error.message);

      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
      }
    }
  }

  throw new Error(`上传失败，已重试 ${maxRetries} 次: ${lastError.message}`);
}
