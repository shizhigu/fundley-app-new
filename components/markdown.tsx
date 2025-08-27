import React, { memo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Streamdown } from 'streamdown';
import { StockSymbol } from './stock-symbol';

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Map<Element, any>>(new Map());
  
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

  useEffect(() => {
    if (!containerRef.current) return;
    
    const processStockSymbols = () => {
      const container = containerRef.current;
      if (!container) return;

      // Find all text nodes that contain [[TICKER:
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodesToProcess: Text[] = [];
      
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const text = textNode.textContent || '';
        if (text.includes('[[TICKER:')) {
          nodesToProcess.push(textNode);
        }
      }

      // Process each node
      nodesToProcess.forEach((textNode) => {
        const text = textNode.textContent || '';
        const parts = text.split(/(\[\[TICKER:[A-Z]+\]\])/g);
        
        if (parts.length > 1) {
          const fragment = document.createDocumentFragment();
          
          parts.forEach((part) => {
            const tickerMatch = part.match(/\[\[TICKER:([A-Z]+)\]\]/);
            if (tickerMatch) {
              const span = document.createElement('span');
              span.style.display = 'inline';
              fragment.appendChild(span);
              
              const root = createRoot(span);
              root.render(<StockSymbol symbol={tickerMatch[1]} />);
              rootsRef.current.set(span, root);
            } else if (part) {
              fragment.appendChild(document.createTextNode(part));
            }
          });
          
          textNode.parentNode?.replaceChild(fragment, textNode);
        }
      });
    };

    // Wait a bit for Streamdown to render
    const timer = setTimeout(processStockSymbols, 50);

    return () => {
      clearTimeout(timer);
      rootsRef.current.forEach((root) => {
        root.unmount();
      });
      rootsRef.current.clear();
    };
  }, [children]);

  return (
    <div ref={containerRef}>
      <Streamdown>{processedContent}</Streamdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
