import fs from 'fs';
import path from 'path';
import { getSegmentPath } from './getSegmentPath.js';

const fsp = fs.promises;

export async function syncSegmentsWithFiles(meta, directory) {
  let mutated = false;
  for (const segment of meta.segments) {
    const partPath = getSegmentPath(directory, segment.index);
    await fsp.mkdir(path.dirname(partPath), { recursive: true });
    await fsp.writeFile(partPath, '', { flag: 'a' });
    const stats = await fsp.stat(partPath).catch(() => null);
    const segmentLength = Math.max(0, segment.end - segment.start + 1);
    let actualSize = stats ? stats.size : 0;
    if (actualSize > segmentLength) {
      await fsp.truncate(partPath, segmentLength);
      actualSize = segmentLength;
    }
    if (segment.downloaded !== actualSize) {
      segment.downloaded = actualSize;
      mutated = true;
    }
    const isComplete = actualSize >= segmentLength;
    if (segment.completed !== isComplete) {
      segment.completed = isComplete;
      mutated = true;
    }
  }
  return mutated;
}
