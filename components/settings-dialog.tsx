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
import {
  User,
  FileText,
  Loader2,
  Users,
  Lock,
  Play,
  Pencil,
  Coins,
  TrendingUp,
  MessageSquare,
  DollarSign,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

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

interface TokenUsage {
  user_id: string;
  total_sessions: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
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
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    if (open && activeTab === 'templates') {
      fetchTemplates();
    }
    if (open && activeTab === 'profile') {
      fetchTokenUsage();
    }
  }, [open, activeTab]);

  const fetchTokenUsage = async () => {
    setLoadingTokens(true);
    try {
      const response = await fetch('/api/token-usage');
      const data = await response.json();

      if (response.ok) {
        setTokenUsage(data);
      } else {
        console.error('Failed to fetch token usage:', data);
        toast.error('Failed to load token usage');
      }
    } catch (error) {
      console.error('Error fetching token usage:', error);
      toast.error('Failed to load token usage');
    } finally {
      setLoadingTokens(false);
    }
  };

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
        localStorage.setItem(
          TEMPLATES_CACHE_KEY,
          JSON.stringify({
            data: data.templates,
            timestamp: Date.now(),
          })
        );
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
        body: JSON.stringify({ is_public: !currentPublic }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedTemplates = templates.map((t) =>
          t.id === templateId ? { ...t, is_public: !currentPublic } : t
        );
        setTemplates(updatedTemplates);
        // Update cache
        localStorage.setItem(
          TEMPLATES_CACHE_KEY,
          JSON.stringify({
            data: updatedTemplates,
            timestamp: Date.now(),
          })
        );
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
        body: JSON.stringify({ title: editTitle.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedTemplates = templates.map((t) =>
          t.id === templateId ? { ...t, title: editTitle.trim() } : t
        );
        setTemplates(updatedTemplates);
        // Update cache
        localStorage.setItem(
          TEMPLATES_CACHE_KEY,
          JSON.stringify({
            data: updatedTemplates,
            timestamp: Date.now(),
          })
        );
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
      <DialogContent className="max-w-[90vw] min-w-[800px] w-fit h-[80vh] p-0 gap-0 bg-popover border border-border rounded-lg">
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-48 border-r border-border bg-background p-4 space-y-1">
            <DialogHeader className="px-2 mb-6">
              <DialogTitle className="text-base font-semibold text-foreground">
                Settings
              </DialogTitle>
            </DialogHeader>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md
                    text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto min-w-0 bg-background">
            {activeTab === 'profile' && (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">Token Usage</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your AI token consumption statistics
                  </p>
                </div>

                {loadingTokens ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tokenUsage ? (
                  <div className="space-y-6">
                    {/* Cost Calculation - GPT-5 Pricing */}
                    {(() => {
                      const PRICING = {
                        input: 1.25 / 1_000_000, // $1.25 per 1M tokens
                        output: 10.0 / 1_000_000, // $10.00 per 1M tokens (includes reasoning)
                      };

                      // Reasoning tokens are priced as output tokens
                      const totalOutputTokens =
                        tokenUsage.output_tokens + tokenUsage.reasoning_tokens;

                      const estimatedCost =
                        tokenUsage.input_tokens * PRICING.input +
                        totalOutputTokens * PRICING.output;

                      return (
                        <div className="border border-border rounded-lg p-6 bg-background">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <DollarSign className="h-5 w-5" />
                                <span className="text-sm font-medium">Estimated Cost</span>
                              </div>
                              <p className="text-4xl font-bold text-foreground">
                                ${estimatedCost.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Based on GPT-5 pricing ($1.25/1M input, $10/1M output)
                              </p>
                            </div>
                            <div className="text-right space-y-1 text-xs text-muted-foreground">
                              <div>
                                Input: ${(tokenUsage.input_tokens * PRICING.input).toFixed(4)}
                              </div>
                              <div>
                                Output: ${(totalOutputTokens * PRICING.output).toFixed(4)}
                              </div>
                              {tokenUsage.reasoning_tokens > 0 && (
                                <div className="opacity-70">
                                  (incl. {tokenUsage.reasoning_tokens.toLocaleString()} reasoning)
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm font-medium">Total Sessions</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.total_sessions.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Input Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.input_tokens.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Output Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.output_tokens.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-brand-primary mb-3">
                          <Coins className="h-4 w-4" />
                          <span className="text-sm font-medium">Total Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.total_tokens.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="border border-border rounded-lg p-6 bg-background">
                      <h3 className="text-base font-semibold text-foreground mb-6">
                        Token Breakdown
                      </h3>

                      <div className="space-y-5">
                        {/* Input Tokens */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Input Tokens</span>
                            <span className="font-mono font-semibold text-foreground">
                              {tokenUsage.input_tokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-brand-primary h-2 rounded-full transition-all duration-200"
                              style={{
                                width: `${
                                  tokenUsage.total_tokens > 0
                                    ? (tokenUsage.input_tokens / tokenUsage.total_tokens) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Output Tokens */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Output Tokens</span>
                            <span className="font-mono font-semibold text-foreground">
                              {tokenUsage.output_tokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-brand-primary h-2 rounded-full transition-all duration-200"
                              style={{
                                width: `${
                                  tokenUsage.total_tokens > 0
                                    ? (tokenUsage.output_tokens / tokenUsage.total_tokens) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Reasoning Tokens */}
                        {tokenUsage.reasoning_tokens > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">
                                Reasoning Tokens
                              </span>
                              <span className="font-mono font-semibold text-foreground">
                                {tokenUsage.reasoning_tokens.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-brand-primary h-2 rounded-full transition-all duration-200"
                                style={{
                                  width: `${
                                    tokenUsage.total_tokens > 0
                                      ? (tokenUsage.reasoning_tokens / tokenUsage.total_tokens) *
                                        100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    No token usage data available
                  </div>
                )}
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">Analysis Templates</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your saved analysis workflows
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    No templates yet. Save an analysis in chat to create one.
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="border border-border rounded-lg overflow-hidden bg-background">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="min-w-[200px] text-muted-foreground font-medium">
                                Title
                              </TableHead>
                              <TableHead className="min-w-[250px] text-muted-foreground font-medium">
                                Description
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                Category
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                Source
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                Visibility
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                Created
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                Action
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {templates.map((template) => (
                              <TableRow
                                key={template.id}
                                className="border-border hover:bg-muted/50 transition-colors duration-200"
                              >
                                <TableCell className="font-medium text-foreground">
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
                                        className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-brand-primary/50 transition-all duration-200"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-muted"
                                        onClick={() => saveEdit(template.id)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-muted"
                                        onClick={cancelEdit}
                                      >
                                        <X className="h-4 w-4" />
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
                                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted"
                                          onClick={() => startEdit(template)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
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
                                  <Badge
                                    variant="outline"
                                    className="whitespace-nowrap border-border text-muted-foreground"
                                  >
                                    {template.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={template.is_mine ? 'default' : 'secondary'}
                                    className={`
                                      whitespace-nowrap transition-all duration-200
                                      ${
                                        template.is_mine
                                          ? 'bg-brand-primary text-white'
                                          : 'bg-muted text-muted-foreground'
                                      }
                                    `}
                                  >
                                    {template.is_mine ? 'Mine' : 'Team'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {template.is_mine ? (
                                    <div className="flex items-center gap-3">
                                      {template.is_public ? (
                                        <Users className="h-4 w-4 text-brand-primary shrink-0" />
                                      ) : (
                                        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <Switch
                                        checked={template.is_public}
                                        onCheckedChange={() =>
                                          toggleVisibility(template.id, template.is_public)
                                        }
                                        disabled={updatingId === template.id}
                                        className="data-[state=checked]:bg-brand-primary"
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
                                        className="h-8 w-8 p-0 hover:bg-brand-primary/10 hover:text-brand-primary transition-all duration-200"
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
