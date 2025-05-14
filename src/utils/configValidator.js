/**
 * 验证环境配置
 * @param {Object} env - 环境变量对象
 * @returns {Object} - 验证结果
 */
export function validateConfig(env) {
  const requiredVars = ['IMG_BED_URL', 'BOT_TOKEN'];
  const missingVars = requiredVars.filter(varName => !env[varName]);
  
  if (missingVars.length > 0) {
    return {
      valid: false,
      message: `必要的环境变量 (${missingVars.join(', ')}) 未配置`
    };
  }
  
  return { valid: true };
}