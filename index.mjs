import { fileURLToPath } from 'url';
import {
  downloadAllSegments,
  loadOrCreateMetadata,
  mergeSegments,
  parseArgs,
  showProgress
} from './src/functions/index.js';

export async function main() {
  const { url, output, segmentCount, sha256 } = await parseArgs();
  const { meta, metaPath, directory, persistMetadata } = await loadOrCreateMetadata(
    url,
    output,
    segmentCount,
    sha256
  );
  const stopProgress = await showProgress(meta);
  try {
    await downloadAllSegments(meta, directory, persistMetadata);
  } finally {
    stopProgress();
  }
  await persistMetadata(meta);
  await mergeSegments(meta, directory, metaPath);
  console.log(`\nDownload complete -> ${meta.output}`);
}

const isMain =
  process.argv[1] &&
  process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch(err => {
    console.error(`\nDownload failed: ${err.message}`);
    process.exit(1);
  });
}
