'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Play, Pause, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock3, Activity, TrendingUp,
  Calendar, Zap, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
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

const StatusIndicator = ({ status }: { status: 'active' | 'paused' | 'success' | 'failed' | 'skipped' }) => {
  const colors = {
    active: 'bg-emerald-500',
    paused: 'bg-gray-500',
    success: 'bg-emerald-500',
    failed: 'bg-red-500',
    skipped: 'bg-yellow-500',
  };

  return (
    <div className="relative">
      <motion.div
        className={cn('h-2 w-2 rounded-full', colors[status])}
        animate={status === 'active' ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {status === 'active' && (
        <motion.div
          className={cn('absolute inset-0 rounded-full', colors[status])}
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.5, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </div>
  );
};

const TaskCard = ({
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
      return formatDistanceToNow(new Date(nextRun), { addSuffix: true });
    } catch {
      return nextRun;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative rounded-xl border backdrop-blur-sm transition-all duration-300",
        task.is_active
          ? "bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-700/50 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10"
          : "bg-slate-900/40 border-slate-800/50 opacity-60 hover:opacity-80"
      )}
    >
      {/* Glow effect on hover for active tasks */}
      {task.is_active && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Task name with status indicator */}
            <div className="flex items-center gap-3">
              <StatusIndicator status={task.is_active ? 'active' : 'paused'} />
              <h3 className="font-semibold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                {task.name}
              </h3>
            </div>

            {/* Cron schedule */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock3 className="h-4 w-4 text-slate-500" />
              <span className="font-medium">{formatCron(task.cron_expression)}</span>
            </div>

            {/* Next run time */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-slate-400">Next: </span>
                <span className="font-medium text-emerald-400">{formatNextRun(task.next_run_at)}</span>
              </div>
              {task.last_run_at && (
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-slate-400">Last: </span>
                  <span className="text-slate-400">{formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-slate-500 pt-1 border-t border-slate-800/50">
                {task.description}
              </p>
            )}

            {/* Execution count */}
            {task.executed_count > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <BarChart3 className="h-3 w-3" />
                <span>Executed {task.executed_count} times</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewHistory}
              className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-400"
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
                  ? "hover:bg-yellow-500/10 hover:text-yellow-400"
                  : "hover:bg-emerald-500/10 hover:text-emerald-400"
              )}
            >
              {task.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Execution history */}
        <AnimatePresence>
          {showHistory && history && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Execution History</p>
                <div className="space-y-2">
                  {history.slice(0, 5).map((run, index) => (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between text-xs bg-slate-800/30 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        {run.status === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        {run.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                        {run.status === 'skipped' && <Clock3 className="h-3 w-3 text-yellow-500" />}
                        <span className="text-slate-400">{new Date(run.started_at).toLocaleString('en-US')}</span>
                      </div>
                      {run.duration_seconds && (
                        <Badge variant="secondary" className="text-xs bg-slate-700/50">
                          {Math.round(run.duration_seconds)}s
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export function SchedulePanelEnhanced() {
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

  useEffect(() => {
    fetchScheduledTasks();
    const interval = setInterval(fetchScheduledTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeTasks = tasks.filter(t => t.is_active);
  const pausedTasks = tasks.filter(t => !t.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-emerald-500"
        >
          <Clock className="h-8 w-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Content */}
      <div className="relative p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              AI Employee Schedule
            </h2>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{activeTasks.length} active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span>{pausedTasks.length} paused</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>{tasks.length} total</span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchScheduledTasks}
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-emerald-500/50"
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </motion.div>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Active Tasks ({activeTasks.length})
            </h3>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {activeTasks.map(task => (
                  <TaskCard
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
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Paused Tasks */}
        {pausedTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Pause className="h-4 w-4 text-slate-500" />
              Paused Tasks ({pausedTasks.length})
            </h3>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pausedTasks.map(task => (
                  <TaskCard
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
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-6"
            >
              <Clock className="h-16 w-16 text-slate-700" />
            </motion.div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No scheduled tasks yet</h3>
            <p className="text-sm text-slate-500">Ask AI to create scheduled tasks in chat</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
