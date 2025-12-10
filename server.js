const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const PORT = parseInt(process.env.PORT, 10) || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.get('/', (req, res) => res.json({ ok: true, message: 'Pinterest Scraper MVC API' }));

async function start() {
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  process.exit(0);
});
