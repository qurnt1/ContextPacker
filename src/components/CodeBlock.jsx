import { memo, useMemo } from 'react';
import { Highlight } from 'prism-react-renderer';
import { cyberTheme } from '../theme';
import { getLanguageFromPath } from '../utils/languageMap';
import { MAX_HIGHLIGHT_SIZE } from '../constants';

const CodeBlock = memo(function CodeBlock({ code, filePath }) {
  const language = useMemo(() => getLanguageFromPath(filePath), [filePath]);
  const tooLarge = code.length > MAX_HIGHLIGHT_SIZE;

  if (tooLarge) {
    return (
      <pre className="p-4 font-mono text-xs text-gray-400 leading-relaxed whitespace-pre overflow-x-auto max-h-[600px]">
        {code}
      </pre>
    );
  }

  return (
    <Highlight theme={cyberTheme} code={code} language={language}>
      {({ style, tokens: lines, getLineProps, getTokenProps }) => (
        <pre
          className="p-4 font-mono text-xs leading-relaxed overflow-x-auto max-h-[600px]"
          style={{ ...style, background: 'transparent' }}
        >
          {lines.map((line, i) => {
            const lineProps = getLineProps({ line });
            return (
              <div key={i} {...lineProps} className="table-row">
                <span className="table-cell pr-4 text-right text-gray-700 select-none w-10 text-[10px]">
                  {i + 1}
                </span>
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
});

export default CodeBlock;
