// 认证相关配置（可接入环境变量，默认回退到内置值）
export const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'airplanmode-harmony-app-secret-please-change';
export const APP_JWT_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60; // 默认30天

export default {
  APP_JWT_SECRET,
  APP_JWT_EXPIRES_IN_SECONDS,
};