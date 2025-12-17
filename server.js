const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const PORT = parseInt(process.env.PORT, 10) || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, message: 'Pinterest Scraper MVC API' }));
app.use('/api', routes);



async function start() {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  process.exit(0);
});
