const { scrapePinterest } = require('./scraperService');

async function scrapeNow(query, count) {
  return await scrapePinterest(query, count);
}

module.exports = { scrapeNow };
