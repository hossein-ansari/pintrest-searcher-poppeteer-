const axios = require('axios');
const mime = require('mime-types');
const path = require('path');
const sanitize = require('sanitize-filename');
const { URL } = require('url');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const sharp = require('sharp');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT = 20000;

async function downloadImage(res, url) {
  try {
    
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: REQUEST_TIMEOUT,
      headers: { 'User-Agent': 'Image-Downloader/1.0' },
      maxContentLength: MAX_FILE_BYTES + 1, 
    });

    const clHeader = response.headers['content-length'];
    const cl = clHeader ? parseInt(clHeader, 10) : NaN;
    if (!isNaN(cl) && cl > MAX_FILE_BYTES) {
      response.data.destroy();
      return res.status(413).json({ error: 'File too large' });
    }

    const contentType = (response.headers['content-type'] || mime.lookup(url) || 'application/octet-stream').toLowerCase();
    const filename = filenameFromResponse(url, response.headers);

    
    let transformer = null;
    let outContentType = contentType;

    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      transformer = sharp().jpeg({
        quality: 85,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      }).withMetadata(false);
      outContentType = 'image/jpeg';
    } else if (contentType.includes('png')) {
      transformer = sharp().png({
        compressionLevel: 9,
        adaptiveFiltering: true
      }).withMetadata(false);
      outContentType = 'image/png';
    } else if (contentType.includes('webp')) {
      
      transformer = sharp().webp({ quality: 85 }).withMetadata(false);
      outContentType = 'image/webp';
    } else if (contentType.includes('gif')) {
      
      transformer = null;
      outContentType = 'image/gif';
    } else if (contentType.startsWith('image/')) {
      
      transformer = sharp().jpeg({
        quality: 90,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      }).withMetadata(false);
      outContentType = 'image/jpeg';
    } else {
      
      transformer = null;
      outContentType = contentType;
    }

    
    res.setHeader('Content-Type', outContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    
    if (!transformer) {
      try {
        await streamPipeline(response.data, res);
      } catch (err) {
        console.error('Stream error passthrough:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Error streaming file' });
        else res.end();
      }
      return;
    }

    
    try {
      
      await streamPipeline(response.data, transformer, res);
    } catch (err) {
      console.error('Stream/transform error:', err);
      
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Error processing image', details: err.message });
      } else {
        try { res.end(); } catch (e) {}
      }
    }
  } catch (err) {
    console.error('Download error:', err.message || err);
    
    if (!res.headersSent) return res.status(502).json({ error: 'Failed to fetch image', details: err.message });
    try { res.end(); } catch (e) {}
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

module.exports = { downloadImage, validateHttpUrl };
