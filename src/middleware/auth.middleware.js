import { verifyJWT, createJWT } from '../utils/jwt.js';
import { APP_JWT_SECRET, APP_JWT_EXPIRES_IN_SECONDS } from '../config/auth.js';
import User from '../models/User.model.js';
import Airport from '../models/Airport.model.js';
import FlightRecord from '../models/FlightRecord.model.js';
import { Op } from 'sequelize';

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

// 默认导出在文件底部统一汇总（避免重复默认导出）

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

    const { departure, arrival, distance, flight_number, seat_number } = req.body || {};
    // 兼容扁平参数结构
    const depCode = departure?.code || req.body?.departure_code;
    const arrCode = arrival?.code || req.body?.arrival_code;

    if (typeof depCode !== 'string' || !depCode.trim() || typeof arrCode !== 'string' || !arrCode.trim()) {
      return res.status(400).json({ message: '缺少或非法机场代码（departure.code/arrival.code）' });
    }
    if (typeof distance !== 'number' || !isFinite(distance) || distance <= 0) {
      return res.status(400).json({ message: '缺少或非法里程 distance（需为正数）' });
    }
    // 校验航班号与座位号
    if (typeof flight_number !== 'string' || !flight_number.trim()) {
      return res.status(400).json({ message: '缺少或非法航班号 flight_number' });
    }
    if (typeof seat_number !== 'string' || !seat_number.trim()) {
      return res.status(400).json({ message: '缺少或非法座位号 seat_number' });
    }
    if (flight_number.trim().length > 20) {
      return res.status(400).json({ message: '航班号过长（最多20字符）' });
    }
    if (seat_number.trim().length > 10) {
      return res.status(400).json({ message: '座位号过长（最多10字符）' });
    }

    const depAirport = await Airport.findOne({ where: { code: depCode.trim() } });
    const arrAirport = await Airport.findOne({ where: { code: arrCode.trim() } });
    if (!depAirport || !arrAirport) {
      return res.status(404).json({ message: '出发或到达机场代码不存在' });
    }

    // 在创建新飞行记录之前，先取消当前用户所有“飞行中”的历史记录
    const [canceledCount] = await FlightRecord.update(
      { status: 'canceled', arrival_time_utc: null },
      { where: { user_id: user.id, status: 'in_flight' } }
    );
    console.log(
      `[FlightRecord][create] 用户(${user.id}) union(${unionId}) 取消历史飞行中记录数量: ${canceledCount}; ` +
      `dep=${depCode?.trim?.()} arr=${arrCode?.trim?.()} distance=${distance} ` +
      `flight_number=${flight_number?.trim?.()} seat_number=${seat_number?.trim?.()}`
    );

    const nowUtc = new Date();
    const record = await FlightRecord.create({
      user_id: user.id,
      departure_airport_id: depAirport.id,
      arrival_airport_id: arrAirport.id,
      departure_time_utc: nowUtc,
      status: 'in_flight',
      distance,
      flight_number: flight_number.trim(),
      seat_number: seat_number.trim(),
    });
    console.log(
      `[FlightRecord][create] 创建成功 id=${record.id} 用户(${user.id}) union(${unionId}) ` +
      `dep_id=${depAirport.id} arr_id=${arrAirport.id} status=${record.status}`
    );

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
    console.log(
      `[FlightRecord][complete] 完成记录 id=${record.id} 用户(${user.id}) union(${unionId}) ` +
      `新状态=${record.status} 到达时间UTC=${record.arrival_time_utc?.toISOString?.()}`
    );
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
    console.log(
      `[FlightRecord][cancel] 取消记录 id=${record.id} 用户(${user.id}) union(${unionId}) 新状态=${record.status}`
    );
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

  // 解析查询参数：range 与 status
  const range = String(req.query.range || 'all').toLowerCase();
  const status = req.query.status ? String(req.query.status).toLowerCase() : null;

  const validRanges = new Set(['all', 'day', 'week', 'month']);
  const validStatuses = new Set(['in_flight', 'arrived', 'canceled']);
  if (!validRanges.has(range)) {
    return res.status(400).json({ message: '非法时间范围 range（可选：all/day/week/month）' });
  }
  if (status && !validStatuses.has(status)) {
    return res.status(400).json({ message: '非法状态 status（可选：in_flight/arrived/canceled）' });
  }

  // 计算UTC时间范围（按出发时间筛选）
  let timeWhere = {};
  if (range !== 'all') {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    let startUtc, endUtc;
    if (range === 'day') {
      startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
      endUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
    } else if (range === 'week') {
      const weekDay = now.getUTCDay(); // 0=Sunday
      const mondayOffset = (weekDay + 6) % 7; // ISO week start Monday
      startUtc = new Date(Date.UTC(y, m, d - mondayOffset, 0, 0, 0, 0));
      endUtc = new Date(Date.UTC(y, m, d - mondayOffset + 7, 0, 0, 0, 0));
    } else if (range === 'month') {
      startUtc = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      endUtc = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
    }
    timeWhere = { departure_time_utc: { [Op.gte]: startUtc, [Op.lt]: endUtc } };
  }

  const where = { user_id: user.id, ...timeWhere };
  if (status) where.status = status;

  const { rows, count } = await FlightRecord.findAndCountAll({
    where,
    order: [['departure_time_utc', 'DESC']],
    limit: pageSize,
    offset,
  });
    // 构建机场详情映射，返回经纬度、城市与代码
    const depIds = rows.map(r => r.departure_airport_id).filter(id => !!id);
    const arrIds = rows.map(r => r.arrival_airport_id).filter(id => !!id);
    const allIds = Array.from(new Set([...depIds, ...arrIds]));
    const airports = allIds.length > 0 ? await Airport.findAll({ where: { id: allIds } }) : [];
    const airportMap = new Map(airports.map(a => [a.id, a]));

    const viewRows = rows.map(r => {
      const dep = airportMap.get(r.departure_airport_id);
      const arr = airportMap.get(r.arrival_airport_id);
      return {
        id: r.id,
        departure_time_utc: r.departure_time_utc,
        arrival_time_utc: r.arrival_time_utc,
        status: r.status,
        distance: r.distance,
        flight_number: r.flight_number || null,
        seat_number: r.seat_number || null,
        departure: dep ? {
          code: dep.code,
          city: dep.city,
          latitude: dep.latitude,
          longitude: dep.longitude,
        } : null,
        arrival: arr ? {
          code: arr.code,
          city: arr.city,
          latitude: arr.latitude,
          longitude: arr.longitude,
        } : null,
      };
    });

  console.log(
    `[FlightRecord][list] 用户(${user.id}) union(${unionId}) range=${range} status=${status || 'ALL'} ` +
    `page=${page} pageSize=${pageSize} total=${count} 返回=${viewRows.length}`
  );

    return res.status(200).json({
      success: true,
      page,
      pageSize,
      total: count,
      records: viewRows,
    });
  } catch (error) {
    const msg = /过期/.test(error.message) ? '令牌已过期' : '令牌无效';
    return res.status(401).json({ message: msg });
  }
};

// 飞行统计：已到达记录的总里程与次数
export const getFlightStats = async (req, res) => {
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

    const where = { user_id: user.id, status: 'arrived' };
    const totalKm = await FlightRecord.sum('distance', { where }) || 0;
    const flightsCount = await FlightRecord.count({ where });

    console.log(
      `[FlightRecord][stats] 用户(${user.id}) union(${unionId}) arrived 总里程=${totalKm} 次数=${flightsCount}`
    );

    return res.status(200).json({ success: true, total_km: totalKm, flights_count: flightsCount });
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
  getFlightStats,
};