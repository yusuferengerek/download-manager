import path from 'path';
import readline from 'readline';
import { META_FILENAME } from '../config.js';
import { fileExists } from './fileExists.js';
import { resolveDownloadPaths } from './resolvePaths.js';

const DEFAULT_SEGMENTS = 16;

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const answer = await new Promise(resolve => {
    rl.question(question, value => resolve((value || '').trim()));
  });
  rl.close();
  return answer;
}

export async function parseArgs(argv = process.argv) {
  const [, , urlArg, outputArg, segmentsArg, shaArg] = argv;
  let url = urlArg;
  let output = outputArg;
  let segmentsInput = segmentsArg;
  let metaExists = false;

  if (!url) {
    url = await prompt('Download linkini giriniz: ');
    while (!url) {
      url = await prompt('Lutfen gecerli bir download linki giriniz: ');
    }
  }

  if (url) {
    const { downloadDir } = resolveDownloadPaths(url, output);
    const metaPath = path.join(downloadDir, META_FILENAME);
    metaExists = await fileExists(metaPath);
  }

  if (!metaExists && !segmentsInput && !segmentsArg && !urlArg) {
    segmentsInput = await prompt(`Segment sayisi (default ${DEFAULT_SEGMENTS}): `);
  }

  const parsedSegments = segmentsInput ? Number.parseInt(segmentsInput, 10) : DEFAULT_SEGMENTS;
  const segmentCount =
    Number.isFinite(parsedSegments) && parsedSegments > 0 ? parsedSegments : DEFAULT_SEGMENTS;
  const sha =
    shaArg && /^[a-f0-9]{64}$/i.test(shaArg)
      ? shaArg.toLowerCase()
      : null;

  return {
    url,
    output: output || null,
    segmentCount,
    sha256: sha
  };
}
