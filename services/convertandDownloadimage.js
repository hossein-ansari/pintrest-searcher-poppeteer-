const puppeteer = require("puppeteer");
const sharp = require("sharp");
const fetch = require("node-fetch");


let browserPromise = null;
async function getBrowser() {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }
    return browserPromise;
}

async function getFirstImageUrlFromGoogle(query) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    
    await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setDefaultNavigationTimeout(30_000);
    const searchUrl = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(query);
    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    
    await page.waitForSelector("img", { timeout: 10_000 }).catch(() => { });
    
    
    let src = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));

        for (const img of imgs) {
            const s = img.src || img.getAttribute("data-src") || img.getAttribute("data-iurl");
            if (!s) continue;
            if (s.startsWith("http") && img.naturalWidth > 50) return s;
        }
        return null;
    });

    if (src) {
        await page.close();
        return src;
    }

    
    try {
        
        const thumbSelectors = [
            "div.isv-r.PNCib a", 
            "div.imgbox a",      
            "a.wXeWr",           
            "img"                
        ];
        let clicked = false;
        for (const sel of thumbSelectors) {
            const el = await page.$(sel);
            if (el) {
                await el.click().catch(() => { });
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            
            const firstImg = await page.$("img");
            if (firstImg) await firstImg.click().catch(() => { });
        }

        
        await page.waitForTimeout(1000);

        
        src = await page.evaluate(() => {
            const previews = Array.from(document.querySelectorAll("img.n3VNCb"));
            for (const p of previews) {
                const s = p.src;
                if (s && s.startsWith("http")) return s;
            }
            
            const imgs = Array.from(document.querySelectorAll("img"));
            for (const img of imgs) {
                const s = img.src;
                if (s && s.startsWith("http") && img.naturalWidth > 50) return s;
            }
            return null;
        });
    } catch (err) {
        
    } finally {
        await page.close();
    }

    return src;
}

async function downloadImageBuffer(url) {
    if (!url) throw new Error("No URL");
    if (url.startsWith("data:")) {
        
        const comma = url.indexOf(",");
        const meta = url.slice(5, comma);
        const b64 = url.slice(comma + 1);
        return Buffer.from(b64, "base64");
    }

    
    const res = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "image/*,*/*;q=0.8",
        },
        
    });

    if (!res.ok) throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function downloadAndConverterImage(req,res) {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).send("Missing query parameter 'q'");

    if (q.length > 200) return res.status(400).send("Query too long");

    try {
        const imgUrl = await getFirstImageUrlFromGoogle(q);
        if (!imgUrl) return res.status(404).send("No image found");

        const originalBuffer = await downloadImageBuffer(imgUrl);
        
        const webpBuffer = await sharp(originalBuffer).webp({ quality: 90 }).toBuffer();

        res.setHeader("Content-Type", "image/webp");
        res.setHeader("Content-Length", webpBuffer.length);
        
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
        return res.send(webpBuffer);
    } catch (err) {
        console.error("Error in /fetch-image:", err);
        return res.status(500).send("Internal Error: " + err.message);
    }
};

module.exports = { downloadAndConverterImage };
