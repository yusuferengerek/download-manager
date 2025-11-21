import { MINIMUM_SEGMENT_BYTES } from '../config.js';

export function determineSegmentCount(size, desiredCount) {
  if (size === 0) {
    return 1;
  }
  const safeDesired = Math.max(1, desiredCount);
  const maxSegments = Math.max(1, Math.floor(size / MINIMUM_SEGMENT_BYTES)) || 1;
  return Math.min(safeDesired, maxSegments);
}
