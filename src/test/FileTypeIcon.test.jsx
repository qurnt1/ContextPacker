import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    ['script.py', '.py', 'python'],
    ['README.md', '.md', 'readme'],
    ['unknown.bin', '.bin', 'generic'],
  ])('maps %s to %s', (fileName, extension, type) => {
    expect(getFileTypeInfo(fileName, extension).type).toBe(type);
  });

  it('renders a meaningful icon with a type label', () => {
    const { container } = render(<FileTypeIcon fileName="Dockerfile" />);
    const icon = container.querySelector('[data-file-type="docker"]');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('title', 'Docker');
  });

  it.each([
    ['README.md', '.md'],
    ['requirements.txt', '.txt'],
    ['settings.ini', '.ini'],
  ])('keeps the %s icon background transparent', (fileName, extension) => {
    const { container } = render(<FileTypeIcon fileName={fileName} extension={extension} />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'none');
  });
});

describe('FileTree file type icons', () => {
  it('keeps excluded files disabled while allowing normal files', () => {
    const onFileClick = vi.fn();
    const tree = {
      name: 'demo',
      path: '',
      type: 'directory',
      children: [
        { name: 'Dockerfile', path: 'Dockerfile', type: 'file', extension: '', selectable: true, blocked: false },
        { name: '.git', path: '.git', type: 'file', extension: '', selectable: false, blocked: true },
      ],
    };
    render(<FileTree node={tree} selectedPaths={new Set()} selectionIndex={new Map()} onToggleFolder={vi.fn()} minifyEnabled={false} isRoot expandedPaths={new Set()} onToggleExpanded={vi.fn()} onFileClick={onFileClick} />);
    expect(screen.getByRole('button', { name: 'Sélectionner Dockerfile' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /.git, exclu et non sélectionnable/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner Dockerfile' }));
    expect(onFileClick).toHaveBeenCalledWith('Dockerfile', expect.any(Object));
  });
});
