import { verifyJWT, createJWT } from '../utils/jwt.js';
import { APP_JWT_SECRET, APP_JWT_EXPIRES_IN_SECONDS } from '../config/auth.js';
import User from '../models/User.model.js';
import Airport from '../models/Airport.model.js';
import FlightRecord from '../models/FlightRecord.model.js';

// 从Authorization头提取Bearer Token
const extractBearer = (req) => {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

// 验证令牌中间件：签名与过期校验，校验通过直接返回成功
export const verifyToken = (req, res, next) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    verifyJWT(token, APP_JWT_SECRET);
    return res.status(200).json({ success: true, message: '令牌有效' });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 刷新令牌中间件：旧令牌需仍有效，返回新的应用JWT
export const refreshToken = (req, res, next) => {
  try {
    const oldToken = extractBearer(req);
    if (!oldToken) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(oldToken, APP_JWT_SECRET);
    const { iat, exp, ...rest } = payload || {};
    const newToken = createJWT(rest, APP_JWT_SECRET, APP_JWT_EXPIRES_IN_SECONDS);
    return res.status(200).json({ success: true, message: '刷新成功', token: newToken });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期，请重新登录' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 通过JWT获取当前用户昵称
export const getNickname = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }
    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    return res.status(200).json({ success: true, nickname: user.nickname || '' });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 通过JWT修改当前用户昵称
export const updateNickname = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }
    // 改为“请求体 JSON”为主的传递方式，保持最小兼容：体>查询>头部(Base64/明文)
    let newNick = null;
    if (typeof req.body?.nickname === 'string') {
      newNick = String(req.body.nickname).trim();
    }
    if (!newNick && typeof req.query?.nickname === 'string') {
      newNick = String(req.query.nickname).trim();
    }
    if (!newNick) {
      const headerNickB64 = req.headers['x-nickname-base64'];
      if (typeof headerNickB64 === 'string' && headerNickB64.length > 0) {
        try {
          const buf = Buffer.from(headerNickB64, 'base64');
          newNick = buf.toString('utf8').trim();
        } catch (_) {
          // ignore
        }
      }
    }
    if (!newNick) {
      const headerNick = req.headers['x-nickname'] || req.headers['nickname'];
      if (typeof headerNick === 'string' && headerNick.length > 0) {
        const raw = headerNick.trim();
        try {
          newNick = /%[0-9A-Fa-f]{2}/.test(raw) ? decodeURIComponent(raw) : raw;
        } catch (_) {
          newNick = raw;
        }
      }
    }

    if (typeof newNick !== 'string' || !newNick) {
      return res.status(400).json({ message: '缺少或非法昵称（请在请求体JSON传递 nickname）' });
    }
    if (!newNick) {
      return res.status(400).json({ message: '昵称不能为空' });
    }
    if (newNick.length > 32) {
      return res.status(400).json({ message: '昵称过长' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    user.nickname = newNick;
    await user.save();
    return res.status(200).json({ success: true, message: '修改成功', nickname: user.nickname });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 获取用户上一次到达的机场详情
export const getLastArrivalAirport = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const airportId = user.last_arrival_airport_id;
    if (!airportId) {
      return res.status(404).json({ message: '上一次到达的机场不存在' });
    }

    const airport = await Airport.findByPk(airportId);
    if (!airport) {
      return res.status(404).json({ message: '机场记录不存在或已删除' });
    }

    return res.status(200).json({ success: true, airport });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 初始化用户出发机场位置（仅当上一次到达机场为 null 时允许）
export const initDepartureAirport = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (user.last_arrival_airport_id) {
      return res.status(400).json({ message: '已存在上一次到达机场，禁止初始化' });
    }

    const { latitude, longitude, code } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: '缺少或非法机场代码 code' });
    }
    // latitude/longitude 可选，若提供则校验类型
    if (latitude !== undefined && typeof latitude !== 'number') {
      return res.status(400).json({ message: '纬度 latitude 必须为数值' });
    }
    if (longitude !== undefined && typeof longitude !== 'number') {
      return res.status(400).json({ message: '经度 longitude 必须为数值' });
    }

    const airport = await Airport.findOne({ where: { code: code.trim() } });
    if (!airport) {
      return res.status(404).json({ message: '未找到对应机场代码' });
    }

    user.last_arrival_airport_id = airport.id;
    await user.save();

    return res.status(200).json({ success: true, message: '初始化成功', airport });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

export default {
  verifyToken,
  refreshToken,
  getNickname,
  updateNickname,
  getLastArrivalAirport,
  initDepartureAirport,
  // 下面导出飞行记录相关端点在文件底部实现
};

// =========================
// 飞行记录端点实现
// =========================

// 创建飞行记录（默认状态为飞行中）
export const createFlightRecord = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const { departure, arrival, distance } = req.body || {};
    // 兼容扁平参数结构
    const depCode = departure?.code || req.body?.departure_code;
    const arrCode = arrival?.code || req.body?.arrival_code;

    if (typeof depCode !== 'string' || !depCode.trim() || typeof arrCode !== 'string' || !arrCode.trim()) {
      return res.status(400).json({ message: '缺少或非法机场代码（departure.code/arrival.code）' });
    }
    if (typeof distance !== 'number' || !isFinite(distance) || distance <= 0) {
      return res.status(400).json({ message: '缺少或非法里程 distance（需为正数）' });
    }

    const depAirport = await Airport.findOne({ where: { code: depCode.trim() } });
    const arrAirport = await Airport.findOne({ where: { code: arrCode.trim() } });
    if (!depAirport || !arrAirport) {
      return res.status(404).json({ message: '出发或到达机场代码不存在' });
    }

    const nowUtc = new Date();
    const record = await FlightRecord.create({
      user_id: user.id,
      departure_airport_id: depAirport.id,
      arrival_airport_id: arrAirport.id,
      departure_time_utc: nowUtc,
      status: 'in_flight',
      distance,
    });

    return res.status(200).json({ success: true, id: record.id });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 完成飞行记录（标记为已到达）
export const completeFlightRecord = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const { id } = req.body || {};
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ message: '缺少或非法飞行记录UUID id' });
    }

    const record = await FlightRecord.findByPk(id);
    if (!record || record.user_id !== user.id) {
      return res.status(404).json({ message: '记录不存在或不属于当前用户' });
    }
    if (record.status !== 'in_flight') {
      return res.status(400).json({ message: '仅飞行中记录可标记为已到达' });
    }

    record.status = 'arrived';
    record.arrival_time_utc = new Date();
    await record.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 取消飞行记录（标记为已取消）
export const cancelFlightRecord = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const { id } = req.body || {};
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ message: '缺少或非法飞行记录UUID id' });
    }

    const record = await FlightRecord.findByPk(id);
    if (!record || record.user_id !== user.id) {
      return res.status(404).json({ message: '记录不存在或不属于当前用户' });
    }
    if (record.status !== 'in_flight') {
      return res.status(400).json({ message: '仅飞行中记录可取消' });
    }

    record.status = 'canceled';
    record.arrival_time_utc = null;
    await record.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 分页查询当前用户的飞行记录
export const listFlightRecords = async (req, res) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ message: '缺少Authorization头' });
    }
    const payload = verifyJWT(token, APP_JWT_SECRET);
    const unionId = payload?.union_id || payload?.sub;
    if (!unionId) {
      return res.status(400).json({ message: '令牌缺少用户标识' });
    }

    const user = await User.findOne({ where: { union_id: unionId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '10', 10) || 10, 1), 100);
    const offset = (page - 1) * pageSize;

    const { rows, count } = await FlightRecord.findAndCountAll({
      where: { user_id: user.id },
      order: [['departure_time_utc', 'DESC']],
      limit: pageSize,
      offset,
    });

    return res.status(200).json({
      success: true,
      page,
      pageSize,
      total: count,
      records: rows,
    });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 将端点加入默认导出
export default {
  verifyToken,
  refreshToken,
  getNickname,
  updateNickname,
  getLastArrivalAirport,
  initDepartureAirport,
  createFlightRecord,
  completeFlightRecord,
  cancelFlightRecord,
  listFlightRecords,
};