import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

// 飞行记录模型
const FlightRecord = sequelize.define('FlightRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  departure_airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  arrival_airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  departure_time_utc: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  arrival_time_utc: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  status: {
    type: DataTypes.ENUM('in_flight', 'arrived', 'canceled'),
    allowNull: false,
    defaultValue: 'in_flight',
  },
  distance: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  flight_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  seat_number: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
}, {
  tableName: 'flight_records',
  timestamps: false,
});

export default FlightRecord;