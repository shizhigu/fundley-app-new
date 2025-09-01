import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('📊 Message analysis API called');
  
  const { getToken, userId } = await auth();
  console.log('👤 User ID:', userId);
  
  if (!userId) {
    console.log('❌ No user ID, returning 401');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    
    // Set authentication token
    const token = await getToken({ template: 'convex' });
    if (token) {
      convex.setAuth(token);
    }
    
    // 获取消息分析结果
    const analysis = await convex.query(api.cleanup.analyzeUserMessages);
    
    if (!analysis) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }
    
    console.log('📊 Analysis result:', analysis);
    
    // 添加建议
    const suggestions = [];
    
    if (analysis.emptyReasoningParts > 0) {
      suggestions.push(`发现${analysis.emptyReasoningParts}个空reasoning parts，建议清理`);
    }
    
    if (parseFloat(analysis.totalSizeMB) > 10) {
      suggestions.push(`消息总大小${analysis.totalSizeMB}MB较大，考虑清理历史数据`);
    }
    
    if (parseFloat(analysis.reasoningPercentage) > 50) {
      suggestions.push(`Reasoning parts占比${analysis.reasoningPercentage}过高，可能存在冗余`);
    }
    
    const result = {
      ...analysis,
      suggestions,
      cleanupRecommended: suggestions.length > 0,
      cleanupUrl: '/api/cleanup?dryRun=true'
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}