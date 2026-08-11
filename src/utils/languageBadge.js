const LANG_COLORS = {
  '.js': '#f7df1e',
  '.jsx': '#61dafb',
  '.ts': '#3178c6',
  '.tsx': '#3178c6',
  '.py': '#3776ab',
  '.rb': '#cc342d',
  '.go': '#00add8',
  '.rs': '#dea584',
  '.css': '#1572b6',
  '.scss': '#cc6699',
  '.less': '#1d365d',
  '.html': '#e34f26',
  '.htm': '#e34f26',
  '.vue': '#4fc08d',
  '.svelte': '#ff3e00',
  '.json': '#5b5b5b',
  '.jsonc': '#5b5b5b',
  '.csv': '#4f9d69',
  '.tsv': '#4f9d69',
  '.md': '#8b8b8b',
  '.mdx': '#8b8b8b',
  '.yml': '#9570b5',
  '.yaml': '#9570b5',
  '.sh': '#4eaa25',
  '.bash': '#4eaa25',
  '.java': '#b07219',
  '.kt': '#7f52ff',
  '.kts': '#7f52ff',
  '.swift': '#f05138',
  '.php': '#777bb3',
  '.c': '#555555',
  '.cpp': '#f34b7d',
  '.cc': '#f34b7d',
  '.cxx': '#f34b7d',
  '.h': '#555555',
  '.hpp': '#f34b7d',
  '.sql': '#e38c00',
  '.graphql': '#e10098',
  '.gql': '#e10098',
  '.dart': '#00b4ab',
  '.r': '#276dc3',
  '.toml': '#9c4221',
  '.ini': '#8b8b8b',
  '.cfg': '#8b8b8b',
  '.env': '#ecd53f',
  '.dockerfile': '#384d54',
  '.tf': '#5c4ee5',
  '.lua': '#000080',
};

const FILE_TYPE_INFO = {
  docker: { label: 'Docker', color: '#2496ed' },
  package: { label: 'Package', color: '#cb3837' },
  git: { label: 'Git', color: '#f05032' },
  javascript: { label: 'JavaScript', color: '#f7df1e' },
  react: { label: 'React', color: '#61dafb' },
  typescript: { label: 'TypeScript', color: '#3178c6' },
  python: { label: 'Python', color: '#3776ab' },
  rust: { label: 'Rust', color: '#dea584' },
  go: { label: 'Go', color: '#00add8' },
  java: { label: 'Java', color: '#b07219' },
  vue: { label: 'Vue', color: '#4fc08d' },
  svelte: { label: 'Svelte', color: '#ff3e00' },
  terraform: { label: 'Terraform', color: '#5c4ee5' },
  json: { label: 'JSON', color: '#a8b3a5' },
  markdown: { label: 'Markdown', color: '#a8b3a5' },
  yaml: { label: 'YAML', color: '#b493d6' },
  text: { label: 'Text', color: '#a8b3a5' },
  config: { label: 'Configuration', color: '#d19a66' },
  generic: { label: 'Fichier', color: '#778579' },
};

const FILENAME_FILE_TYPES = {
  dockerfile: 'docker',
  'package.json': 'package',
  'package-lock.json': 'package',
  'pnpm-lock.yaml': 'package',
  'yarn.lock': 'package',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
};

const EXTENSION_FILE_TYPES = {
  '.dockerfile': 'docker',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'react',
  '.ts': 'typescript',
  '.tsx': 'react',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.tf': 'terraform',
  '.json': 'json',
  '.jsonc': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.txt': 'text',
  '.text': 'text',
  '.log': 'text',
  '.ini': 'config',
  '.cfg': 'config',
  '.conf': 'config',
  '.config': 'config',
  '.toml': 'config',
  '.properties': 'config',
  '.env': 'config',
};

function getBasename(fileName) {
  return String(fileName || '').split(/[\\/]/).pop().toLowerCase();
}

function normalizeExtension(extension) {
  const value = String(extension || '').trim().toLowerCase();
  return value && value.startsWith('.') ? value : value ? `.${value}` : '';
}

export function getFileTypeInfo(fileName, extension) {
  const filenameType = FILENAME_FILE_TYPES[getBasename(fileName)];
  const extensionType = EXTENSION_FILE_TYPES[normalizeExtension(extension)];
  const type = filenameType || extensionType || 'generic';
  return { type, ...FILE_TYPE_INFO[type] };
}

export function getLangColor(ext) {
  if (!ext) return null;
  return LANG_COLORS[ext.toLowerCase()] || null;
}
