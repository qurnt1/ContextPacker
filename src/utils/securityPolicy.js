const SENSITIVE_DIRECTORY_NAMES = new Set(['.aws', '.ssh']);

const PRIVATE_KEY_FILE_NAMES = new Set([
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'id_xmss',
]);

const PRIVATE_KEY_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.ppk']);

export const SENSITIVE_PATH_PATTERNS = Object.freeze([
  '.env*',
  '.aws',
  '.ssh',
  'credentials.json',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'id_xmss',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '*.ppk',
]);

export function isSensitivePath(path) {
  const segments = String(path || '')
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());

  return segments.some((segment) => {
    if (segment.startsWith('.env')) return true;
    if (SENSITIVE_DIRECTORY_NAMES.has(segment)) return true;
    if (segment === 'credentials.json' || PRIVATE_KEY_FILE_NAMES.has(segment)) return true;

    const extensionIndex = segment.lastIndexOf('.');
    return extensionIndex > 0 && PRIVATE_KEY_EXTENSIONS.has(segment.slice(extensionIndex));
  });
}
