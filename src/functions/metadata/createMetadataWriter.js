import fs from 'fs';

const queueMap = new Map();

export function createMetadataWriter(metaPath) {
  let queue = queueMap.get(metaPath) || Promise.resolve();
  const writer = meta => {
    queue = queue.then(() =>
      fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8')
    );
    queueMap.set(metaPath, queue);
    return queue;
  };
  return writer;
}
