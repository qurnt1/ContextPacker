// VS Code Dark+ inspired syntax theme
// Colors are chosen for high contrast and distinct token types,
// matching the feel of a professional code editor.
export const cyberTheme = {
  plain: {
    color: '#d4d4d4',
    backgroundColor: 'transparent',
  },
  styles: [
    // Comments — green, italic
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#6a9955', fontStyle: 'italic' },
    },
    // Keywords — blue (if, else, return, function, class, const, let, import, export, etc.)
    {
      types: ['keyword', 'atrule', 'important'],
      style: { color: '#569cd6' },
    },
    // Strings — warm orange
    {
      types: ['string', 'attr-value', 'char', 'template-string'],
      style: { color: '#ce9178' },
    },
    // Numbers & booleans — light green
    {
      types: ['number', 'boolean', 'constant', 'symbol'],
      style: { color: '#b5cea8' },
    },
    // Functions & methods — yellow/gold
    {
      types: ['function', 'function-variable', 'method'],
      style: { color: '#dcdcaa' },
    },
    // Classes, types, interfaces — teal
    {
      types: ['class-name', 'maybe-class-name', 'builtin'],
      style: { color: '#4ec9b0' },
    },
    // Variables & parameters — white/light
    {
      types: ['variable', 'parameter', 'property'],
      style: { color: '#9cdcfe' },
    },
    // Operators & punctuation — light gray
    {
      types: ['operator', 'punctuation'],
      style: { color: '#d4d4d4' },
    },
    // Tags (HTML/JSX) — blue
    {
      types: ['tag', 'selector'],
      style: { color: '#569cd6' },
    },
    // Attribute names (HTML/JSX) — light blue
    {
      types: ['attr-name'],
      style: { color: '#9cdcfe' },
    },
    // Regex — red
    {
      types: ['regex'],
      style: { color: '#d16969' },
    },
    // Deleted/diff — red
    {
      types: ['deleted'],
      style: { color: '#ce9178' },
    },
    // Inserted/diff — green
    {
      types: ['inserted'],
      style: { color: '#b5cea8' },
    },
    // Changed/diff — blue
    {
      types: ['changed'],
      style: { color: '#569cd6' },
    },
    // Namespace
    {
      types: ['namespace'],
      style: { opacity: 0.7 },
    },
    // URLs / links
    {
      types: ['url'],
      style: { color: '#4ec9b0', textDecoration: 'underline' },
    },
    // Entity references
    {
      types: ['entity'],
      style: { color: '#dcdcaa' },
    },
  ],
};
