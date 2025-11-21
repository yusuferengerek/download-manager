import path from 'path';
import { PART_FILE_PREFIX } from '../config.js';

export function getSegmentPath(directory, index) {
  return path.join(directory, `${PART_FILE_PREFIX}${index}`);
}
