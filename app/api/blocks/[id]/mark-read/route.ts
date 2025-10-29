import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: deliverableId } = await params;

    // Update deliverable as opened
    const result = await db`
      UPDATE deliverables
      SET opened = true
      WHERE id = ${deliverableId}
        AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deliverable: result[0] });
  } catch (error) {
    console.error('Error marking deliverable as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
