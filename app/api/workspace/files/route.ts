import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';
import { TigrisClient } from '@/lib/tigris-client';

// GET - 列出文件
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // 已经是数据库 UUID

    const tigris = new TigrisClient();
    const items = await tigris.listFiles(userId);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// POST - 上传文件
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetPath = formData.get('path') as string || '/';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 构建完整路径
    const fullPath = targetPath === '/'
      ? file.name
      : `${targetPath.replace(/^\//, '')}/${file.name}`;

    // 上传到 Tigris
    const tigris = new TigrisClient();
    await tigris.uploadFile(userId, fullPath, buffer, file.type);

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

// DELETE - 删除文件/文件夹
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const searchParams = request.nextUrl.searchParams;
    const targetPath = searchParams.get('path');

    if (!targetPath || targetPath === '/') {
      return NextResponse.json({ error: 'Cannot delete root' }, { status: 400 });
    }

    const tigris = new TigrisClient();
    await tigris.deleteFile(userId, targetPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
