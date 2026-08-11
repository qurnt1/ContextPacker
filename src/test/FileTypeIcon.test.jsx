import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FileTypeIcon from '../components/FileTypeIcon';
import FileTree from '../components/FileTree';
import { getFileTypeInfo } from '../utils/languageBadge';

afterEach(cleanup);

describe('file type icons', () => {
  it.each([
    ['Dockerfile', '', 'docker'],
    ['package.json', '.json', 'package'],
    ['.gitignore', '.gitignore', 'git'],
    ['app.js', '.js', 'javascript'],
    ['app.jsx', '.jsx', 'react'],
    ['app.ts', '.ts', 'typescript'],
    ['app.tsx', '.tsx', 'react'],
    ['script.py', '.py', 'python'],
    ['main.rs', '.rs', 'rust'],
    ['main.go', '.go', 'go'],
    ['Main.java', '.java', 'java'],
    ['App.vue', '.vue', 'vue'],
    ['App.svelte', '.svelte', 'svelte'],
    ['main.tf', '.tf', 'terraform'],
    ['data.json', '.json', 'json'],
    ['README.md', '.md', 'readme'],
    ['LICENSE', '', 'license'],
    ['tsconfig.json', '.json', 'tsconfig'],
    ['vite.config.js', '.js', 'vite'],
    ['vitest.config.js', '.js', 'vitest'],
    ['styles.css', '.css', 'css'],
    ['theme.scss', '.scss', 'scss'],
    ['index.html', '.html', 'html'],
    ['config.yaml', '.yaml', 'yaml'],
    ['notes.txt', '.txt', 'text'],
    ['settings.ini', '.ini', 'config'],
    ['unknown.bin', '.bin', 'generic'],
  ])('maps %s to %s', (fileName, extension, type) => {
    expect(getFileTypeInfo(fileName, extension).type).toBe(type);
  });

  it('renders one meaningful 15px icon with a type label', () => {
    const { container } = render(<FileTypeIcon fileName="Dockerfile" />);
    const icon = container.querySelector('[data-file-type="docker"]');

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('width', '15');
    expect(icon).toHaveAttribute('height', '15');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('title', 'Docker');
  });
});

describe('FileTree file type icons', () => {
  it('keeps blocked files disabled while replacing the dot and generic icon for selectable files', () => {
    const onFileClick = vi.fn();
    const tree = {
      name: 'demo',
      path: '',
      type: 'directory',
      children: [
        { name: 'Dockerfile', path: 'Dockerfile', type: 'file', extension: '', selectable: true, blocked: false },
        { name: 'package.json', path: 'package.json', type: 'file', extension: '.json', selectable: true, blocked: false },
        { name: '.env', path: '.env', type: 'file', extension: '.env', selectable: false, blocked: true, blockedReason: 'fichier sensible' },
      ],
    };

    render(
      <FileTree
        node={tree}
        selectedPaths={new Set(['package.json'])}
        selectionIndex={new Map()}
        onToggleFolder={vi.fn()}
        minifyEnabled={false}
        isRoot
        expandedPaths={new Set()}
        onToggleExpanded={vi.fn()}
        onFileClick={onFileClick}
      />
    );

    expect(document.querySelectorAll('[data-file-type]')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Sélectionner Dockerfile' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /\.env, bloqué/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner Dockerfile' }));
    expect(onFileClick).toHaveBeenCalledWith('Dockerfile', expect.any(Object));
  });
});
