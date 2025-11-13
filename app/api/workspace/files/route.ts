import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';

// GET - 列出文件 (proxy to Python API which uses Machine Volume)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // 已经是数据库 UUID

    // Call Python API endpoint which reads from Machine Volume
    const pythonApiUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';
    const response = await fetch(`${pythonApiUrl}/api/v1/analysis/files/${userId}/list`);

    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}`);
    }

    const data = await response.json();

    // Python API now returns tree structure with items
    return NextResponse.json({ items: data.items || [] });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// POST - 上传文件 (proxy to Python API which writes to Machine Volume)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // 数据库 UUID

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetPath = formData.get('path') as string || '/';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 构建完整路径
    const fullPath = targetPath === '/'
      ? file.name
      : `${targetPath.replace(/^\//, '')}/${file.name}`;

    // Forward to Python API to write to Machine Volume
    const pythonApiUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

    // Create new FormData for Python API
    const pythonFormData = new FormData();
    pythonFormData.append('file', file);
    pythonFormData.append('path', fullPath);

    const response = await fetch(`${pythonApiUrl}/api/v1/analysis/files/${userId}/upload`, {
      method: 'POST',
      body: pythonFormData,
    });

    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      name: file.name,
      size: file.size,
      path: '/' + fullPath,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE - 删除文件/文件夹 (proxy to Python API which deletes from Machine Volume)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // 数据库 UUID

    const searchParams = request.nextUrl.searchParams;
    const targetPath = searchParams.get('path');

    if (!targetPath || targetPath === '/') {
      return NextResponse.json({ error: 'Cannot delete root' }, { status: 400 });
    }

    // Forward to Python API to delete from Machine Volume
    const pythonApiUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${pythonApiUrl}/api/v1/analysis/files/${userId}/delete?path=${encodeURIComponent(targetPath)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
