import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module under test
import { parseGitHubRepoInput } from '../utils/githubScanner';

describe('parseGitHubRepoInput', () => {
  it('parses a full GitHub URL', () => {
    const result = parseGitHubRepoInput('https://github.com/facebook/react');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
    expect(result.ref).toBe('');
    expect(result.subPath).toBe('');
  });

  it('parses owner/repo shorthand', () => {
    const result = parseGitHubRepoInput('facebook/react');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
  });

  it('extracts branch ref from tree URL', () => {
    const result = parseGitHubRepoInput('https://github.com/facebook/react/tree/main/packages/react');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
    expect(result.ref).toBe('main');
    expect(result.subPath).toBe('packages/react');
  });

  it('extracts ref from hash shorthand', () => {
    const result = parseGitHubRepoInput('facebook/react#develop');
    expect(result.ref).toBe('develop');
  });

  it('handles .git suffix', () => {
    const result = parseGitHubRepoInput('https://github.com/user/repo.git');
    expect(result.repo).toBe('repo');
  });

  it('rejects empty input', () => {
    expect(() => parseGitHubRepoInput('')).toThrow('Entrez une URL GitHub');
  });

  it('rejects non-GitHub URLs', () => {
    expect(() => parseGitHubRepoInput('https://gitlab.com/user/repo')).toThrow('github.com');
  });

  it('normalizes input that starts with github.com/', () => {
    const result = parseGitHubRepoInput('github.com/user/repo');
    expect(result.owner).toBe('user');
    expect(result.repo).toBe('repo');
  });
});
