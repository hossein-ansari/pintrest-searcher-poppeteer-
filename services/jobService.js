const { scrapePinterest } = require('./scraperService');
const { downloadImage } = require('./downloadService');
const { downloadAndConverterImage } = require('./convertandDownloadimage');

async function scrapeNow(query, count) {
  return await scrapePinterest(query, count);
}
async function downloadNow(res, url) {
  return await downloadImage(res, url);
}
async function downloadAndConverterImageNow(req,res) {
  return await downloadAndConverterImage(req,res);
}
async function downloadNow(res, url) {
  return await downloadImage(res, url);
}

module.exports = { scrapeNow,downloadNow ,downloadAndConverterImageNow};
