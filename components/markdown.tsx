import { memo, Fragment } from 'react';
import { Streamdown } from 'streamdown';
import { FileText, FolderOpen } from 'lucide-react';

interface MarkdownProps {
  children: string;
}

// File link button component
function FileLinkButton({ path, displayText }: { path: string; displayText: string }) {
  // Normalize path: remove leading /workspace or /tmp/workspace
  let normalizedPath = path;
  if (normalizedPath.startsWith('/workspace/')) {
    normalizedPath = normalizedPath.substring('/workspace'.length);
  } else if (normalizedPath.startsWith('/tmp/workspace/')) {
    normalizedPath = normalizedPath.substring('/tmp/workspace'.length);
  }

  const fileName = normalizedPath.split('/').pop() || normalizedPath;

  const handlePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 Preview file:', normalizedPath);
    window.dispatchEvent(
      new CustomEvent('preview-file', {
        detail: { path: normalizedPath, name: fileName }
      })
    );
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const directory = normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) || '/';
    console.log('📂 Navigate to:', { path: normalizedPath, directory });
    window.dispatchEvent(
      new CustomEvent('navigate-to-file', {
        detail: { path: normalizedPath, directory }
      })
    );
  };

  return (
    <span className="inline-flex items-center gap-0 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 overflow-hidden">
      <button
        onClick={handlePreview}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
        title="Preview file"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>{displayText}</span>
      </button>
      <button
        onClick={handleNavigate}
        className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border-l border-blue-200 dark:border-blue-800"
        title="Open in My Files"
      >
        <FolderOpen className="h-3 w-3" />
      </button>
    </span>
  );
}

// Parse content and return array of text/button elements
function parseContentWithFileLinks(content: string): React.ReactNode[] {
  const filePattern = /\[\[file:([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = filePattern.exec(content)) !== null) {
    const [fullMatch, path, label] = match;
    const matchIndex = match.index;

    // Add text before the match
    if (matchIndex > lastIndex) {
      const textBefore = content.substring(lastIndex, matchIndex);
      parts.push(textBefore);
    }

    // Add file link button
    const fileName = path.split('/').pop() || path;
    const displayText = label || fileName;
    parts.push(
      <FileLinkButton key={`file-${matchIndex}`} path={path} displayText={displayText} />
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

function MarkdownRenderer({ children }: MarkdownProps) {
  // Check if content has file links
  const hasFileLinks = /\[\[file:/.test(children);

  if (hasFileLinks) {
    console.log('🔗 Content has file links, replacing with unique markers');

    // Step 1: Extract file links and replace with unique markers
    const fileLinks: { path: string; displayText: string }[] = [];
    const filePattern = /\[\[file:([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;

    while ((match = filePattern.exec(children)) !== null) {
      const [, path, label] = match;
      const fileName = path.split('/').pop() || path;
      const displayText = label || fileName;
      fileLinks.push({ path, displayText });
    }

    // Replace file links with markers like __FILE_LINK_0__, __FILE_LINK_1__, etc.
    let markedContent = children;
    let index = 0;
    markedContent = markedContent.replace(filePattern, () => {
      return `__FILE_LINK_${index++}__`;
    });

    console.log('📝 Marked content:', markedContent);
    console.log('📎 File links:', fileLinks);

    // Step 2: Split marked content by file link markers
    const parts: React.ReactNode[] = [];
    const markerPattern = /__FILE_LINK_(\d+)__/g;
    let lastIndex = 0;
    let markerMatch;

    while ((markerMatch = markerPattern.exec(markedContent)) !== null) {
      const [fullMarker, linkIndex] = markerMatch;
      const markerIndex = markerMatch.index;

      // Add text before marker (render with Streamdown)
      if (markerIndex > lastIndex) {
        const textBefore = markedContent.substring(lastIndex, markerIndex);
        parts.push(
          <Streamdown
            key={`md-${lastIndex}`}
            parseIncompleteMarkdown
            className="streamdown-content inline"
            shikiTheme={['github-light', 'github-dark']}
          >
            {textBefore}
          </Streamdown>
        );
      }

      // Add file link button
      const fileLink = fileLinks[parseInt(linkIndex)];
      if (fileLink) {
        parts.push(
          <FileLinkButton
            key={`file-${linkIndex}`}
            path={fileLink.path}
            displayText={fileLink.displayText}
          />
        );
      }

      lastIndex = markerIndex + fullMarker.length;
    }

    // Add remaining text
    if (lastIndex < markedContent.length) {
      const remaining = markedContent.substring(lastIndex);
      parts.push(
        <Streamdown
          key={`md-${lastIndex}`}
          parseIncompleteMarkdown
          className="streamdown-content inline"
          shikiTheme={['github-light', 'github-dark']}
        >
          {remaining}
        </Streamdown>
      );
    }

    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none w-full"
        style={{ minWidth: 0 }}
      >
        {parts.map((part, idx) => (
          <Fragment key={idx}>{part}</Fragment>
        ))}
      </div>
    );
  }

  // No file links, use normal Streamdown rendering
  const processedContent = children;

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
        rehypePlugins={[]}
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

          // Link styling - handle file links specially
          a: ({ children, href, title, ...props }: any) => {
            console.log('🔗 Link renderer called:', { href, title, children });

            // Check if this is a file link (href=#file and title contains the path)
            if (href === '#file' && title) {
              console.log('✅ Rendering file link button for:', title);
              const path = title;
              const fileName = path.split('/').pop() || path;
              // Remove the 📁 emoji from children if present
              const childText = typeof children === 'string' ? children.replace('📁 ', '') : children;

              const handlePreview = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // Dispatch event to open file preview
                window.dispatchEvent(
                  new CustomEvent('preview-file', {
                    detail: { path, name: fileName }
                  })
                );
              };

              const handleNavigate = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const directory = path.substring(0, path.lastIndexOf('/')) || '/';
                window.dispatchEvent(
                  new CustomEvent('navigate-to-file', {
                    detail: { path, directory }
                  })
                );
              };

              return (
                <span className="inline-flex items-center gap-0 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 overflow-hidden">
                  <button
                    onClick={handlePreview}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                    title="Preview file"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{childText}</span>
                  </button>
                  <button
                    onClick={handleNavigate}
                    className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border-l border-blue-200 dark:border-blue-800"
                    title="Open in My Files"
                  >
                    <FolderOpen className="h-3 w-3" />
                  </button>
                </span>
              );
            }

            // Regular link
            return (
              <a
                href={href}
                className="text-brand-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },

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
        {processedContent}
      </Streamdown>
    </div>
  );
}

export const Markdown = memo(
  MarkdownRenderer,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
