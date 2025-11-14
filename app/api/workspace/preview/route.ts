import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// GET - 预览文件（不强制下载） - proxy to Python API which reads from Machine Volume
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
    const ext = path.extname(fileName).toLowerCase();

    // Call Python API endpoint which reads from Machine Volume
    const pythonApiUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';
    const pythonResponse = await fetch(`${pythonApiUrl}/api/v1/analysis/files/${userId}/${normalizedPath}`);

    if (!pythonResponse.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get file buffer from Python API
    const fileBuffer = await pythonResponse.arrayBuffer();

    // 根据文件类型设置 Content-Type
    let contentType = 'application/octet-stream';

    if (ext === '.html') {
      contentType = 'text/html';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.pptx') {
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (ext === '.ppt') {
      contentType = 'application/vnd.ms-powerpoint';
    } else if (ext === '.txt') {
      contentType = 'text/plain';
    } else if (ext === '.json') {
      contentType = 'application/json';
    } else if (ext === '.css') {
      contentType = 'text/css';
    } else if (ext === '.js') {
      contentType = 'application/javascript';
    }

    // 设置响应头（inline 而不是 attachment）
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // 允许在 iframe 中显示
    response.headers.set('Cache-Control', 'private, max-age=3600'); // 缓存 1 小时

    return response;
  } catch (error) {
    console.error('Error previewing file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
