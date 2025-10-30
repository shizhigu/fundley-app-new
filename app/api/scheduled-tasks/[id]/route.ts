import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${userId}
    `;

    if (userResult.length === 0) {
      return new Response('User not found', { status: 404 });
    }

    const internalUserId = userResult[0].id;
    const taskId = params.id;

    const taskResult = await sql`
      SELECT * FROM scheduled_tasks
      WHERE id = ${taskId} AND user_id = ${internalUserId}
    `;

    if (taskResult.length === 0) {
      return new Response('Task not found', { status: 404 });
    }

    return Response.json(taskResult[0]);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${userId}
    `;

    if (userResult.length === 0) {
      return new Response('User not found', { status: 404 });
    }

    const internalUserId = userResult[0].id;
    const taskId = params.id;
    const body = await request.json();

    // Only allow updating is_active status
    const { is_active } = body;

    const result = await sql`
      UPDATE scheduled_tasks
      SET is_active = ${is_active}
      WHERE id = ${taskId} AND user_id = ${internalUserId}
      RETURNING *
    `;

    if (result.length === 0) {
      return new Response('Task not found', { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('Failed to update task:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${userId}
    `;

    if (userResult.length === 0) {
      return new Response('User not found', { status: 404 });
    }

    const internalUserId = userResult[0].id;
    const taskId = params.id;

    // Soft delete by setting is_active = false
    const result = await sql`
      UPDATE scheduled_tasks
      SET is_active = false
      WHERE id = ${taskId} AND user_id = ${internalUserId}
      RETURNING *
    `;

    if (result.length === 0) {
      return new Response('Task not found', { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
