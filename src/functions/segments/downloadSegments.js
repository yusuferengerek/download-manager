import { RETRY_OPTIONS } from '../config.js';
import { createAbortCoordinator } from '../global/createAbortCoordinator.js';
import { sleep } from '../global/sleep.js';
import { performSegmentRequest } from '../network/segmentRequest.js';
import { getSegmentPath } from './getSegmentPath.js';

export async function downloadSegment(meta, segment, directory, persistMetadata, abort) {
  if (segment.completed) {
    return;
  }
  const partPath = getSegmentPath(directory, segment.index);
  const segmentLength = Math.max(0, segment.end - segment.start + 1);
  if (segmentLength === 0) {
    segment.completed = true;
    await persistMetadata(meta);
    return;
  }
  if (segment.downloaded >= segmentLength) {
    segment.downloaded = segmentLength;
    segment.completed = true;
    await persistMetadata(meta);
    return;
  }
  let attempt = 0;
  while (attempt < RETRY_OPTIONS.MAX) {
    if (abort.cancelled) {
      throw abort.reason;
    }
    const startByte = segment.start + segment.downloaded;
    if (startByte > segment.end) {
      segment.completed = true;
      await persistMetadata(meta);
      return;
    }
    try {
      await performSegmentRequest(
        meta.resolvedUrl || meta.originalUrl,
        startByte,
        segment.end,
        segment,
        meta,
        partPath,
        persistMetadata,
        abort
      );
      return;
    } catch (err) {
      attempt += 1;
      if (abort.cancelled) {
        throw abort.reason || err;
      }
      if (attempt >= RETRY_OPTIONS.MAX) {
        abort.cancel(err);
        throw err;
      }
      const backoff = RETRY_OPTIONS.DELAY * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }
  }
}

export async function downloadAllSegments(meta, directory, persistMetadata) {
  const abort = createAbortCoordinator();
  const pendingSegments = meta.segments.filter(seg => !seg.completed);
  if (pendingSegments.length === 0) {
    return;
  }
  const tasks = pendingSegments.map(segment =>
    (async () => {
      try {
        await downloadSegment(meta, segment, directory, persistMetadata, abort);
      } catch (err) {
        abort.cancel(err);
        throw err;
      }
    })()
  );
  await Promise.all(tasks);
}
