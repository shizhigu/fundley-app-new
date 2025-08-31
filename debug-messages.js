// 消息结构分析脚本 - 查找reasoning parts冗余
const { ConvexHttpClient } = require('convex/browser');

async function analyzeMessages() {
  console.log('🔍 在浏览器控制台中运行以下代码来分析消息parts冗余:');
  console.log('请打开 http://localhost:3001 然后在控制台运行:');
  
  console.log(`
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
    let reasoningTextCounts = new Map();
    
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
              console.log('⚠️  空reasoning part在消息', idx);
            } else {
              // 统计重复的reasoning text
              const text = part.text;
              reasoningTextCounts.set(text, (reasoningTextCounts.get(text) || 0) + 1);
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
    
    console.log('\\n📊 Parts分析结果:');
    console.log('- 总消息数量:', messages.length);
    console.log('- 总parts数量:', totalParts);
    console.log('- 平均每消息parts数:', (totalParts / messages.length).toFixed(2));
    console.log('- 总parts大小:', (totalPartsSize / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- 平均每消息大小:', (totalPartsSize / messages.length / 1024).toFixed(2) + 'KB');
    console.log('- Reasoning parts数量:', reasoningParts);
    console.log('- 空reasoning parts数量:', emptyReasoningParts);
    console.log('- Reasoning占比:', ((reasoningParts / totalParts) * 100).toFixed(1) + '%');
    console.log('- 空reasoning占比:', ((emptyReasoningParts / reasoningParts) * 100).toFixed(1) + '%');
    
    // 分析重复reasoning text
    let duplicates = 0;
    let totalDuplicateSize = 0;
    console.log('\\n🔄 重复reasoning text分析:');
    Array.from(reasoningTextCounts.entries())
      .filter(([text, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // 只显示前10个最重复的
      .forEach(([text, count]) => {
        duplicates += count - 1; // 重复次数
        totalDuplicateSize += text.length * (count - 1);
        console.log(\`  重复\${count}次 (\${text.length}字符): \${text.substring(0, 60)}...\`);
      });
      
    console.log('- 总重复reasoning parts数量:', duplicates);
    console.log('- 重复reasoning造成的浪费:', (totalDuplicateSize / 1024).toFixed(2) + 'KB');
    
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
    
    console.log('\\n📈 最大消息分析:');
    console.log('- 索引:', maxSizeIndex);
    console.log('- 大小:', (maxSize / 1024).toFixed(2) + 'KB');
    console.log('- Parts数量:', messages[maxSizeIndex].parts?.length || 0);
    
    if (messages[maxSizeIndex].parts) {
      const partsByType = {};
      messages[maxSizeIndex].parts.forEach(part => {
        partsByType[part.type] = (partsByType[part.type] || 0) + 1;
      });
      console.log('- Parts分布:', partsByType);
    }
  })
  .catch(err => console.error('❌ 错误:', err));
  `);
}

analyzeMessages();