export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function formatNumber(num) {
  return num.toLocaleString('fr-FR');
}

export function getExtension(filename) {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  if (parts[0] === '' && parts.length === 2) return '.' + parts[1];
  return '.' + parts[parts.length - 1].toLowerCase();
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
