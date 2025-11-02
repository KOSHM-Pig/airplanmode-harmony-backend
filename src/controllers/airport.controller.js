import Airport from '../models/Airport.model.js';
import { Op } from 'sequelize';
import haversineDistance from '../utils/mathUtils.js';


/**
 * 搜索机场
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const searchAirport = async (req, res) => {
  try {
    const { searchText } = req.query; // 接收单个搜索文本
    let airports;

    if (!searchText || searchText.length < 2) {
      return res.status(200).json([]); // 如果搜索文本为空或少于2个字符，返回空数组
    }

    airports = await Airport.findAll({
      where: {
        [Op.or]: [
          {
            code: { // 模糊搜索机场代码
              [Op.like]: `%${searchText.toUpperCase()}%` // 假设机场代码是大写的
            }
          },
          {
            name: { // 模糊搜索机场名称
              [Op.like]: `%${searchText}%`
            }
          }
        ]
      }
    });

    res.status(200).json(airports);
  } catch (error) {
    console.error('搜索机场失败:', error);
    res.status(500).json({ message: '搜索机场失败', error: error.message });
  }
};

/**
 * 搜索圆周附近的机场
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const searchAirportsNearCircle = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude || !radius) {
      return res.status(400).json({ message: '请提供经度、纬度和半径进行搜索' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad) || rad <= 0) {
      return res.status(400).json({ message: '经度、纬度和半径必须是有效的数字，且半径必须大于0' });
    }

    // Define the inner and outer radius for the ring search
    const innerRadius = Math.max(0, rad - 20); // Ensure inner radius is not negative
    const outerRadius = rad + 20;

    const allAirports = await Airport.findAll();

    const filteredAirports = allAirports.filter(airport => {
      const distance = haversineDistance(lat, lon, airport.latitude, airport.longitude);
      return distance >= innerRadius && distance <= outerRadius;
    });

    res.status(200).json(filteredAirports);
  } catch (error) {
    console.error('搜索圆周附近机场失败:', error);
    res.status(500).json({ message: '搜索圆周附近机场失败', error: error.message });
  }
};

export default {
  searchAirport,
  searchAirportsNearCircle,
};