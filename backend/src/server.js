const app = require('./app');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});