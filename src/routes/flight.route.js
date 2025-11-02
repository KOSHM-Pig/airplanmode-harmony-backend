import express from 'express';
import { 
  createFlightRecord,
  completeFlightRecord,
  cancelFlightRecord,
  listFlightRecords
} from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FlightRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 飞行记录UUID
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: 用户ID
 *         departure_airport_id:
 *           type: integer
 *           description: 出发机场ID
 *         arrival_airport_id:
 *           type: integer
 *           description: 到达机场ID
 *         departure_time_utc:
 *           type: string
 *           format: date-time
 *           description: 出发时间（UTC）
 *         arrival_time_utc:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: 到达时间（UTC）
 *         status:
 *           type: string
 *           enum: [in_flight, arrived, canceled]
 *           description: 状态（飞行中/已到达/已取消）
 *         distance:
 *           type: number
 *           format: float
 *           description: 航线里程
 */

/**
 * @swagger
 * /flights:
 *   post:
 *     summary: 创建飞行记录
 *     description: 使用 Bearer Token 鉴权，根据当前UTC时间创建飞行记录，默认状态为飞行中。
 *     tags:
 *       - Flight
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distance
 *               - departure
 *               - arrival
 *             properties:
 *               distance:
 *                 type: number
 *                 description: 航线里程（正数）
 *               departure:
 *                 type: object
 *                 required:
 *                   - code
 *                 properties:
 *                   code:
 *                     type: string
 *                     description: 出发机场代码
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: 出发纬度（可选）
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: 出发经度（可选）
 *                   city:
 *                     type: string
 *                     description: 出发城市（可选）
 *               arrival:
 *                 type: object
 *                 required:
 *                   - code
 *                 properties:
 *                   code:
 *                     type: string
 *                     description: 到达机场代码
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: 到达纬度（可选）
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: 到达经度（可选）
 *                   city:
 *                     type: string
 *                     description: 到达城市（可选）
 *     responses:
 *       200:
 *         description: 创建成功，返回记录UUID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - id
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 令牌无效或已过期
 *       404:
 *         description: 机场代码不存在
 */
router.post('/', createFlightRecord);

/**
 * @swagger
 * /flights/complete:
 *   post:
 *     summary: 完成飞行记录
 *     description: 仅记录归属用户可完成，将状态标记为已到达并写入到达时间。
 *     tags:
 *       - Flight
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: 飞行记录UUID
 *     responses:
 *       200:
 *         description: 标记成功
 *       400:
 *         description: 非飞行中记录不可操作或参数错误
 *       401:
 *         description: 令牌无效或已过期
 *       404:
 *         description: 记录不存在或不属于当前用户
 */
router.post('/complete', completeFlightRecord);

/**
 * @swagger
 * /flights/cancel:
 *   post:
 *     summary: 取消飞行记录
 *     description: 仅记录归属用户可取消，将状态标记为已取消。
 *     tags:
 *       - Flight
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: 飞行记录UUID
 *     responses:
 *       200:
 *         description: 取消成功
 *       400:
 *         description: 非飞行中记录不可操作或参数错误
 *       401:
 *         description: 令牌无效或已过期
 *       404:
 *         description: 记录不存在或不属于当前用户
 */
router.post('/cancel', cancelFlightRecord);

/**
 * @swagger
 * /flights:
 *   get:
 *     summary: 分页查询飞行记录
 *     description: 查询当前用户的飞行记录分页数据。
 *     tags:
 *       - Flight
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码（默认1）
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量（默认10，最大100）
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - page
 *                 - pageSize
 *                 - total
 *                 - records
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FlightRecord'
 *       401:
 *         description: 令牌无效或已过期
 */
router.get('/', listFlightRecords);

export default router;