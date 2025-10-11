'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { User, FileText, Loader2, Users, Lock, Play, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  is_public: boolean;
  is_mine: boolean;
  source: string;
}

type SettingsTab = 'profile' | 'templates';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATES_CACHE_KEY = 'analysis_templates_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (open && activeTab === 'templates') {
      fetchTemplates();
    }
  }, [open, activeTab]);

  const fetchTemplates = async () => {
    // Try to load from cache first
    const cached = localStorage.getItem(TEMPLATES_CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          setTemplates(data);
          return; // Use cached data
        }
      } catch (e) {
        // Invalid cache, fetch fresh
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
        // Cache the result
        localStorage.setItem(TEMPLATES_CACHE_KEY, JSON.stringify({
          data: data.templates,
          timestamp: Date.now()
        }));
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (templateId: string, currentPublic: boolean) => {
    setUpdatingId(templateId);

    try {
      const response = await fetch(`/api/templates/${templateId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !currentPublic })
      });

      const data = await response.json();

      if (data.success) {
        const updatedTemplates = templates.map(t =>
          t.id === templateId ? { ...t, is_public: !currentPublic } : t
        );
        setTemplates(updatedTemplates);
        // Update cache
        localStorage.setItem(TEMPLATES_CACHE_KEY, JSON.stringify({
          data: updatedTemplates,
          timestamp: Date.now()
        }));
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setUpdatingId(null);
    }
  };

  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setEditTitle(template.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveEdit = async (templateId: string) => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      });

      const data = await response.json();

      if (data.success) {
        const updatedTemplates = templates.map(t =>
          t.id === templateId ? { ...t, title: editTitle.trim() } : t
        );
        setTemplates(updatedTemplates);
        // Update cache
        localStorage.setItem(TEMPLATES_CACHE_KEY, JSON.stringify({
          data: updatedTemplates,
          timestamp: Date.now()
        }));
        setEditingId(null);
        setEditTitle('');
        toast.success('Title updated successfully');
      } else {
        toast.error(data.error || 'Failed to update title');
      }
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('Failed to update title');
    }
  };

  const useTemplate = (template: Template) => {
    // Create prefill prompt
    const prompt = `Please use the analysis template "${template.title}" (${template.category}) to analyze: `;

    // Dispatch custom event with the prompt text BEFORE closing dialog
    window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));

    // Close dialog after event is dispatched
    setTimeout(() => {
      onOpenChange(false);
    }, 50);

    toast.success(`Template "${template.title}" ready to use`);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] min-w-[800px] w-fit h-[80vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-48 border-r bg-muted/30 p-4 space-y-2">
            <DialogHeader className="px-2 mb-4">
              <DialogTitle className="text-lg">Settings</DialogTitle>
            </DialogHeader>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto min-w-0">
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
                <p className="text-muted-foreground">
                  Profile settings coming soon...
                </p>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Analysis Templates</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your saved analysis workflows
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No templates yet. Save an analysis in chat to create one.
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[200px]">Title</TableHead>
                              <TableHead className="min-w-[250px]">Description</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Visibility</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {templates.map((template) => (
                              <TableRow key={template.id}>
                                <TableCell className="font-medium">
                                  {editingId === template.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveEdit(template.id);
                                          if (e.key === 'Escape') cancelEdit();
                                        }}
                                        className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => saveEdit(template.id)}
                                      >
                                        ✓
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={cancelEdit}
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 group">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="line-clamp-2 cursor-help flex-1">
                                            {template.title}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                          <p>{template.title}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      {template.is_mine && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => startEdit(template)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="line-clamp-2 text-sm text-muted-foreground cursor-help">
                                        {template.description || '-'}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-md">
                                      <p>{template.description || 'No description'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="whitespace-nowrap">
                                    {template.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={template.is_mine ? 'default' : 'secondary'}
                                    className="whitespace-nowrap"
                                  >
                                    {template.is_mine ? 'Mine' : 'Team'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {template.is_mine ? (
                                    <div className="flex items-center gap-2">
                                      {template.is_public ? (
                                        <Users className="h-4 w-4 text-green-600 shrink-0" />
                                      ) : (
                                        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <Switch
                                        checked={template.is_public}
                                        onCheckedChange={() =>
                                          toggleVisibility(template.id, template.is_public)
                                        }
                                        disabled={updatingId === template.id}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                      <Users className="h-4 w-4 shrink-0" />
                                      Shared
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {new Date(template.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => useTemplate(template)}
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Use this template</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
