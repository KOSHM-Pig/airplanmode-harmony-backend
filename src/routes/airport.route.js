import express from 'express';
import airportController from '../controllers/airport.controller.js';
const router = express.Router();

/**
 * @swagger
 * /airports/search:
 *   get:
 *     summary: 搜索机场
 *     description: 根据机场代码或名称搜索机场信息。
 *     tags:
 *       - Airport
 *     parameters:
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         description: 机场代码或名称 (至少2个字符)
 *         required: true
 *     responses:
 *       200:
 *         description: 成功获取机场列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Airport'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.get('/search', airportController.searchAirport);

/**
 * @swagger
 * /airports/near-circle:
 *   get:
 *     summary: 搜索圆周附近的机场
 *     description: 根据经纬度坐标和半径，搜索圆周（距离中心点半径-20km到半径+20km）附近的机场。
 *     tags:
 *       - Airport
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: 中心点的纬度
 *         required: true
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: 中心点的经度
 *         required: true
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           format: float
 *         description: 圆的半径
 *         required: true
 *     responses:
 *       200:
 *         description: 成功获取圆周附近的机场列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Airport'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.get('/near-circle', airportController.searchAirportsNearCircle);

export default router;
