const EXT_MAP = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.sass': 'sass',
  '.html': 'markup',
  '.htm': 'markup',
  '.xml': 'markup',
  '.svg': 'markup',
  '.vue': 'markup',
  '.svelte': 'markup',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.makefile': 'makefile',
  '.diff': 'diff',
  '.patch': 'diff',
  '.toml': 'toml',
  '.ini': 'ini',
  '.r': 'r',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.dart': 'dart',
  '.cs': 'csharp',
};

const FILENAME_MAP = {
  Makefile: 'makefile',
  Dockerfile: 'docker',
  '.gitignore': 'bash',
  '.env': 'bash',
  '.bashrc': 'bash',
  '.zshrc': 'bash',
};

export function getLanguageFromPath(filePath) {
  const filename = filePath.split('/').pop();

  if (FILENAME_MAP[filename]) return FILENAME_MAP[filename];

  const ext = '.' + filename.split('.').pop().toLowerCase();
  return EXT_MAP[ext] || 'plaintext';
}
