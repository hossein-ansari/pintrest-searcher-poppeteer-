const { scrapePinterest } = require('./scraperService');
const { downloadImage } = require('./downloadService');

async function scrapeNow(query, count) {
  return await scrapePinterest(query, count);
}
async function downloadNow(res, url) {
  return await downloadImage(res, url);
}

module.exports = { scrapeNow,downloadNow };
