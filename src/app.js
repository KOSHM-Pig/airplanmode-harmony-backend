import express from 'express'
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import sequelize from './config/database.js';
import './models/index.model.js'; // 导入所有模型
import airportRoutes from './routes/airport.route.js'; // 导入机场路由
import authRoutes from './routes/auth.route.js'; // 导入登录路由
import flightRoutes from './routes/flight.route.js'; // 导入飞行记录路由
const app = express()
const port = 3000

// 解析JSON与表单
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// 测试数据库连接
sequelize.authenticate()
  .then(() => {
    console.log('数据库连接成功');
    sequelize.sync({alter:true}); // 在数据库连接成功后同步模型
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
  });



app.get('/', (req, res) => {
  res.send('Hello World!')
})

// 使用机场路由
app.use('/airports', airportRoutes);

// 使用登录路由
app.use('/auth', authRoutes);

// 使用飞行记录路由
app.use('/flights', flightRoutes);

// Serve Swagger UI
// Swagger UI：开启持久授权，便于保留Bearer令牌
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: { persistAuthorization: true }
}));

// 提供原始OpenAPI规范JSON，便于排查是否包含securitySchemes
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`)
  console.log('Swagger UI: http://localhost:3000/api-docs')
  console.log('Swagger JSON: http://localhost:3000/api-docs.json')
})