const app = require('./app');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const PUBLIC_API_URL = process.env.VITE_API_URL || `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`Server running on ${PUBLIC_API_URL}`);
});
try {
  require('./jobs/reminder24h').schedule();
  require('./jobs/reminder3h').schedule();
  require('./jobs/postEventThanks').schedule();
} catch (_) {}
