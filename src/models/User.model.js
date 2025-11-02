import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

// 简约版用户模型（以 UnionID 为唯一标识）
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  union_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  open_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'huawei',
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // 上一次到达的机场外键（允许为 null）
  last_arrival_airport_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'users',
  timestamps: false,
});

// 生成默认昵称：飞友XXXXXX（英文字母与数字）
const generateNickname = () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `飞友${code}`;
};

// 创建时若未提供nickname，则生成默认值
User.addHook('beforeCreate', (user) => {
  if (!user.nickname) {
    user.nickname = generateNickname();
  }
});

export default User;