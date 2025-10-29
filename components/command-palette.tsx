'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Sparkles, X, ChevronRight, Save, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// Template feature removed - Agent manages code organization freely

type View = 'main';

export function CommandPalette() {
  const t = useTranslations('commandPalette');
  const tSettings = useTranslations('settings');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('main');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Cmd+K / Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => {
          if (!prev) {
            // Opening - reset to main view
            setView('main');
            setSearch('');
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // No dependencies - stable listener

  // Separate effect for custom event listener
  useEffect(() => {
    const handleOpenCommandPalette = () => {
      console.log('📢 Command palette open event received');
      setIsOpen(true);
      setView('main');
      setSearch('');
      setSelectedIndex(0);
    };

    window.addEventListener('open-command-palette', handleOpenCommandPalette);
    return () => window.removeEventListener('open-command-palette', handleOpenCommandPalette);
  }, []); // No dependencies - stable listener

  // Template feature removed - commands directly trigger actions

  const handleSaveCurrentAnalysis = useCallback(async () => {
    try {
      // Get current active block from Redis via API
      const response = await fetch('/api/user/active-block');
      const data = await response.json();

      const blockTitle = data.content?.title;
      const blockId = data.block_id;

      let prompt: string;
      if (!blockId || !blockTitle) {
        prompt = t('savePromptNoBlock');
      } else {
        prompt = t('savePrompt', { title: blockTitle });
      }

      window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to get active block:', error);
      // Fallback
      const prompt = t('savePromptNoBlock');
      window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
      setIsOpen(false);
    }
  }, [t]);

  const handleCreateScheduledTask = useCallback(async () => {
    try {
      // Get current active block from Redis via API
      const response = await fetch('/api/user/active-block');
      const data = await response.json();

      const blockTitle = data.content?.title;
      const blockId = data.block_id;

      let prompt: string;
      if (!blockId || !blockTitle) {
        prompt = t('scheduledTaskPromptNoBlock');
      } else {
        prompt = t('scheduledTaskPrompt', { title: blockTitle });
      }

      window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to get active block:', error);
      // Fallback
      const prompt = t('scheduledTaskPromptNoBlock');
      window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
      setIsOpen(false);
    }
  }, [t]);

  // Main menu items (templates removed - Agent manages code freely)
  const mainMenuItems = [
    {
      id: 'save-analysis',
      title: t('saveCurrentAnalysis'),
      description: t('saveCurrentAnalysisDesc'),
      icon: Save,
      action: handleSaveCurrentAnalysis
    },
    {
      id: 'scheduled-task',
      title: t('createScheduledTask'),
      description: t('createScheduledTaskDesc'),
      icon: Clock,
      action: handleCreateScheduledTask
    },
    // TODO: Add more menu items later
  ];

  // Get current items list
  const getCurrentItems = () => {
    return mainMenuItems;
  };

  const currentItems = getCurrentItems();

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % currentItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + currentItems.length) % currentItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentItems.length, selectedIndex, view]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [view, search]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const handleEnter = () => {
    if (currentItems.length === 0) return;
    const item = mainMenuItems[selectedIndex];
    item.action();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Command Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {view === 'main' && (
              <div className="py-2">
                {mainMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      ref={(el) => { itemRefs.current[index] = el; }}
                      onClick={item.action}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        'hover:bg-muted/50 border-b border-border/50 last:border-b-0',
                        'focus:outline-none',
                        selectedIndex === index && 'bg-muted/70'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-brand-primary flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-foreground">
                            {item.title}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>↑↓ {t('footer.navigate')} · ↵ {t('footer.select')}</span>
              <span>ESC {t('footer.close')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
