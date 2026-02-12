import { BINARY_EXTENSIONS } from '../constants';

export function isBinaryExtension(filename) {
  const ext = getExt(filename);
  return BINARY_EXTENSIONS.has(ext);
}

export function isBinaryContent(content) {
  const sample = content.slice(0, 8192);
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) return true;
  }
  return false;
}

function getExt(filename) {
  const idx = filename.lastIndexOf('.');
  if (idx <= 0) return '';
  return filename.slice(idx).toLowerCase();
}
