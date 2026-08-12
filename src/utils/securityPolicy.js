const ALLOWED_ENV_FILES = new Set([
  '.env.example',
  '.env.sample',
  '.env.template',
  '.env.defaults',
]);

const BLOCKED_DIRECTORY_NAMES = new Set(['.git', '.aws', '.ssh', '.venv', 'venv']);
const BLOCKED_FILENAMES = new Set(['.npmrc', '.pypirc', 'id_rsa', 'id_ed25519']);
const BLOCKED_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.crt']);

function normalizePath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function basename(path) {
  const parts = normalizePath(path).split('/');
  return parts[parts.length - 1] || '';
}

function isEnvFile(name) {
  return /^\.env(?:\.|$)/i.test(name) && !ALLOWED_ENV_FILES.has(name.toLowerCase());
}

function isCredentialFile(name) {
  const lower = name.toLowerCase();
  const extension = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
  return (
    BLOCKED_FILENAMES.has(lower) ||
    BLOCKED_EXTENSIONS.has(extension) ||
    /^credentials(?:\.[^.]+)?\.json$/i.test(name) ||
    /^service[-_]account(?:\.[^.]+)?\.json$/i.test(name)
  );
}

export function getSecurityMetadata(path, type = 'file') {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);

  if (type === 'directory' && parts.some((part) => BLOCKED_DIRECTORY_NAMES.has(part.toLowerCase()))) {
    return { selectable: false, blocked: true, blockedReason: 'sensitive', traversed: false };
  }

  const insideBlockedDirectory = parts
    .slice(0, -1)
    .some((part) => BLOCKED_DIRECTORY_NAMES.has(part.toLowerCase()));
  if (type === 'file' && (insideBlockedDirectory || isEnvFile(basename(normalized)) || isCredentialFile(basename(normalized)))) {
    return { selectable: false, blocked: true, blockedReason: 'sensitive', traversed: false };
  }

  return { selectable: true, blocked: false, blockedReason: null, traversed: true };
}

export function isSelectableFile(file) {
  return Boolean(file && file.selectable !== false && !file.blocked);
}

export function hasPotentialSecrets(file) {
  return Boolean(file?.potentialSecrets?.length);
}

export function isSelectionAllowed(file, potentialSecretsAllowed = false) {
  return isSelectableFile(file)
    && (potentialSecretsAllowed || !hasPotentialSecrets(file));
}

export function getBlockedDirectoryNames() {
  return new Set(BLOCKED_DIRECTORY_NAMES);
}
