import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';
import { TigrisClient } from '@/lib/tigris-client';
import path from 'path';

// GET - 下载文件
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    const tigris = new TigrisClient();
    const fileBuffer = await tigris.downloadFile(userId, filePath);
    const fileName = path.basename(filePath);

    // 设置响应头
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    response.headers.set('Content-Type', 'application/octet-stream');

    return response;
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
