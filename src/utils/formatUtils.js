/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} - 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 获取文件类型图标
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME类型
 * @returns {string} - 文件类型图标
 */
export function getFileIcon(filename, mimeType) {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('msword') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('text/')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    if (mimeType.includes('html')) return '🌐';
    if (mimeType.includes('application/x-msdownload') || mimeType.includes('application/octet-stream')) return '⚙️';
  }
  
  if (filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'heif', 'avif'].includes(ext)) {
      return '🖼️';
    }
    
    // 视频文件
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'mpeg', 'mpg', 'ts'].includes(ext)) {
      return '🎬';
    }
    
    // 音频文件
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'mid', 'midi'].includes(ext)) {
      return '🎵';
    }
    
    // 文档文件
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'md', 'csv', 'json', 'xml'].includes(ext)) {
      return '📝';
    }
    
    // 压缩文件
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
      return '🗜️';
    }
    
    // 可执行文件
    if (['exe', 'msi', 'apk', 'app', 'dmg', 'iso'].includes(ext)) {
      return '⚙️';
    }
    
    // 网页文件
    if (['html', 'htm', 'css', 'js'].includes(ext)) {
      return '🌐';
    }
    
    // 字体文件
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
      return '🔤';
    }
    
    // 3D和设计文件
    if (['obj', 'fbx', 'blend', 'stl', 'psd', 'ai', 'eps', 'sketch', 'fig'].includes(ext)) {
      return '🎨';
    }
    
    // 其他常见文件
    if (['torrent', 'srt', 'vtt', 'ass', 'ssa'].includes(ext)) {
      return '📄';
    }
  }
  
  return '📄'; // 默认文件图标
}