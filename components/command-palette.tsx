'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Sparkles, X, ChevronRight, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  is_mine: boolean;
  source: string;
}

type View = 'main' | 'templates';

export function CommandPalette() {
  const t = useTranslations('commandPalette');
  const tSettings = useTranslations('settings');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('main');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Cmd+K / Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          // Reset to main view when opening
          setView('main');
          setSearch('');
          setSelectedIndex(0);
        }
      }
      // ESC to close or go back
      if (e.key === 'Escape') {
        if (view === 'templates') {
          setView('main');
          setSelectedIndex(0);
        } else {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, view]);

  // Fetch templates when entering templates view
  useEffect(() => {
    if (view === 'templates' && templates.length === 0) {
      fetchTemplates();
    }
  }, [view, templates.length]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Handler functions
  const handleSelectTemplate = useCallback((template: Template) => {
    // Fill template prompt into input box
    // Use the same format as settings template prompt
    const prompt = tSettings('templatePrompt', {
      title: template.title,
      category: template.category || 'general'
    });
    window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
    setIsOpen(false);
  }, [tSettings]);

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

  // Main menu items
  const mainMenuItems = [
    {
      id: 'templates',
      title: t('browseTemplates'),
      description: t('browseTemplatesDesc'),
      icon: FileText,
      action: () => {
        setView('templates');
        setSelectedIndex(0);
      }
    },
    {
      id: 'save-analysis',
      title: t('saveCurrentAnalysis'),
      description: t('saveCurrentAnalysisDesc'),
      icon: Save,
      action: handleSaveCurrentAnalysis
    },
    // TODO: Add more menu items later
  ];

  // Get current items list based on view
  const getCurrentItems = () => {
    if (view === 'main') return mainMenuItems;
    if (view === 'templates') return filteredTemplates;
    return [];
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

    if (view === 'main') {
      const item = mainMenuItems[selectedIndex];
      item.action();
    } else if (view === 'templates') {
      const template = filteredTemplates[selectedIndex];
      handleSelectTemplate(template);
    }
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
                      ref={(el) => (itemRefs.current[index] = el)}
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

            {view === 'templates' && (
              <>
                {isLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Loading templates...
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {search ? 'No templates found' : 'No templates available'}
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Section Header */}
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      ANALYSIS TEMPLATES
                    </div>

                    {/* Template List */}
                    {filteredTemplates.map((template, index) => (
                      <button
                        key={template.id}
                        ref={(el) => (itemRefs.current[index] = el)}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors',
                          'hover:bg-muted/50 border-b border-border/50 last:border-b-0',
                          'focus:outline-none',
                          selectedIndex === index && 'bg-muted/70'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground truncate">
                                {template.title}
                              </span>
                              {template.is_mine && (
                                <span className="px-2 py-0.5 text-xs bg-brand-primary/10 text-brand-primary rounded-md">
                                  Mine
                                </span>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {template.category && (
                                <span className="text-xs text-muted-foreground">
                                  {template.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <Sparkles className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Hint */}
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>↑↓ {t('footer.navigate')} · ↵ {t('footer.select')}{view === 'templates' ? ` · ESC ${t('footer.back')}` : ''}</span>
              <span>ESC {view === 'templates' ? t('footer.back') : t('footer.close')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
