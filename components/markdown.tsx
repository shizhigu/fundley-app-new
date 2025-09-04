import React, { memo } from 'react';
import { Streamdown } from 'streamdown';

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // Preprocess content to escape single dollar signs that are not part of math blocks
  const processedContent = React.useMemo(() => {
    // Don't process if no dollar signs
    if (!children.includes('$')) return children;
    
    // Replace single $ that are not part of $$ with escaped version
    // This regex matches $ that are:
    // 1. Not preceded by another $
    // 2. Not followed by another $
    // 3. Likely part of currency (followed by digit)
    return children.replace(/(?<!\$)\$(?!\$)(\d)/g, '\\$$1');
  }, [children]);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <Streamdown 
        parseIncompleteMarkdown={true}
        className="streamdown-content"
        shikiTheme={["github-light", "github-dark"]}
        components={{
          code: ({ children, className, ...props }) => {
            const isInlineCode = !className;
            if (isInlineCode) {
              return (
                <code 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-sm font-mono border-0"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            // For code blocks, just return the code element without extra styling
            return <code {...props}>{children}</code>;
          },
          pre: ({ children, ...props }) => (
            <pre 
              className="!bg-gray-900 !text-gray-100 !p-4 !rounded-lg !border-0 !shadow-none overflow-x-auto font-mono text-sm leading-relaxed"
              style={{
                background: '#1a1a1a !important',
                border: 'none !important',
                boxShadow: 'none !important'
              }}
              {...props}
            >
              {children}
            </pre>
          )
        }}
      >
        {processedContent}
      </Streamdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
