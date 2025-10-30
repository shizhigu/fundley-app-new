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

    // Verify task belongs to user
    const taskCheck = await sql`
      SELECT id FROM scheduled_tasks
      WHERE id = ${taskId} AND user_id = ${internalUserId}
    `;

    if (taskCheck.length === 0) {
      return new Response('Task not found', { status: 404 });
    }

    // Get execution history
    const history = await sql`
      SELECT
        id,
        task_id,
        status,
        started_at,
        completed_at,
        error_message,
        EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
      FROM scheduled_task_runs
      WHERE task_id = ${taskId}
      ORDER BY started_at DESC
      LIMIT 50
    `;

    return Response.json({
      task_id: taskId,
      runs: history,
      total: history.length,
    });
  } catch (error) {
    console.error('Failed to fetch task history:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
