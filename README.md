# Pinterest Scraper MVC

Quickstart:

1. `npm install`
2. `PORT=3000 HEADLESS=false node server.js`

Endpoints:
- POST /api/jobs { query, count } -> create job
- GET /api/jobs/:id -> job status/result
- GET /api/search?query=...&count=... -> immediate scraping (not queued)
- GET /api/health -> health check

Notes:
- Replace in-memory store with Redis or DB for production.
- Use puppeteer-extra + stealth and proxies to reduce blocking.
