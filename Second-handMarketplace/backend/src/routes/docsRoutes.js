const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('../docs/openapi');

const router = express.Router();

router.get('/openapi.json', (_req, res) => {
  res.status(200).json(openapiDocument);
});

router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'ReMarket API Docs',
    customCss: '.swagger-ui .topbar { display: none; }',
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  }),
);

module.exports = router;
