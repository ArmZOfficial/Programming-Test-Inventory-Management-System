require('dotenv').config();
const app = require('./index');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('Inventory API running on http://localhost:' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/api/health');
});
