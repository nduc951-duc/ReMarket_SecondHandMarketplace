const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => {
  // Keep startup output simple so local debugging is easy.
  console.log(`Backend listening at http://localhost:${PORT}`);
});
