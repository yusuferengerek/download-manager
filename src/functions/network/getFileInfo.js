import http from 'http';
import https from 'https';
import { REDIRECT_LIMIT, USER_AGENT } from '../config.js';

function buildHeadOptions(targetUrl) {
  const parsed = new URL(targetUrl);
  return {
    method: 'HEAD',
    hostname: parsed.hostname,
    port: parsed.port,
    path: `${parsed.pathname}${parsed.search}`,
    headers: {
      'User-Agent': USER_AGENT
    }
  };
}

export async function getFileInfo(url, redirectCount = 0) {
  if (redirectCount > REDIRECT_LIMIT) {
    throw new Error('Too many redirects while resolving file info');
  }
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;
  const options = buildHeadOptions(url);
  return new Promise((resolve, reject) => {
    const req = lib.request(options, async res => {
      const { statusCode } = res;
      if (statusCode && statusCode >= 300 && statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume();
        try {
          const info = await getFileInfo(nextUrl, redirectCount + 1);
          resolve(info);
        } catch (err) {
          reject(err);
        }
        return;
      }
      if (!statusCode || statusCode >= 400) {
        reject(new Error(`HEAD request failed with status ${statusCode || 'unknown'}`));
        return;
      }
      const len = Number(res.headers['content-length']);
      if (!Number.isFinite(len) || len < 0) {
        reject(new Error('Server did not provide a valid Content-Length header'));
        return;
      }
      const acceptRanges = String(res.headers['accept-ranges'] || '').toLowerCase();
      if (!acceptRanges.includes('bytes')) {
        reject(new Error('Server does not support range requests (Accept-Ranges: bytes required)'));
        return;
      }
      resolve({
        url,
        size: len,
        acceptRanges: res.headers['accept-ranges'],
        etag: res.headers.etag || null,
        lastModified: res.headers['last-modified'] || null
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('HEAD request timeout'));
    });
    req.end();
  });
}
