
const puppeteer = require('puppeteer');

async function scrapePinterest(query, maxCount = 20) {
  const headless = (process.env.HEADLESS || 'true').toLowerCase() === 'true';
  const browser = await puppeteer.launch({ headless, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => { });

    const collectFromPage = async () => {
      return await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('img[elementtiming^="grid"]'));
        const urls = nodes.map(img => {
          let src;
          const srcset = img.getAttribute('srcset') || '';
          if (srcset) {
            try {
              const parts = srcset.split(',').map(s => s.trim()).filter(Boolean);
              const last = parts[parts.length - 1];
              if (last) {
                const url = last.split(' ')[0];
                if (url) src = url;
              }
            } catch (e) { }
          }
          console.log(src)
          if (!src) return null;
          if (src.startsWith('//')) return 'https:' + src;
          if (src.startsWith('http')) return src;
          return null;
        }).filter(Boolean);
        return Array.from(new Set(urls));
      });
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
    }

    // dismiss overlays once and re-check
    if (found.size < maxCount) {
      try {
        await page.evaluate(() => {
          const closers = Array.from(document.querySelectorAll('button, a'));
          closers.forEach(el => {
            const t = (el.innerText || '').toLowerCase();
            if (t.includes('not now') || t.includes('dismiss') || t.includes('close') || t.includes('maybe later')) {
              try { el.click(); } catch (e) { /* ignore */ }
            }
          });
        });
        const urls2 = await collectFromPage();
        urls2.forEach(u => { if (u && u.startsWith('http')) found.add(u); });
      } catch (e) { /* ignore */ }
    }

    return Array.from(found).slice(0, maxCount);

  } finally {
    try { await page.close(); } catch (e) { }
    try { await browser.close(); } catch (e) { }
  }
}

module.exports = { scrapePinterest };
