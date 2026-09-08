// Light editor theme for readable code previews in ContextPacker.
export const copyTheme = {
  plain: {
    color: '#233b53',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#52715e', fontStyle: 'italic' } },
    { types: ['keyword', 'atrule', 'important'], style: { color: '#075985' } },
    { types: ['string', 'attr-value', 'char', 'template-string'], style: { color: '#9a3412' } },
    { types: ['number', 'boolean', 'constant', 'symbol'], style: { color: '#166534' } },
    { types: ['function', 'function-variable', 'method'], style: { color: '#9a6700' } },
    { types: ['class-name', 'maybe-class-name', 'builtin'], style: { color: '#0f766e' } },
    { types: ['variable', 'parameter', 'property'], style: { color: '#1d4ed8' } },
    { types: ['operator', 'punctuation'], style: { color: '#53687d' } },
    { types: ['tag', 'selector'], style: { color: '#075985' } },
    { types: ['attr-name'], style: { color: '#1d4ed8' } },
    { types: ['regex', 'deleted'], style: { color: '#b91c1c' } },
    { types: ['inserted'], style: { color: '#166534' } },
    { types: ['changed'], style: { color: '#075985' } },
    { types: ['namespace'], style: { opacity: 0.72 } },
    { types: ['url'], style: { color: '#0f766e', textDecoration: 'underline' } },
    { types: ['entity'], style: { color: '#9a6700' } },
  ],
};

// CodeBlock still imports the historical export name until the non-interface lot is migrated.
export const cyberTheme = copyTheme;
