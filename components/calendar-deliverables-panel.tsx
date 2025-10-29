'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { DeliverableRenderer } from './deliverable-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Database,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatContext } from '@/lib/contexts/chat-context';
import { useTranslations } from 'next-intl';
import { useDeliverableViewStore } from '@/stores/deliverable-view-store';
import { useActiveDeliverable } from '@/lib/hooks/use-active-deliverable';

interface CalendarDeliverablesPanelProps {
  chatId: string;
  className?: string;
  onSwitchToList?: () => void;
}

export function CalendarDeliverablesPanel({
  chatId,
  className = '',
  onSwitchToList,
}: CalendarDeliverablesPanelProps) {
  const t = useTranslations('analysis');
  const { isLoading: isChatStreaming, deliverableToolCalled, switchedDeliverableId } = useChatContext();
  const { activeDeliverableId, setActiveDeliverable } = useDeliverableViewStore();

  const {
    activeDeliverable: redisActiveDeliverable,
    setActive: syncToRedis,
    clearActive: clearRedis,
  } = useActiveDeliverable();

  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailViewBlockId, setDetailViewBlockId] = useState<string | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Track pending switch to prevent Redis overwrite
  const pendingSwitchRef = useRef<string | null>(null);

  // Load blocks
  useEffect(() => {
    loadBlocks();
  }, []);

  // Monitor switch_deliverable tool calls from Redis
  useEffect(() => {
    if (!switchedDeliverableId) return;

    const handleSwitch = async () => {
      pendingSwitchRef.current = 'switching';

      try {
        const response = await fetch('/api/user/active-block');
        if (!response.ok) throw new Error('Failed to fetch from Redis');

        const { block_id, content } = await response.json();

        if (!block_id) {
          pendingSwitchRef.current = null;
          return;
        }

        let targetBlock = blocks.find((b) => b.id === block_id);

        if (!targetBlock) {
          const blocksRes = await fetch('/api/blocks');
          if (blocksRes.ok) {
            const { blocks: allBlocks } = await blocksRes.json();
            targetBlock = allBlocks.find((b: any) => b.id === block_id);
            setBlocks(allBlocks);
          }
        }

        if (targetBlock) {
          setDetailViewBlockId(block_id);
          setActiveDeliverable(block_id, content || targetBlock);
        }

        setTimeout(() => {
          pendingSwitchRef.current = null;
        }, 500);
      } catch (err) {
        console.error('❌ Switch failed:', err);
        pendingSwitchRef.current = null;
      }
    };

    handleSwitch();
  }, [switchedDeliverableId, blocks, setActiveDeliverable]);

  // Poll for new blocks when tool is called and auto-open new blocks
  useEffect(() => {
    if (deliverableToolCalled === 0) return;

    let pollCount = 0;
    const MAX_POLLS = 3;
    const POLL_INTERVAL = 5000;

    const startPolling = async () => {
      for (let i = 0; i < MAX_POLLS; i++) {
        pollCount++;

        const foundNew = await checkForNewBlocks();

        if (foundNew) {
          break;
        }

        if (i < MAX_POLLS - 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
      }
    };

    startPolling();
  }, [deliverableToolCalled]);

  const loadBlocks = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/blocks`);
      if (!response.ok) {
        throw new Error('Failed to fetch blocks');
      }
      const data = await response.json();
      setBlocks(data.blocks || []);
      return true;
    } catch (err) {
      console.error('Failed to load blocks:', err);
      setError('Failed to load analysis blocks');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkForNewBlocks = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/blocks`);
      if (!response.ok) {
        console.error('❌ Polling API error:', response.status);
        return false;
      }
      const data = await response.json();
      const fetchedBlocks = data.blocks || [];

      let foundNewOrUpdated = false;
      let newBlockToOpen: any = null;
      let blockToUpdate: any = null;
      const currentActiveBlockId = activeDeliverableId;

      setBlocks((prevBlocks) => {
        const existingIds = new Set(prevBlocks.map((b) => b.id));
        const uniqueNewBlocks = fetchedBlocks.filter(
          (b: any) => !existingIds.has(b.id),
        );

        if (uniqueNewBlocks.length > 0) {
          foundNewOrUpdated = true;
          // Store the newest block to open after state update
          newBlockToOpen = uniqueNewBlocks[0];
        }

        const updatedList = fetchedBlocks.map((newBlock: any) => {
          const existing = prevBlocks.find((b) => b.id === newBlock.id);
          if (existing) {
            if (
              JSON.stringify(existing.content) !==
              JSON.stringify(newBlock.content)
            ) {
              foundNewOrUpdated = true;

              if (newBlock.id === currentActiveBlockId) {
                blockToUpdate = newBlock;
              }
            }
            // Preserve local 'opened' state (user may have just marked it as read)
            // Only update 'opened' if server has it as true (never downgrade true->false)
            return {
              ...newBlock,
              opened: existing.opened || newBlock.opened,
            };
          }
          return newBlock;
        });

        return updatedList;
      });

      // Update UI after setBlocks completes
      if (newBlockToOpen) {
        setTimeout(() => {
          setDetailViewBlockId(newBlockToOpen.id);
          setActiveDeliverable(newBlockToOpen.id, newBlockToOpen);
        }, 0);
      } else if (blockToUpdate) {
        setTimeout(() => {
          setActiveDeliverable(blockToUpdate.id, blockToUpdate);
        }, 0);
      }

      return foundNewOrUpdated;
    } catch (err) {
      console.error('Failed to poll for blocks:', err);
      return false;
    }
  };

  // Group blocks by date (YYYY-MM-DD) in user's local timezone
  const blocksByDate = useMemo(() => {
    const grouped = new Map<string, any[]>();

    blocks.forEach(block => {
      const utcDate = new Date(block.created_at || block.createdAt);

      // Convert UTC to user's local timezone for grouping
      const year = utcDate.getFullYear();
      const month = String(utcDate.getMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`; // Local timezone date

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      const dateBlocks = grouped.get(dateKey);
      if (dateBlocks) {
        dateBlocks.push(block);
      }
    });

    // Sort blocks within each date by creation time (most recent first)
    grouped.forEach((dateBlocks, dateKey) => {
      dateBlocks.sort((a, b) => {
        const aTime = new Date(a.created_at || a.createdAt).getTime();
        const bTime = new Date(b.created_at || b.createdAt).getTime();
        return bTime - aTime;
      });
    });

    return grouped;
  }, [blocks]);

  // Calendar generation
  const calendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      currentWeek.push(new Date(current));

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    return weeks;
  }, [currentDate]);

  // Get blocks for selected date
  const selectedDateBlocks = useMemo(() => {
    if (!selectedDate) return [];
    return blocksByDate.get(selectedDate) || [];
  }, [selectedDate, blocksByDate]);

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);

    // Format as local date (YYYY-MM-DD) instead of UTC
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Detail block
  const detailBlock = detailViewBlockId
    ? blocks.find((b) => b.id === detailViewBlockId)
    : null;

  // Sync active block when opening detail view
  useEffect(() => {
    if (detailViewBlockId && detailBlock) {
      // Don't sync to Redis if we're in the middle of a switch
      if (pendingSwitchRef.current) {
        return;
      }

      // Only sync if the IDs match (prevents race condition)
      if (detailBlock.id !== detailViewBlockId) {
        return;
      }

      setActiveDeliverable(detailViewBlockId, detailBlock);

      const blockTitle =
        detailBlock.content?.title || detailBlock.title || 'Untitled Block';
      const minimalContent = {
        title: blockTitle,
        content: detailBlock.content,
      };
      syncToRedis(detailViewBlockId, minimalContent, blockTitle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailViewBlockId, detailBlock]);

  // Helper: Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper: Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Helper: Get date key
  const getDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <AnimatePresence mode="wait">
      {detailViewBlockId && detailBlock ? (
        // Detail view
        <motion.div
          key={`detail-${detailViewBlockId}`}
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{
            duration: 0.5,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className={`h-full ${className} flex flex-col`}
        >
          <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                setDetailViewBlockId(null);
                setActiveDeliverable(null, null);
                clearRedis();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
              <span className="text-sm font-medium">Back to calendar</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <h3 className="text-sm font-medium text-muted-foreground truncate flex-1">
              {detailBlock.content?.title || detailBlock.title || 'Analysis Block'}
            </h3>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <DeliverableRenderer
              block={detailBlock}
              isExpanded={true}
              isActive={false}
              onToggle={() => {}}
              onSelect={() => {}}
              onManualRefresh={loadBlocks}
              onUpdate={(updatedBlock) => {
                setBlocks((prev) =>
                  prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)),
                );
              }}
              onDelete={(blockId) => {
                setBlocks((prev) => prev.filter((b) => b.id !== blockId));
                setDetailViewBlockId(null);
              }}
              onPin={async () => {
                await loadBlocks();
              }}
            />
          </div>
        </motion.div>
      ) : (
        // Calendar view
        <motion.div
          key="calendar-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`h-full ${className} flex flex-col overflow-hidden`}
        >
          <div className="p-4 space-y-4 flex-1 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onSwitchToList && (
                  <button
                    type="button"
                    onClick={onSwitchToList}
                    className="flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all border bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20 hover:bg-muted"
                  >
                    <Layers className="h-4 w-4" />
                    List View
                  </button>
                )}
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Calendar View
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Today
                </button>
                <div className="px-3 py-1.5 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900">
                  <span className="text-sm font-medium">
                    {blocks.length} {blocks.length !== 1 ? 'blocks' : 'block'}
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <Skeleton className="h-96 w-full" />
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            ) : blocks.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No blocks yet</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Month navigation */}
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h4 className="text-lg font-semibold">
                    {currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h4>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Calendar grid */}
                <div className="bg-card rounded-lg border overflow-hidden">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 border-b">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div
                        key={day}
                        className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <TooltipProvider delayDuration={300}>
                    {calendar.map((week, weekIdx) => (
                      <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
                        {week.map((date, dayIdx) => {
                          const dateKey = getDateKey(date);
                          const dayBlocks = blocksByDate.get(dateKey) || [];
                          const hasBlocks = dayBlocks.length > 0;
                          const isSelected = selectedDate === dateKey;
                          const isTodayDate = isToday(date);
                          const isCurrentMonthDate = isCurrentMonth(date);

                          const calendarButton = (
                            <button
                              key={dayIdx}
                              type="button"
                              onClick={() => setSelectedDate(dateKey)}
                              className={`
                                relative p-3 border-r last:border-r-0 min-h-[80px] flex flex-col items-start hover:bg-muted/50 transition-colors
                                ${!isCurrentMonthDate ? 'opacity-40' : ''}
                                ${isSelected ? 'bg-primary/10 border-primary' : ''}
                                ${isTodayDate ? 'ring-2 ring-primary ring-inset' : ''}
                              `}
                            >
                              <div className="flex items-center gap-1">
                                <span
                                  className={`
                                    text-sm
                                    ${isTodayDate ? 'font-bold text-primary' : ''}
                                    ${!isCurrentMonthDate ? 'text-muted-foreground' : ''}
                                  `}
                                >
                                  {date.getDate()}
                                </span>
                              </div>
                              {hasBlocks && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {dayBlocks.slice(0, 3).map((block, idx) => (
                                    <div
                                      key={idx}
                                      className="h-1.5 w-1.5 rounded-full bg-primary"
                                    />
                                  ))}
                                  {dayBlocks.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{dayBlocks.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );

                          // Wrap in Tooltip if there are blocks
                          if (hasBlocks) {
                            return (
                              <Tooltip key={dayIdx}>
                                <TooltipTrigger asChild>
                                  {calendarButton}
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  align="start"
                                  className="max-w-sm p-3"
                                >
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      {date.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </p>
                                    <div className="space-y-1.5">
                                      {dayBlocks.slice(0, 5).map((block) => (
                                        <div
                                          key={block.id}
                                          className="text-xs text-foreground border-l-2 border-primary pl-2"
                                        >
                                          {block.content?.title || block.title || 'Untitled Block'}
                                        </div>
                                      ))}
                                      {dayBlocks.length > 5 && (
                                        <p className="text-xs text-muted-foreground italic pl-2">
                                          +{dayBlocks.length - 5} more...
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          // No blocks, just return the button
                          return calendarButton;
                        })}
                      </div>
                    ))}
                  </TooltipProvider>
                </div>

                {/* Selected date blocks */}
                {selectedDate && selectedDateBlocks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      <span className="ml-2 text-muted-foreground">
                        ({selectedDateBlocks.length} {selectedDateBlocks.length === 1 ? 'block' : 'blocks'})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedDateBlocks.map((block) => (
                        <DeliverableRenderer
                          key={block.id}
                          block={block}
                          isExpanded={false}
                          isActive={activeDeliverableId === block.id}
                          onToggle={() => setDetailViewBlockId(block.id)}
                          onSelect={() => {}}
                          onManualRefresh={loadBlocks}
                          onUpdate={(updatedBlock) => {
                            setBlocks((prev) =>
                              prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)),
                            );
                          }}
                          onDelete={(blockId) => {
                            setBlocks((prev) => prev.filter((b) => b.id !== blockId));
                          }}
                          onPin={async () => {
                            await loadBlocks();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && selectedDateBlocks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No blocks on this date
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
