import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') !== 'false'; // 默认为dry run
  
  console.log('🧹 Cleanup API called - dryRun:', dryRun);
  
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
    convex.setAuth(await getToken({ template: 'convex' }));
    
    // 执行清理操作
    const result = await convex.mutation(api.cleanup.cleanupReasoningParts, { dryRun });
    
    console.log('✅ Cleanup result:', result);
    
    return NextResponse.json({
      success: true,
      dryRun,
      result,
      message: dryRun 
        ? '分析完成 - 使用 ?dryRun=false 执行实际清理'
        : '清理完成!'
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // POST 方法用于执行实际清理
  const { getToken, userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    convex.setAuth(await getToken({ template: 'convex' }));
    
    // 执行实际清理
    const result = await convex.mutation(api.cleanup.cleanupReasoningParts, { dryRun: false });
    
    return NextResponse.json({
      success: true,
      cleaned: true,
      result,
      message: '清理完成!'
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}