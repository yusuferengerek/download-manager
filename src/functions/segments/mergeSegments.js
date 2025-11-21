import fs from 'fs';
import crypto from 'crypto';
import { getSegmentPath } from './getSegmentPath.js';

const fsp = fs.promises;

async function copySegmentToStream(partPath, writeStream) {
  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(partPath);
    const cleanup = () => {
      readStream.removeAllListeners();
      writeStream.removeListener('error', onError);
    };
    const onError = err => {
      cleanup();
      reject(err);
    };
    readStream.on('error', onError);
    writeStream.on('error', onError);
    readStream.on('end', () => {
      cleanup();
      resolve();
    });
    readStream.pipe(writeStream, { end: false });
  });
}

async function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function mergeSegments(meta, directory, metaPath) {
  const incomplete = meta.segments.filter(seg => !seg.completed);
  if (incomplete.length > 0) {
    throw new Error('Cannot merge while segments remain incomplete');
  }
  const tempOutput = `${meta.output}.downloading`;
  const finalStream = fs.createWriteStream(tempOutput);
  const orderedSegments = [...meta.segments].sort((a, b) => a.index - b.index);
  for (const segment of orderedSegments) {
    const partPath = getSegmentPath(directory, segment.index);
    await copySegmentToStream(partPath, finalStream);
  }
  await new Promise((resolve, reject) => {
    finalStream.end();
    finalStream.on('finish', resolve);
    finalStream.on('error', reject);
  });
  const stats = await fsp.stat(tempOutput);
  if (stats.size !== meta.size) {
    await fsp.unlink(tempOutput).catch(() => {});
    throw new Error('Merged file size mismatch; aborting merge');
  }
  await fsp.rename(tempOutput, meta.output);
  if (meta.sha256) {
    const actualHash = await computeSha256(meta.output);
    if (actualHash.toLowerCase() !== meta.sha256.toLowerCase()) {
      await fsp.unlink(meta.output).catch(() => {});
      throw new Error('SHA256 checksum mismatch after merge');
    }
  }
  await Promise.all(
    meta.segments.map(segment =>
      fsp.unlink(getSegmentPath(directory, segment.index)).catch(() => {})
    )
  );
  await fsp.unlink(metaPath).catch(() => {});
}
