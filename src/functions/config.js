import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let rawConfig = {};
try {
  const data = fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8');
  rawConfig = JSON.parse(data);
} catch (e) {
  rawConfig = {};
}

const config = rawConfig ?? {};

export const USER_AGENT = config.UserAgent || 'SegmentDownloader/1.0';
export const META_FILENAME = config.MetaFile || 'meta.json';
export const MINIMUM_SEGMENT_BYTES = config.MinimumSegmentBytes || 1 * 1024 * 1024;
export const REDIRECT_LIMIT = config.RedirectLimit || 5;
export const PERSIST_INTERVAL_MS = config.PersistInterval || 1000;
export const RETRY_OPTIONS = {
  MAX: config.RETRIES?.MAX ?? 5,
  DELAY: config.RETRIES?.DELAY ?? 500,
  REFRESH: config.RETRIES?.REFRESH ?? 250
};
export const PART_FILE_PREFIX = 'part-';
