import { memo } from 'react';
import { Streamdown } from 'streamdown';

interface MarkdownProps {
  children: string;
}

function MarkdownRenderer({ children }: MarkdownProps) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none w-full"
      style={{ minWidth: 0 }}
    >
      <Streamdown
        parseIncompleteMarkdown
        className="streamdown-content"
        shikiTheme={['github-light', 'github-dark']}
        remarkPlugins={[]}
        components={{
          // Disable strikethrough rendering
          del: ({ children }) => <>{children}</>,
          s: ({ children }) => <>{children}</>,

          // Inline code styling
          code: ({ children, className, ...props }) => {
            const isInlineCode = !className;
            if (isInlineCode) {
              return (
                <code
                  className="px-2 py-0.5 rounded-md bg-muted text-foreground text-sm font-mono border-0"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            // Block code - let pre handle styling
            return <code {...props}>{children}</code>;
          },

          // Code block container styling
          pre: ({ children, ...props }) => (
            <pre
              className="p-4 rounded-xl bg-muted/50 border border-border/30 overflow-x-auto font-mono text-sm leading-relaxed w-full"
              style={{ maxWidth: '100%' }}
              {...props}
            >
              {children}
            </pre>
          ),

          // Table styling
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border border-border/30 rounded-lg"
                {...props}
              >
                {children}
              </table>
            </div>
          ),

          // Link styling
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-brand-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),

          // Blockquote styling
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-brand-primary/30 bg-brand-avatar pl-4 py-2 my-4 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </Streamdown>
    </div>
  );
}

export const Markdown = memo(
  MarkdownRenderer,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
