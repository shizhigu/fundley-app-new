import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// GET - 下载文件 (proxy to Python API which reads from Machine Volume)
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

    // Remove leading slash if present
    const normalizedPath = filePath.replace(/^\//, '');
    const fileName = path.basename(filePath);

    // Call Python API endpoint which reads from Machine Volume
    const pythonApiUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';
    const response = await fetch(`${pythonApiUrl}/api/v1/analysis/files/${userId}/${normalizedPath}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get file buffer from Python API
    const fileBuffer = await response.arrayBuffer();

    // 设置响应头
    const nextResponse = new NextResponse(fileBuffer);
    nextResponse.headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    nextResponse.headers.set('Content-Type', 'application/octet-stream');

    return nextResponse;
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
