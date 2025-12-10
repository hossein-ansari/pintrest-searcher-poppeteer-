
const puppeteer = require('puppeteer');

async function scrapePinterest(query, maxCount = 20) {
  const headless = (process.env.HEADLESS || 'true').toLowerCase() === 'true';
  const browser = await puppeteer.launch({ headless, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

    const collectFromPage = async () => {
      const imgs = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('img'));
        const urls = nodes.map(img => {
          if (img.src && img.src.startsWith('data:')) return null;
          if (img.src && (img.src.startsWith('http') || img.src.startsWith('//'))) return img.src.startsWith('//') ? 'https:' + img.src : img.src;
          if (img.srcset) {
            try { const parts = img.srcset.split(',').map(s => s.trim()); const last = parts[parts.length-1].split(' ')[0]; if (last && (last.startsWith('http')||last.startsWith('//'))) return last.startsWith('//') ? 'https:'+last: last; } catch(e) { return null; }
          }
          return null;
        }).filter(Boolean);
        return Array.from(new Set(urls));
      });
      return imgs;
    };

    const found = new Set();
    let attempts = 0;
    const maxAttempts = 20;

    while (found.size < maxCount && attempts < maxAttempts) {
      attempts += 1;
      const urls = await collectFromPage();
      urls.forEach(u => { if (u && u.startsWith('http') && u.length > 30) found.add(u); });
      if (found.size >= maxCount) break;
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
      await page.waitForTimeout(1000 + Math.floor(Math.random()*800));
    }

    // try dismiss overlays once
    if (found.size < maxCount) {
      try {
        await page.evaluate(() => {
          const closers = Array.from(document.querySelectorAll('button, a'));
          closers.forEach(el => { const t=(el.innerText||'').toLowerCase(); if(t.includes('not now')||t.includes('dismiss')||t.includes('close')||t.includes('maybe later')) el.click(); });
        });
        await page.waitForTimeout(600);
        const urls2 = await collectFromPage(); urls2.forEach(u=>u&&found.add(u));
      } catch (e) {}
    }

    return Array.from(found).slice(0, maxCount);
  } finally {
    try { await page.close(); } catch (e) {}
    try { await browser.close(); } catch (e) {}
  }
}

module.exports = { scrapePinterest };
