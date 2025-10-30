'use client';

import { useEffect, useState } from 'react';
import { Clock, Play, Pause, Trash2, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import cronstrue from 'cronstrue';

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  cron_expression: string;
  timezone: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_success_at: string | null;
  is_active: boolean;
  run_once: boolean;
  executed_count: number;
  plan_id?: string;
  depends_on_task_id?: string;
}

interface TaskPlan {
  plan_id: string;
  plan_name: string;
  tasks: ScheduledTask[];
  next_run: string | null;
}

interface TaskHistory {
  id: string;
  status: 'success' | 'failed' | 'skipped';
  started_at: string;
  completed_at: string | null;
  error_message?: string;
  duration_seconds?: number;
}

export function SchedulePanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [plans, setPlans] = useState<TaskPlan[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<Record<string, TaskHistory[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchScheduledTasks = async () => {
    try {
      const response = await fetch('/api/scheduled-tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Failed to fetch scheduled tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskHistory = async (taskId: string) => {
    try {
      const response = await fetch(`/api/scheduled-tasks/${taskId}/history`);
      const data = await response.json();
      setTaskHistory(prev => ({ ...prev, [taskId]: data.runs || [] }));
    } catch (error) {
      console.error('Failed to fetch task history:', error);
    }
  };

  const toggleTaskActive = async (taskId: string, currentActive: boolean) => {
    try {
      await fetch(`/api/scheduled-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchScheduledTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled task?')) return;

    try {
      await fetch(`/api/scheduled-tasks/${taskId}`, {
        method: 'DELETE',
      });
      fetchScheduledTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const togglePlanExpand = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const formatCron = (cron: string): string => {
    try {
      return cronstrue.toString(cron, {
        use24HourTimeFormat: false,
        throwExceptionOnParseError: false
      });
    } catch {
      return cron;
    }
  };

  const formatNextRun = (nextRun: string | null): string => {
    if (!nextRun) return 'Not scheduled';
    try {
      return formatDistanceToNow(new Date(nextRun), { addSuffix: true });
    } catch {
      return nextRun;
    }
  };

  useEffect(() => {
    fetchScheduledTasks();
    const interval = setInterval(fetchScheduledTasks, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const activeTasks = tasks.filter(t => t.is_active);
  const pausedTasks = tasks.filter(t => !t.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Employee Schedule</h2>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks total, {activeTasks.length} active
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchScheduledTasks}>
          <Clock className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Task Plans */}
      {plans.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Task Plans ({plans.length})</h3>
          {plans.map(plan => (
            <Card key={plan.plan_id}>
              <CardHeader className="p-4 cursor-pointer" onClick={() => togglePlanExpand(plan.plan_id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {expandedPlans.has(plan.plan_id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div>
                      <CardTitle className="text-sm">{plan.plan_name}</CardTitle>
                      <CardDescription className="text-xs">
                        {plan.tasks.length} tasks · Next run: {formatNextRun(plan.next_run)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={plan.tasks.every(t => t.is_active) ? 'default' : 'secondary'}>
                    {plan.tasks.every(t => t.is_active) ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </CardHeader>
              {expandedPlans.has(plan.plan_id) && (
                <CardContent className="p-4 pt-0 space-y-2">
                  {plan.tasks.map((task, index) => (
                    <div key={task.id} className="pl-6 border-l-2 border-muted space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{index + 1}. {task.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCron(task.cron_expression)} · {formatNextRun(task.next_run_at)}
                          </p>
                          {task.depends_on_task_id && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Waiting for dependency
                            </Badge>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskActive(task.id, task.is_active);
                            }}
                          >
                            {task.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Active Tasks ({activeTasks.length})</h3>
          {activeTasks.map(task => (
            <Card key={task.id}>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm">{task.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      <div className="flex items-center space-x-2">
                        <Clock3 className="h-3 w-3" />
                        <span>{formatCron(task.cron_expression)}</span>
                      </div>
                      <div className="mt-1 text-xs">
                        Next run: {formatNextRun(task.next_run_at)}
                        {task.last_run_at && ` · Last run: ${formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}`}
                      </div>
                      {task.description && (
                        <div className="mt-1 text-xs text-muted-foreground">{task.description}</div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        fetchTaskHistory(task.id);
                        setSelectedTask(selectedTask === task.id ? null : task.id);
                      }}
                    >
                      <Clock className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleTaskActive(task.id, task.is_active)}
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {selectedTask === task.id && taskHistory[task.id] && (
                <CardContent className="p-4 pt-0 border-t">
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Execution History</p>
                    {taskHistory[task.id].slice(0, 5).map(run => (
                      <div key={run.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          {run.status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          {run.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                          {run.status === 'skipped' && <Clock3 className="h-3 w-3 text-yellow-500" />}
                          <span>{new Date(run.started_at).toLocaleString('en-US')}</span>
                        </div>
                        {run.duration_seconds && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(run.duration_seconds)}s
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Paused Tasks */}
      {pausedTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Paused Tasks ({pausedTasks.length})</h3>
          {pausedTasks.map(task => (
            <Card key={task.id} className="opacity-60">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{task.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleTaskActive(task.id, task.is_active)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No scheduled tasks yet</p>
          <p className="text-xs mt-2">Ask AI to create scheduled tasks in chat</p>
        </div>
      )}
    </div>
  );
}
