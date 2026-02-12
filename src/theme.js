export const cyberTheme = {
  plain: {
    color: '#d4d4d8',
    backgroundColor: 'transparent',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#4a5568', fontStyle: 'italic' },
    },
    {
      types: ['namespace'],
      style: { opacity: 0.7 },
    },
    {
      types: ['string', 'attr-value'],
      style: { color: '#a3e635' },
    },
    {
      types: ['punctuation', 'operator'],
      style: { color: '#89ddff' },
    },
    {
      types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'regex', 'inserted'],
      style: { color: '#f78c6c' },
    },
    {
      types: ['atrule', 'keyword', 'attr-name'],
      style: { color: '#00e5ff' },
    },
    {
      types: ['function', 'deleted', 'tag'],
      style: { color: '#e879f9' },
    },
    {
      types: ['function-variable'],
      style: { color: '#82aaff' },
    },
    {
      types: ['selector', 'important', 'builtin', 'changed'],
      style: { color: '#fbbf24' },
    },
    {
      types: ['class-name'],
      style: { color: '#22d3ee' },
    },
    {
      types: ['char'],
      style: { color: '#a3e635' },
    },
    {
      types: ['property'],
      style: { color: '#60a5fa' },
    },
  ],
};
