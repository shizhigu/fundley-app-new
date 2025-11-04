'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Play, Pause, Trash2, CheckCircle2, XCircle,
  Coffee, Sparkles, Calendar, Award, Briefcase,
  Activity, Timer, RotateCw, Zap, CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import cronstrue from 'cronstrue';
import { cn } from '@/lib/utils';

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

interface TaskHistory {
  id: string;
  status: 'success' | 'failed' | 'skipped';
  started_at: string;
  completed_at: string | null;
  error_message?: string;
  duration_seconds?: number;
}

const ZenoAvatar = ({ status }: { status: 'working' | 'idle' | 'break' }) => {
  const statusColors = {
    working: 'from-emerald-400 via-teal-500 to-cyan-500',
    idle: 'from-blue-400 via-indigo-500 to-purple-500',
    break: 'from-gray-300 to-gray-400'
  };

  return (
    <div className="relative">
      <motion.div
        className={cn(
          'h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-br',
          statusColors[status]
        )}
        animate={status === 'working' ? {
          boxShadow: [
            '0 0 0 0 rgba(16, 185, 129, 0.4)',
            '0 0 0 15px rgba(16, 185, 129, 0)',
          ],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Sparkles className="h-10 w-10 text-white" />
      </motion.div>
      {/* Status indicator */}
      <motion.div
        className={cn(
          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-3 border-white",
          status === 'working' && 'bg-emerald-500',
          status === 'idle' && 'bg-blue-500',
          status === 'break' && 'bg-gray-400'
        )}
        animate={status === 'working' ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

const ScheduleItem = ({
  task,
  onToggle,
  onDelete,
  onViewHistory,
  showHistory,
  history
}: {
  task: ScheduledTask;
  onToggle: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  showHistory: boolean;
  history?: TaskHistory[];
}) => {
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
      const date = new Date(nextRun);
      const distance = formatDistanceToNow(date, { addSuffix: true });
      const time = format(date, 'MMM d, h:mm a');
      return `${distance} · ${time}`;
    } catch {
      return nextRun;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "group relative bg-white rounded-xl border transition-all duration-300",
        task.is_active
          ? "border-emerald-200 hover:border-emerald-300 shadow-sm hover:shadow-md"
          : "border-gray-200 bg-gray-50 opacity-60"
      )}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Timeline dot */}
          <div className="flex-shrink-0 mt-1">
            <motion.div
              className={cn(
                "h-3 w-3 rounded-full border-2 border-white shadow-sm",
                task.is_active ? "bg-emerald-500" : "bg-gray-400"
              )}
              animate={task.is_active ? {
                scale: [1, 1.3, 1],
                boxShadow: [
                  '0 0 0 0 rgba(16, 185, 129, 0.4)',
                  '0 0 0 6px rgba(16, 185, 129, 0)',
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2.5">
            {/* Task name */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-base text-gray-900">
                {task.name}
              </h3>
              {!task.is_active && (
                <Badge variant="secondary" className="bg-gray-200 text-gray-600 text-xs">
                  Paused
                </Badge>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Schedule */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <RotateCw className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{formatCron(task.cron_expression)}</span>
              </div>

              {task.is_active && task.next_run_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-emerald-600">{formatNextRun(task.next_run_at)}</span>
                </div>
              )}

              {task.last_run_at && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last completed {formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            {task.executed_count > 0 && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200">
                <Award className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-900">
                  {task.executed_count} completed
                </span>
              </div>
            )}

            {/* History */}
            <AnimatePresence>
              {showHistory && history && history.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="pt-3 mt-3 border-t border-gray-200 space-y-2"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work History</p>
                  <div className="space-y-1.5">
                    {history.slice(0, 5).map((run, index) => (
                      <motion.div
                        key={run.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between py-2 px-2.5 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {run.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : run.status === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className="text-gray-700">
                            {format(new Date(run.started_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {run.duration_seconds && (
                          <span className="text-xs text-gray-500">
                            {Math.round(run.duration_seconds)}s
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewHistory}
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
              title="View history"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className={cn(
                "h-8 w-8 p-0",
                task.is_active
                  ? "hover:bg-amber-50 hover:text-amber-600"
                  : "hover:bg-emerald-50 hover:text-emerald-600"
              )}
              title={task.is_active ? "Pause" : "Resume"}
            >
              {task.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export function AIWorkforcePanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<Record<string, TaskHistory[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchScheduledTasks = async () => {
    try {
      const response = await fetch('/api/scheduled-tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
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
    if (!confirm('Remove this task from Zeno\'s schedule?')) return;

    try {
      await fetch(`/api/scheduled-tasks/${taskId}`, {
        method: 'DELETE',
      });
      fetchScheduledTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  useEffect(() => {
    fetchScheduledTasks();
    const interval = setInterval(fetchScheduledTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeTasks = tasks.filter(t => t.is_active);
  const pausedTasks = tasks.filter(t => !t.is_active);
  const totalCompletedTasks = tasks.reduce((sum, t) => sum + t.executed_count, 0);

  // Determine Zeno's status
  const zenoStatus = activeTasks.length > 0 ? 'working' : tasks.length > 0 ? 'idle' : 'break';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-emerald-500"
        >
          <Sparkles className="h-8 w-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
      {/* Decorative background */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative p-6 space-y-6">
        {/* Zeno Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <ZenoAvatar status={zenoStatus} />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">Zeno</h1>
                  {zenoStatus === 'working' && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                      <CircleDot className="h-3 w-3 mr-1" />
                      Working
                    </Badge>
                  )}
                  {zenoStatus === 'idle' && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      <Coffee className="h-3 w-3 mr-1" />
                      Idle
                    </Badge>
                  )}
                  {zenoStatus === 'break' && (
                    <Badge variant="secondary">Off duty</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {tasks.length === 0
                    ? 'No tasks scheduled'
                    : activeTasks.length > 0
                      ? `Currently managing ${activeTasks.length} active ${activeTasks.length === 1 ? 'task' : 'tasks'}`
                      : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} on hold`
                  }
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={fetchScheduledTasks}
              className="bg-white border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          {tasks.length > 0 && (
            <div className="flex gap-4 mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50 rounded-lg">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="text-lg font-bold text-emerald-700">{activeTasks.length}</div>
                  <div className="text-xs text-emerald-600">Active</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg">
                <Pause className="h-4 w-4 text-gray-600" />
                <div>
                  <div className="text-lg font-bold text-gray-700">{pausedTasks.length}</div>
                  <div className="text-xs text-gray-600">Paused</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-50 rounded-lg">
                <Award className="h-4 w-4 text-amber-600" />
                <div>
                  <div className="text-lg font-bold text-amber-700">{totalCompletedTasks}</div>
                  <div className="text-xs text-amber-600">Completed</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Work Schedule */}
        {tasks.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Work Schedule</h2>
            </div>

            {/* Timeline */}
            <div className="relative space-y-3">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-200 via-gray-200 to-gray-100" />

              <AnimatePresence mode="popLayout">
                {/* Active tasks first */}
                {activeTasks.map(task => (
                  <ScheduleItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskActive(task.id, task.is_active)}
                    onDelete={() => deleteTask(task.id)}
                    onViewHistory={() => {
                      if (selectedTask === task.id) {
                        setSelectedTask(null);
                      } else {
                        fetchTaskHistory(task.id);
                        setSelectedTask(task.id);
                      }
                    }}
                    showHistory={selectedTask === task.id}
                    history={taskHistory[task.id]}
                  />
                ))}

                {/* Paused tasks */}
                {pausedTasks.map(task => (
                  <ScheduleItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskActive(task.id, task.is_active)}
                    onDelete={() => deleteTask(task.id)}
                    onViewHistory={() => {}}
                    showHistory={false}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-6"
            >
              <Calendar className="h-16 w-16 text-gray-300" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No tasks scheduled
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Assign tasks to Zeno in the chat. He'll handle them automatically on schedule.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
