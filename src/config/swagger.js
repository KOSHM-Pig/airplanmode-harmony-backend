import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Airplane Mode Harmony API',
      version: '1.0.0',
      description: 'API documentation for the Airplane Mode Harmony backend application',
    },
    // 默认所有接口需要Bearer鉴权，特例（如登录）在各自路径用 security: [] 覆盖
    security: [
      {
        bearerAuth: []
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '本地环境',
      },
      {
        url: 'https://harmonybackendtest.airplanmode.com',
        description: '测试环境',
      }
    ],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;