import { Sequelize } from 'sequelize';



const sequelize = new Sequelize(
'airplanmode_harmony_db', 'airplanmode_harmony_db', 'airplanmode_harmony_db', {
  host: 'localhost',
  dialect: 'mysql',
  port: 3306,
  logging: false,
});



export default sequelize;




