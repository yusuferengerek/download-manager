import fs from 'fs';
import path from 'path';
import { META_FILENAME } from '../config.js';
import { fileExists } from '../global/fileExists.js';
import { resolveDownloadPaths } from '../global/resolvePaths.js';
import { createMetadataWriter } from './createMetadataWriter.js';
import { createSegments } from '../segments/createSegments.js';
import { syncSegmentsWithFiles } from '../segments/syncSegmentsWithFiles.js';
import { getFileInfo } from '../network/getFileInfo.js';

const fsp = fs.promises;

export async function loadOrCreateMetadata(url, outputPath, desiredSegments, sha256) {
  if (!url) {
    throw new Error('URL is required');
  }
  const info = await getFileInfo(url);
  const { downloadDir, outputPath: absoluteOutput } = resolveDownloadPaths(url, outputPath);
  await fsp.mkdir(downloadDir, { recursive: true });
  const metaPath = path.join(downloadDir, META_FILENAME);
  const writer = createMetadataWriter(metaPath);
  let meta;
  const exists = await fileExists(metaPath);
  if (exists) {
    const raw = await fsp.readFile(metaPath, 'utf8');
    meta = JSON.parse(raw);
    let needsPersist = false;
    meta.originalUrl = meta.originalUrl || meta.url || info.url;
    if (meta.originalUrl !== url) {
      throw new Error(
        `Existing metadata belongs to ${meta.originalUrl}; delete ${META_FILENAME} to restart`
      );
    }
    if (meta.output !== absoluteOutput) {
      meta.output = absoluteOutput;
      needsPersist = true;
    }
    if (meta.resolvedUrl !== info.url) {
      meta.resolvedUrl = info.url;
      needsPersist = true;
    }
    if (meta.size !== info.size) {
      throw new Error(
        'Remote file size has changed since last download. Remove metadata to restart safely.'
      );
    }
    if (sha256 && meta.sha256 && meta.sha256 !== sha256) {
      throw new Error('Provided SHA256 checksum does not match stored metadata.');
    }
    if (sha256 && !meta.sha256) {
      meta.sha256 = sha256;
      needsPersist = true;
    }
    if (needsPersist) {
      await writer(meta);
    }
  } else {
    const segments = createSegments(info.size, desiredSegments);
    meta = {
      originalUrl: url,
      resolvedUrl: info.url,
      output: absoluteOutput,
      size: info.size,
      segments,
      createdAt: new Date().toISOString(),
      sha256: sha256 || null
    };
    await writer(meta);
  }
  const mutated = await syncSegmentsWithFiles(meta, downloadDir);
  if (mutated) {
    await writer(meta);
  }
  return { meta, metaPath, directory: downloadDir, persistMetadata: writer };
}
