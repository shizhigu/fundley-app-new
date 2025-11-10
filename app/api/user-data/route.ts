import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';

const AGENTSOS_API_URL = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Forward GET request to Python backend
    const response = await fetch(`${AGENTSOS_API_URL}/api/user-data?user_id=${userId}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Get form data from request
    const formData = await request.formData();

    // Forward POST request to Python backend with user_id as query param
    const backendFormData = new FormData();

    // Copy file from request
    const file = formData.get('file');
    if (file) {
      backendFormData.append('file', file);
    }

    const response = await fetch(`${AGENTSOS_API_URL}/api/user-data?user_id=${userId}`, {
      method: 'POST',
      body: backendFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Forward DELETE request to Python backend
    const response = await fetch(
      `${AGENTSOS_API_URL}/api/user-data?user_id=${userId}&file_id=${fileId}`,
      { method: 'DELETE' }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
