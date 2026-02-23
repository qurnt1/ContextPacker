export const cyberTheme = {
  plain: {
    color: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#6b7280', fontStyle: 'italic' },
    },
    {
      types: ['namespace'],
      style: { opacity: 0.7 },
    },
    {
      types: ['string', 'attr-value', 'char'],
      style: { color: '#86efac' },
    },
    {
      types: ['punctuation', 'operator'],
      style: { color: '#d1d5db' },
    },
    {
      types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'regex', 'inserted'],
      style: { color: '#facc15' },
    },
    {
      types: ['atrule', 'keyword', 'attr-name'],
      style: { color: '#22c55e' },
    },
    {
      types: ['function', 'deleted', 'tag', 'function-variable'],
      style: { color: '#4ade80' },
    },
    {
      types: ['selector', 'important', 'builtin', 'changed'],
      style: { color: '#f3f4f6' },
    },
    {
      types: ['class-name'],
      style: { color: '#bbf7d0' },
    },
    {
      types: ['property'],
      style: { color: '#a3a3a3' },
    },
  ],
};
