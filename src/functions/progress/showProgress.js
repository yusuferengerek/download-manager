import { formatBytes } from '../formatters/formatBytes.js';
import { formatEta } from '../formatters/formatETA.js';
import { RETRY_OPTIONS } from '../config.js';

const PROGRESS_REFRESH_MS = RETRY_OPTIONS.REFRESH || 250;
const cliProgressPromise = (async () => {
  try {
    return await import('cli-progress');
  } catch {
    return null;
  }
})();

function renderBar(progress) {
  const width = 30;
  const filled = Math.round(progress * width);
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
}

export async function showProgress(meta) {
  const totalSize = meta.size;
  const progressModule = await cliProgressPromise;
  const MultiBar = progressModule?.MultiBar || progressModule?.default?.MultiBar;
  const Presets = progressModule?.Presets || progressModule?.default?.Presets;
  let lastTickBytes = meta.segments.reduce((sum, seg) => sum + seg.downloaded, 0);
  let lastTickTime = Date.now();
  const lastSegmentBytes = meta.segments.map(seg => seg.downloaded);
  let multiBar = null;
  let totalBar = null;
  const segmentBars = [];
  let lastLineCount = 0;
  if (MultiBar && Presets) {
    multiBar = new MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format:
          '{name} {bar} {percentage}% | {valueFormatted}/{totalFormatted} | {speed}/s | ETA {eta}',
        autopadding: true
      },
      Presets.shades_classic
    );
    totalBar = multiBar.create(totalSize || 1, lastTickBytes, {
      name: 'TOTAL',
      speed: '0 B',
      eta: '--:--',
      valueFormatted: formatBytes(lastTickBytes),
      totalFormatted: formatBytes(totalSize)
    });
    for (const segment of meta.segments) {
      const length = Math.max(1, Math.max(0, segment.end - segment.start + 1));
      const bar = multiBar.create(length, segment.downloaded, {
        name: `SEG ${segment.index}`,
        speed: ''
      });
      segmentBars.push(bar);
    }
  }
  const interval = setInterval(() => {
    console.clear();
    const totalDownloaded = meta.segments.reduce((sum, seg) => sum + seg.downloaded, 0);
    const now = Date.now();
    const deltaBytes = totalDownloaded - lastTickBytes;
    const deltaTime = (now - lastTickTime) / 1000 || 1;
    const speed = deltaBytes > 0 ? deltaBytes / deltaTime : 0;
    lastTickBytes = totalDownloaded;
    lastTickTime = now;
    const progressRatio = totalSize > 0 ? totalDownloaded / totalSize : 1;
    const eta =
      speed > 0 && totalDownloaded < totalSize
        ? (totalSize - totalDownloaded) / speed
        : 0;
    if (multiBar && totalBar) {
      totalBar.setTotal(totalSize || 1);
      totalBar.update(totalDownloaded, {
        speed: formatBytes(speed),
        eta: formatEta(eta),
        valueFormatted: formatBytes(totalDownloaded),
        totalFormatted: formatBytes(totalSize)
      });
      meta.segments.forEach((segment, idx) => {
        const bar = segmentBars[idx];
        if (!bar) {
          return;
        }
        const length = Math.max(1, Math.max(0, segment.end - segment.start + 1));
        bar.setTotal(length);
        bar.update(segment.downloaded);
      });
    } else {
      const lines = [];
      const summaryLine = `${renderBar(progressRatio)} | ${(progressRatio * 100).toFixed(
        2
      )}% - ${formatBytes(totalDownloaded)}/${formatBytes(totalSize)} | ETA ${formatEta(
        eta
      )} - ${formatBytes(speed)}/s`;
      lines.push(summaryLine);

      meta.segments.forEach((segment, idx) => {
        const length = Math.max(1, Math.max(0, segment.end - segment.start + 1));
        const prevBytes = lastSegmentBytes[idx] || 0;
        const segDelta = segment.downloaded - prevBytes;
        lastSegmentBytes[idx] = segment.downloaded;
        const segSpeed = segDelta > 0 ? segDelta / deltaTime : 0;
        const segPercent = Math.min(100, (segment.downloaded / length) * 100);
        lines.push(
          `Segment ${segment.index}: ${formatBytes(segSpeed)}/s | ${formatBytes(
            segment.downloaded
          )} - ${segPercent.toFixed(1)}%`
        );
      });

      if (lastLineCount > 0) {
        process.stdout.write(`\u001b[${lastLineCount}F`);
      }
      process.stdout.write('\r');
      process.stdout.write('\u001b[0J');
      process.stdout.write(lines.join('\n'));
      lastLineCount = lines.length;
    }
  }, PROGRESS_REFRESH_MS);
  return () => {
    clearInterval(interval);
    if (multiBar) {
      multiBar.stop();
    } else {
      process.stdout.write('\n');
    }
  };
}
