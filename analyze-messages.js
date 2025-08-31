const { ConvexHttpClient } = require('convex/browser');
const { api } = require('./convex/_generated/api');

// 这个脚本需要直接读取Convex数据来分析消息结构
async function analyzeMessages() {
  console.log('请在浏览器控制台中运行以下代码来分析消息:');
  
  console.log(`
// 1. 打开 http://localhost:3001
// 2. 在浏览器控制台中运行:

// 获取所有消息并分析parts结构
fetch('/api/chat/permanent/data')
  .then(res => res.json())
  .then(data => {
    const messages = data.messages;
    console.log('📊 总消息数量:', messages.length);
    
    let totalParts = 0;
    let totalPartsSize = 0;
    let reasoningParts = 0;
    let emptyReasoningParts = 0;
    let duplicateReasoningText = new Set();
    
    messages.forEach((msg, idx) => {
      if (msg.parts) {
        totalParts += msg.parts.length;
        
        msg.parts.forEach(part => {
          const partStr = JSON.stringify(part);
          totalPartsSize += partStr.length;
          
          if (part.type === 'reasoning') {
            reasoningParts++;
            
            // 检查空的reasoning parts
            if (!part.text || part.text.trim() === '') {
              emptyReasoningParts++;
            } else {
              // 检查重复的reasoning text
              if (duplicateReasoningText.has(part.text)) {
                console.log('🔄 发现重复reasoning text:', part.text.substring(0, 50) + '...');
              } else {
                duplicateReasoningText.add(part.text);
              }
            }
          }
          
          // 打印前3个消息的详细信息
          if (idx < 3) {
            console.log(\`📋 Message \${idx} part:\`, {
              type: part.type,
              size: partStr.length,
              hasText: !!part.text,
              textLength: part.text?.length || 0,
              textPreview: part.text?.substring(0, 50) + '...'
            });
          }
        });
      }
    });
    
    console.log('📊 Parts分析结果:');
    console.log('- 总消息数量:', messages.length);
    console.log('- 总parts数量:', totalParts);
    console.log('- 平均每消息parts数:', (totalParts / messages.length).toFixed(2));
    console.log('- 总parts大小:', (totalPartsSize / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- 平均每消息大小:', (totalPartsSize / messages.length / 1024).toFixed(2) + 'KB');
    console.log('- Reasoning parts数量:', reasoningParts);
    console.log('- 空reasoning parts数量:', emptyReasoningParts);
    console.log('- Reasoning占比:', ((reasoningParts / totalParts) * 100).toFixed(1) + '%');
    console.log('- 空reasoning占比:', ((emptyReasoningParts / reasoningParts) * 100).toFixed(1) + '%');
    console.log('- 不同reasoning text数量:', duplicateReasoningText.size);
    
    // 检查最大的消息
    let maxSize = 0;
    let maxSizeIndex = 0;
    messages.forEach((msg, idx) => {
      const msgSize = JSON.stringify(msg).length;
      if (msgSize > maxSize) {
        maxSize = msgSize;
        maxSizeIndex = idx;
      }
    });
    
    console.log('📈 最大消息:', {
      index: maxSizeIndex,
      size: (maxSize / 1024).toFixed(2) + 'KB',
      partsCount: messages[maxSizeIndex].parts?.length || 0
    });
  })
  .catch(err => console.error('❌ 错误:', err));
  `);
}

analyzeMessages();