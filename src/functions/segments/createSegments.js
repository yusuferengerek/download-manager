import { determineSegmentCount } from './determineCount.js';

export function createSegments(size, desiredCount) {
  const count = determineSegmentCount(size, desiredCount);
  if (size === 0) {
    return [
      { index: 0, start: 0, end: -1, downloaded: 0, completed: true }
    ];
  }
  const base = Math.floor(size / count);
  const remainder = size % count;
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    let segSize = base;
    if (i < remainder) {
      segSize += 1;
    }
    const start = cursor;
    const end = i === count - 1 ? size - 1 : start + segSize - 1;
    segments.push({
      index: i,
      start,
      end,
      downloaded: 0,
      completed: false
    });
    cursor = end + 1;
  }
  return segments;
}
