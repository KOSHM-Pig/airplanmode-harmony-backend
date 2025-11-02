import crypto from 'crypto';

// 将标准Base64转换为URL安全的Base64
const toBase64Url = (base64) => base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// Base64URL编码字符串或Buffer
const base64urlEncode = (input) => {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return toBase64Url(buf.toString('base64'));
};

// Base64URL编码JSON对象
const base64urlEncodeJSON = (obj) => base64urlEncode(JSON.stringify(obj));

// 使用HS256签名生成JWT字符串
const signHS256 = (header, payload, secret) => {
  const h = base64urlEncodeJSON(header);
  const p = base64urlEncodeJSON(payload);
  const data = `${h}.${p}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64');
  const s = toBase64Url(signature);
  return `${data}.${s}`;
};

export const createJWT = (payload, secret, expiresInSeconds = 30 * 24 * 60 * 60) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const pl = { ...payload, iat: now, exp: now + expiresInSeconds };
  return signHS256(header, pl, secret);
};

// 仅解码payload（不校验签名），用于从第三方ID Token提取字段
export const decodeJwtWithoutVerify = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const json = Buffer.from(b64 + pad, 'base64').toString();
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

// 验证JWT（HS256），校验签名与过期时间，返回payload
export const verifyJWT = (token, secret) => {
  if (!token || typeof token !== 'string') {
    throw new Error('token 缺失');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('token 结构错误');
  }

  const [hB64, pB64, sB64] = parts;

  // 解析header
  const hBase64 = hB64.replace(/-/g, '+').replace(/_/g, '/');
  const hPad = hBase64.length % 4 ? '='.repeat(4 - (hBase64.length % 4)) : '';
  const headerJson = Buffer.from(hBase64 + hPad, 'base64').toString();
  let header;
  try { header = JSON.parse(headerJson); } catch (_) { throw new Error('header 非法'); }
  if (header.alg !== 'HS256') {
    throw new Error('不支持的算法');
  }

  // 计算签名并比对
  const data = `${hB64}.${pB64}`;
  const expectedSig = toBase64Url(
    crypto.createHmac('sha256', secret).update(data).digest('base64')
  );
  if (expectedSig !== sB64) {
    throw new Error('签名无效');
  }

  // 解析payload
  const pBase64 = pB64.replace(/-/g, '+').replace(/_/g, '/');
  const pPad = pBase64.length % 4 ? '='.repeat(4 - (pBase64.length % 4)) : '';
  const payloadJson = Buffer.from(pBase64 + pPad, 'base64').toString();
  let payload;
  try { payload = JSON.parse(payloadJson); } catch (_) { throw new Error('payload 非法'); }

  // 校验过期
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now >= payload.exp) {
    throw new Error('token 已过期');
  }

  return payload;
};

export default createJWT;