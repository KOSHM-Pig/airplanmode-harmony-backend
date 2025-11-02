import { createJWT } from '../utils/jwt.js';
import { APP_JWT_SECRET, APP_JWT_EXPIRES_IN_SECONDS } from '../config/auth.js';
import User from '../models/User.model.js';

// 华为账号服务令牌接口与固定凭证（不使用.env）
const HW_TOKEN_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token';
const CLIENT_ID = '6917585859545007440';
const CLIENT_SECRET = '1b82216080f6bf2ff8318a06c186e6e47ee5f16e73a7aba9c02349f7ea230499';

// 应用级JWT签名密钥与过期时间来自配置

// 解析凭证接口（获取 union_id/open_id 等）
const HW_TOKEN_INFO_URL = 'https://oauth-api.cloud.huawei.com/rest.php?nsp_fmt=JSON&nsp_svc=huawei.oauth2.user.getTokenInfo';

const parseTokenInfo = async (accessToken) => {
  const body = new URLSearchParams();
  body.append('access_token', accessToken);
  body.append('open_id', 'OPENID');

  const resp = await fetch(HW_TOKEN_INFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const rawText = await resp.text();
  let json = null;
  try { json = JSON.parse(rawText); } catch (_) {}

  // 华为该接口可能始终200，但通过NSP_STATUS或body.error表示异常
  const nspStatus = resp.headers.get('NSP_STATUS');
  if (nspStatus || (json && json.error)) {
    const errMsg = json?.error || 'token 解析失败';
    const code = nspStatus ? Number(nspStatus) : 400;
    const error = new Error(errMsg);
    error.code = code;
    error.raw = rawText;
    throw error;
  }
  return json;
};

/**
 * 使用Authorization Code登录，生成应用JWT（有效期30天）
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const login = async (req, res) => {
  try {
    const { code } = req.body || {};

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: '缺少必须参数：code' });
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('supportAlg', 'PS256');

    const resp = await fetch(HW_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const rawText = await resp.text();
    let data = null;
    try { data = JSON.parse(rawText); } catch (_) {}

    if (!resp.ok) {
      // 透传华为返回的错误码信息，便于前端/服务侧排查
      return res.status(resp.status).json({ message: '华为账号服务调用失败', ...(data || { raw: rawText }) });
    }

    if (!data || !data.access_token) {
      return res.status(500).json({ message: '未获取到access_token', data });
    }

    // 解析凭证，获取 union_id/open_id 等
    let info;
    try {
      info = await parseTokenInfo(data.access_token);
    } catch (e) {
      const status = Number(e.code) || 400;
      return res.status(status).json({ message: '解析凭证失败', error: e.message, raw: e.raw });
    }

    const unionId = info?.union_id;
    const openId = info?.open_id;
    if (!unionId) {
      return res.status(500).json({ message: '未获取到union_id，无法唯一标识用户', info });
    }

    // 查找或创建用户（以 union_id 唯一）
    const [user] = await User.findOrCreate({
      where: { union_id: unionId },
      defaults: { union_id: unionId, open_id: openId, provider: 'huawei' },
    });
    // 如有 open_id 变化则更新
    if (openId && user.open_id !== openId) {
      user.open_id = openId;
      await user.save();
    }

    // 生成应用级JWT（30天）
    const appToken = createJWT(
      {
        sub: unionId,
        union_id: unionId,
        open_id: openId || '',
        provider: 'huawei',
        scope: info?.scope || data.scope || '',
      },
      APP_JWT_SECRET,
      APP_JWT_EXPIRES_IN_SECONDS
    );

    // 调试输出：用户登录成功
    console.log(`[Auth] 用户登录成功: union_id=${unionId}, open_id=${openId || ''}, nickname=${user.nickname || ''}`);

    return res.status(200).json({
      success: true,
      message: '登录成功',
      token: appToken,
    });
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ message: '登录失败', error: error.message });
  }
};

export default {
  login,
};