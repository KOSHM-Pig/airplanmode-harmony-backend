/**
 * @swagger
 * components:
 *   schemas:
 *     Airport:
 *       type: object
 *       required:
 *         - code
 *         - name
 *         - city
 *         - latitude
 *         - longitude
 *         - region
 *       properties:
 *         code:
 *           type: string
 *           description: 机场代码
 *           example: "TNM"
 *         name:
 *           type: string
 *           description: 机场名称
 *           example: "Teniente R. Marsh Airport"
 *         city:
 *           type: string
 *           description: 机场所在城市
 *           example: "Villa Las Estrellas"
 *         latitude:
 *           type: number
 *           format: float
 *           description: 机场纬度
 *           example: -62.1906
 *         longitude:
 *           type: number
 *           format: float
 *           description: 机场经度
 *           example: -58.9867
 *         region:
 *           type: string
 *           description: 机场所在区域
 *           example: "Antarctica"
 */

//定义机场模型
import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

/**
 * 机场数据示例
 *     {
      "code": "TNM",
      "name": "Teniente R. Marsh Airport",
      "city": "Villa Las Estrellas",
      "latitude": -62.1906,
      "longitude": -58.9867
    }
 */
const Airport = sequelize.define('Airport', {
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    region: {
        type: DataTypes.STRING,
        allowNull: false,
    }
},{
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    tableName: 'airports',
    timestamps: false,
});

export default Airport;
