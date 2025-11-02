import express from 'express';
import authController from '../controllers/auth.controller.js';
import { verifyToken, refreshToken, getNickname, updateNickname, getLastArrivalAirport, initDepartureAirport } from '../middleware/auth.middleware.js';
const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 使用Authorization Code登录
 *     description: 通过华为账号服务的授权码换取应用JWT（有效期30天）。
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
  *             required:
  *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 华为授权码（Authorization Code）
 *     responses:
  *       200:
  *         description: 成功返回应用JWT
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               required:
  *                 - success
  *                 - message
  *                 - token
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 message:
  *                   type: string
  *                   example: 登录成功
  *                 token:
  *                   type: string
  *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: 验证JWT令牌
 *     description: 使用 Bearer Token 校验令牌签名与过期。
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 令牌有效
 *       401:
 *         description: 令牌无效或已过期
 */
router.get('/verify', verifyToken);

/**
 * @swagger
 * /auth/refresh:
 *   get:
 *     summary: 刷新JWT令牌
 *     description: 使用 Bearer Token 验证旧令牌有效并生成新的应用JWT（30天）。
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 刷新成功，返回新的应用JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - token
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 刷新成功
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: 令牌无效或已过期
 */
router.get('/refresh', refreshToken);

/**
 * @swagger
 * /auth/nickname:
 *   get:
 *     summary: 获取自己的昵称
 *     description: 使用 Bearer Token 返回当前用户的昵称。
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - nickname
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 nickname:
 *                   type: string
 *                   example: 飞友A1b2C3
 *       401:
 *         description: 令牌无效或已过期
 *       404:
 *         description: 用户不存在
 */
router.get('/nickname', getNickname);

/**
 * @swagger
* /auth/nickname:
*   post:
*     summary: 修改自己的昵称
*     description: 使用 Bearer Token 进行鉴权，并通过请求体 JSON 传递新的昵称。
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - nickname
*             properties:
*               nickname:
*                 type: string
*                 description: 新的昵称（最长32字符）。
 *     responses:
 *       200:
 *         description: 修改成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - nickname
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 修改成功
 *                 nickname:
 *                   type: string
 *                   example: 飞友Hello01
 *       400:
 *         description: 参数错误（缺少或非法昵称）
 *       401:
 *         description: 令牌无效或已过期
 *       404:
 *         description: 用户不存在
 */
router.post('/nickname', updateNickname);

/**
 * @swagger
 * /auth/last-airport:
 *   get:
 *     summary: 获取上一次到达的机场详情
 *     description: 使用 Bearer Token 获取当前用户上一次到达的机场。如果不存在则返回404。
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功，返回机场模型全部字段
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - airport
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 airport:
 *                   $ref: '#/components/schemas/Airport'
 *       404:
 *         description: 上一次到达的机场不存在或记录缺失
 *       401:
 *         description: 令牌无效或已过期
 */
router.get('/last-airport', getLastArrivalAirport);

/**
 * @swagger
 * /auth/init-departure:
 *   post:
 *     summary: 初始化用户出发机场位置
 *     description: 仅当用户的上一次到达机场为 null 时允许。前端传入经纬度与机场代码，后端在数据库中按代码搜索并将其ID写入用户的“上一次到达的机场”。
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 机场代码。
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: 纬度（可选，仅作配套信息）。
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: 经度（可选，仅作配套信息）。
 *     responses:
 *       200:
 *         description: 初始化成功，返回写入的机场详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - airport
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 初始化成功
 *                 airport:
 *                   $ref: '#/components/schemas/Airport'
 *       400:
 *         description: 参数错误或已存在上一次到达机场，禁止初始化
 *       404:
 *         description: 未找到对应机场代码
 *       401:
 *         description: 令牌无效或已过期
 */
router.post('/init-departure', initDepartureAirport);

export default router;