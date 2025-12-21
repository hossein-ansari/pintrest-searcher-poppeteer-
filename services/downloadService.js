const axios = require('axios');
const mime = require('mime-types');
const path = require('path');
const sanitize = require('sanitize-filename');
const { URL } = require('url');
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT = 20000;

async function downloadImage(res,url) {

    try {
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: REQUEST_TIMEOUT,
            headers: { 'User-Agent': 'Image-Downloader/1.0' }
        });

        const cl = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : NaN;
        if (!isNaN(cl) && cl > MAX_FILE_BYTES) {
            response.data.destroy();
            return res.status(413).json({ error: 'File too large' });
        }

        const contentType = response.headers['content-type'] || mime.lookup(url) || 'application/octet-stream';
        const filename = filenameFromResponse(url, response.headers);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        response.data.pipe(res);
        response.data.on('end', () => {

        });
        response.data.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Error streaming file' });
            else res.end();
        });
    } catch (err) {
        console.error('Download error:', err.message || err);
        return res.status(502).json({ error: 'Failed to fetch image', details: err.message });
    }
}


function filenameFromResponse(url, headers) {

    const cd = headers['content-disposition'];
    if (cd) {
        const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
        if (match && match[1]) {
            return sanitize(match[1].trim());
        }
    }

    try {
        const u = new URL(url);
        const base = path.basename(u.pathname) || 'image';
        return sanitize(base.split('?')[0]) || 'image';
    } catch (e) {
        return 'image';
    }
}
async function validateHttpUrl(s) {
    try {
        const url = new URL(s);
        if (!['http:', 'https:'].includes(url.protocol)) return false;

        return true;
    } catch (e) {
        return false;
    }
}
module.exports = { downloadImage,validateHttpUrl };
