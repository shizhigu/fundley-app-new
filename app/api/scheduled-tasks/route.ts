import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get user's internal ID
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${userId}
    `;

    if (userResult.length === 0) {
      return new Response('User not found', { status: 404 });
    }

    const internalUserId = userResult[0].id;

    // Get all scheduled tasks
    const tasks = await sql`
      SELECT
        id,
        name,
        description,
        instruction,
        cron_expression,
        timezone,
        next_run_at,
        last_run_at,
        last_success_at,
        is_active,
        run_once,
        run_count,
        executed_count,
        plan_id,
        depends_on_task_id,
        created_at,
        updated_at
      FROM scheduled_tasks
      WHERE user_id = ${internalUserId}
      ORDER BY
        is_active DESC,
        next_run_at ASC NULLS LAST,
        created_at DESC
    `;

    // Group by plan_id if exists
    const tasksByPlan: Record<string, any[]> = {};
    const standaloneTasks: any[] = [];

    tasks.forEach((task: any) => {
      if (task.plan_id) {
        if (!tasksByPlan[task.plan_id]) {
          tasksByPlan[task.plan_id] = [];
        }
        tasksByPlan[task.plan_id].push(task);
      } else {
        standaloneTasks.push(task);
      }
    });

    // Build task plans
    const plans = Object.entries(tasksByPlan).map(([plan_id, planTasks]) => ({
      plan_id,
      plan_name: planTasks[0]?.name?.split(' - ')[0] || 'Unnamed Plan',
      tasks: planTasks,
      next_run: planTasks.reduce((earliest, task) => {
        if (!task.next_run_at) return earliest;
        if (!earliest) return task.next_run_at;
        return new Date(task.next_run_at) < new Date(earliest) ? task.next_run_at : earliest;
      }, null),
    }));

    return Response.json({
      tasks: standaloneTasks,
      plans,
      total: tasks.length,
    });
  } catch (error) {
    console.error('Failed to fetch scheduled tasks:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
