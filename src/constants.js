export const DEFAULT_IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  'venv',
  '.venv',
  '__pycache__',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'coverage',
  '.vscode',
  '.idea',
  'vendor',
  'bower_components',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'out',
  '.tox',
  '*.egg-info',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.env.local',
  '.env.production',
];

export const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.avif',
  // Audio
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a',
  // Video
  '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.zst',
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.msi', '.app',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Compiled
  '.pyc', '.pyo', '.class', '.o', '.obj', '.wasm',
  // Databases
  '.sqlite', '.db', '.sqlite3',
  // Other binary
  '.DS_Store', '.ico',
]);

export const TOKEN_WARNING_THRESHOLD = 128_000;
export const MAX_FILE_SIZE = 1_000_000; // 1 MB
export const MAX_HIGHLIGHT_SIZE = 50_000; // 50 KB
