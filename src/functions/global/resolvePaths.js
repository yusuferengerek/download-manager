import path from 'path';

function sanitizeName(name) {
  const cleaned = name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'download.bin';
  return cleaned;
}

function extractFileNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname = (parsed.pathname || '').replace(/\/+$/, '');
    const candidate = path.basename(pathname);
    return candidate || 'download.bin';
  } catch {
    return 'download.bin';
  }
}

export function resolveDownloadPaths(url, outputArg) {
  const fallbackName = extractFileNameFromUrl(url);
  const fileName = sanitizeName(outputArg || fallbackName);
  const downloadDir = path.join(process.cwd(), fileName);
  const outputPath = path.join(downloadDir, fileName);
  return { fileName, downloadDir, outputPath };
}
