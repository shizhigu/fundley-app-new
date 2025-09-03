'use client';

import { useEffect } from 'react';

export function useMermaid() {
  useEffect(() => {
    const initMermaid = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const mermaid = (await import('mermaid')).default;
        
        // 配置Mermaid为响应式
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          themeVariables: {
            primaryColor: '#fb923c',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#f97316',
            lineColor: '#6b7280',
          }
        });

        // 延迟渲染确保DOM准备就绪
        setTimeout(async () => {
          const mermaidElements = document.querySelectorAll('.mermaid:not([data-processed])');
          
          for (const element of mermaidElements) {
            try {
              const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const graphDefinition = element.textContent || '';
              
              const { svg } = await mermaid.render(id, graphDefinition);
              element.innerHTML = svg;
              element.setAttribute('data-processed', 'true');
              
              // 确保SVG自适应容器
              const svgElement = element.querySelector('svg');
              if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = 'auto';
                svgElement.removeAttribute('width');
                svgElement.removeAttribute('height');
              }
              
            } catch (error) {
              console.error('Mermaid rendering error:', error);
              element.innerHTML = `<div class="text-red-500 text-sm p-2 border border-red-200 rounded">
                Mermaid渲染失败: ${error}
              </div>`;
            }
          }
        }, 100);
        
      } catch (error) {
        console.error('Failed to load mermaid:', error);
      }
    };

    initMermaid();
    
    // 监听DOM变化以处理动态添加的图表
    const observer = new MutationObserver(initMermaid);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}