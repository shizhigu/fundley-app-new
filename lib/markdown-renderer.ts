// 完整的金融Memo渲染配置
import MarkdownIt from 'markdown-it';
// @ts-ignore
import katex from 'markdown-it-katex';
// @ts-ignore  
import hljs from 'markdown-it-highlightjs';
// @ts-ignore
import taskLists from 'markdown-it-task-lists';
import mermaid from 'mermaid';

// 配置markdown-it实例
export function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: true,
    xhtmlOut: false,
    breaks: true,
    langPrefix: 'language-',
    linkify: true,
    typographer: true,
    quotes: '""\u2018\u2019',
  });

  // 添加KaTeX数学公式支持
  md.use(katex, {
    throwOnError: false,
    errorColor: '#cc0000',
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ]
  });

  // 添加代码高亮支持
  md.use(hljs, {
    auto: true,
    code: true
  });

  // 添加任务列表支持
  md.use(taskLists, {
    enabled: true,
    label: true,
    labelAfter: false
  });

  // 自定义表格渲染
  md.renderer.rules.table_open = () => {
    return '<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300 text-sm">';
  };

  md.renderer.rules.table_close = () => {
    return '</table></div>';
  };

  md.renderer.rules.th_open = () => {
    return '<th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold">';
  };

  md.renderer.rules.td_open = () => {
    return '<td class="border border-gray-300 px-3 py-2">';
  };

  // 自定义引用块样式
  md.renderer.rules.blockquote_open = () => {
    return '<blockquote class="border-l-4 border-orange-400 bg-orange-50/50 pl-4 py-2 my-4 italic">';
  };

  // 自定义代码块样式和Mermaid支持
  const defaultCodeFence = md.renderer.rules.fence;
  md.renderer.rules.fence = function(tokens, idx, options, env, renderer) {
    const token = tokens[idx];
    const langName = token.info ? token.info.split(' ')[0] : '';
    
    // 处理Mermaid图表
    if (langName === 'mermaid') {
      const mermaidId = 'mermaid-' + Math.random().toString(36).substr(2, 9);
      return `<div class="mermaid-wrapper">
        <div id="${mermaidId}" class="mermaid">${token.content}</div>
      </div>`;
    }
    
    if (defaultCodeFence) {
      let result = defaultCodeFence(tokens, idx, options, env, renderer);
      
      // 为代码块添加自定义样式
      result = result.replace(
        '<pre',
        '<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">' + 
        (langName || 'text') + 
        '</span></div><pre'
      );
      result = result.replace('</pre>', '</pre></div>');
      
      return result;
    }
    
    return '';
  };

  return md;
}

// 导出单例实例
export const markdownRenderer = createMarkdownRenderer();