import fs from 'fs';
import http from 'http';
import https from 'https';
import { pipeline } from 'stream';
import { PERSIST_INTERVAL_MS, REDIRECT_LIMIT, USER_AGENT } from '../config.js';

function buildRequestOptions(targetUrl, rangeStart, rangeEnd) {
  const parsed = new URL(targetUrl);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    path: `${parsed.pathname}${parsed.search}`,
    method: 'GET',
    headers: {
      Range: `bytes=${rangeStart}-${rangeEnd}`,
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'identity',
      Connection: 'keep-alive'
    }
  };
}

function isRedirect(statusCode) {
  return Boolean(statusCode && [301, 302, 303, 307, 308].includes(statusCode));
}

export async function performSegmentRequest(
  initialUrl,
  rangeStart,
  rangeEnd,
  segment,
  meta,
  partPath,
  persistMetadata,
  abort
) {
  const totalLength = Math.max(0, segment.end - segment.start + 1);
  let currentUrl = initialUrl;
  let redirects = 0;
  while (true) {
    if (abort.cancelled) {
      throw abort.reason;
    }
    const result = await new Promise((resolve, reject) => {
      let settled = false;
      const safeResolve = value => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };
      const safeReject = err => {
        if (settled) {
          return;
        }
        settled = true;
        reject(err);
      };
      const options = buildRequestOptions(currentUrl, rangeStart, rangeEnd);
      const lib = options.protocol === 'https:' ? https : http;
      const req = lib.request(options, res => {
        if (isRedirect(res.statusCode)) {
          if (!res.headers.location) {
            safeReject(new Error('Redirect response missing Location header'));
            return;
          }
          const nextUrl = new URL(res.headers.location, currentUrl).toString();
          res.resume();
          req.destroy();
          safeResolve({ redirect: nextUrl });
          return;
        }
        if (res.statusCode !== 206) {
          res.resume();
          safeReject(
            new Error(
              `Unexpected status ${res.statusCode} for segment ${segment.index}; expected 206`
            )
          );
          return;
        }
        const remaining = totalLength - segment.downloaded;
        if (remaining <= 0) {
          res.resume();
          segment.completed = true;
          persistMetadata(meta).then(
            () => safeResolve({ done: true }),
            safeReject
          );
          return;
        }
        let lastPersist = Date.now();
        const writeStream = fs.createWriteStream(partPath, {
          flags: 'r+',
          start: segment.downloaded
        });
        let removeCancel = abort.onCancel(err => {
          req.destroy(err || new Error('Download cancelled'));
          writeStream.destroy(err || new Error('Download cancelled'));
        });
        const clearCancel = () => {
          if (removeCancel) {
            removeCancel();
            removeCancel = null;
          }
        };
        req.on('error', err => {
          clearCancel();
          writeStream.destroy();
          safeReject(err);
        });
        writeStream.on('error', err => {
          clearCancel();
          req.destroy();
          safeReject(err);
        });
        res.on('aborted', () => {
          clearCancel();
          writeStream.destroy();
          safeReject(new Error('Connection aborted'));
        });
        res.on('data', chunk => {
          segment.downloaded += chunk.length;
          const now = Date.now();
          if (now - lastPersist >= PERSIST_INTERVAL_MS) {
            lastPersist = now;
            persistMetadata(meta).catch(() => {});
          }
        });
        pipeline(res, writeStream, err => {
          clearCancel();
          if (err) {
            if (abort.cancelled) {
              safeReject(abort.reason || err);
            } else {
              persistMetadata(meta).finally(() => safeReject(err));
            }
            return;
          }
          if (segment.downloaded > totalLength) {
            persistMetadata(meta).finally(() =>
              safeReject(new Error(`Segment ${segment.index} exceeded expected length`))
            );
            return;
          }
          if (segment.downloaded < totalLength) {
            persistMetadata(meta).finally(() =>
              safeReject(new Error(`Segment ${segment.index} incomplete; retrying`))
            );
            return;
          }
          segment.completed = true;
          persistMetadata(meta).then(
            () => safeResolve({ done: true }),
            safeReject
          );
        });
      });
      req.setTimeout(20000, () => req.destroy(new Error('Segment request timeout')));
      req.on('error', safeReject);
      req.end();
    });
    if (result && result.redirect) {
      redirects += 1;
      if (redirects > REDIRECT_LIMIT) {
        throw new Error('Too many redirects while downloading segment');
      }
      currentUrl = result.redirect;
      continue;
    }
    if (result && result.done) {
      return;
    }
  }
}
