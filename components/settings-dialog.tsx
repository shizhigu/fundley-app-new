'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  CreditCard,
  ExternalLink,
  Sparkles,
  Star,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { type PlanType, formatCredits } from '@/lib/credits';

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

type SettingsTab = 'profile' | 'templates' | 'pricing' | 'subscription' | 'watchlist';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SettingsTab;
}

const TEMPLATES_CACHE_KEY = 'analysis_templates_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function SettingsDialog({ open, onOpenChange, initialTab }: SettingsDialogProps) {
  const t = useTranslations('settings');
  const tPricing = useTranslations('pricing');
  const tSubscription = useTranslations('subscription');

  // Set default tab based on brand or initialTab prop
  const isFundley = process.env.NEXT_PUBLIC_BRAND === 'fundley';
  const defaultTab = initialTab || (isFundley ? 'templates' : 'profile');
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Pricing & Subscription states
  const [pricingLoading, setPricingLoading] = useState<PlanType | null>(null);
  const [creditBalance, setCreditBalance] = useState<any>(null);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [creditHistoryPage, setCreditHistoryPage] = useState(1);
  const [creditHistoryTotal, setCreditHistoryTotal] = useState(0);
  const HISTORY_PAGE_SIZE = 10;
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Watchlist states
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [addSymbols, setAddSymbols] = useState('');
  const [addingSymbols, setAddingSymbols] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState('');

  // Update active tab when initialTab changes (e.g., from Manage button)
  useEffect(() => {
    if (initialTab && open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  useEffect(() => {
    if (open && activeTab === 'templates') {
      fetchTemplates();
    }
    if (open && activeTab === 'profile' && !isFundley) {
      fetchTokenUsage();
    }
    if (open && activeTab === 'subscription' && isFundley) {
      fetchCreditData();
    }
    if (open && activeTab === 'pricing' && isFundley) {
      checkSubscriptionStatus();
    }
    if (open && activeTab === 'watchlist') {
      fetchWatchlist();
    }
  }, [open, activeTab]);

  const checkSubscriptionStatus = async () => {
    setCheckingSubscription(true);
    try {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();

      if (response.ok) {
        setSubscriptionStatus(data);

        // If user has active subscription, redirect to subscription tab
        if (data.hasSubscription) {
          setTimeout(() => {
            setActiveTab('subscription');
            toast.info('You already have an active subscription. Visit "Subscription Management" to change your plan.');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

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

  const fetchCreditData = async (page = 1) => {
    try {
      // Fetch credit balance
      const balanceRes = await fetch('/api/credits/balance');
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setCreditBalance(balanceData);
      }

      // Fetch usage history with pagination
      const offset = (page - 1) * HISTORY_PAGE_SIZE;
      const historyRes = await fetch(
        `/api/credits/history?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`
      );
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setCreditHistory(historyData.transactions || []);
        setCreditHistoryTotal(historyData.total || 0);
        setCreditHistoryPage(page);
      }
    } catch (error) {
      console.error('Error fetching credit data:', error);
      toast.error('Failed to load credit information');
    }
  };

  const handleSubscribe = async (planType: PlanType) => {
    try {
      setPricingLoading(planType);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Open Stripe Checkout in popup window
      const width = 800;
      const height = 900;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      window.open(
        data.url,
        'stripe-checkout',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setPricingLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open customer portal');
      }

      // Open Stripe Customer Portal in popup window
      const width = 900;
      const height = 800;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      window.open(
        data.url,
        'stripe-portal',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to open subscription management'
      );
      setPortalLoading(false);
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
    const prompt = t('templatePrompt', { title: template.title, category: template.category });

    // Dispatch custom event with the prompt text BEFORE closing dialog
    window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));

    // Close dialog after event is dispatched
    setTimeout(() => {
      onOpenChange(false);
    }, 50);

    toast.success(`Template "${template.title}" ready to use`);
  };

  // Watchlist functions
  const fetchWatchlist = async () => {
    setLoadingWatchlist(true);
    try {
      const response = await fetch('/api/watchlist');
      const data = await response.json();
      if (response.ok) {
        setWatchlist(data.watchlist || []);
      } else {
        toast.error('Failed to load watchlist');
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast.error('Failed to load watchlist');
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const handleAddSymbols = async () => {
    if (!addSymbols.trim()) return;

    try {
      setAddingSymbols(true);

      // Parse symbols - split by space, comma, or both
      const symbolsArray = addSymbols
        .split(/[\s,]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      if (symbolsArray.length === 0) {
        return;
      }

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: symbolsArray,
          asset_type: 'stock',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAddSymbols('');
        await fetchWatchlist();

        // Show feedback
        if (result.inserted > 0 && result.skipped > 0) {
          toast.success(
            `Added ${result.inserted} symbol(s). ${result.skipped} already in watchlist.`
          );
        } else if (result.skipped > 0) {
          toast.info(`All symbols already in watchlist.`);
        } else {
          toast.success(`Added ${result.inserted} symbol(s) to watchlist.`);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add symbols');
      }
    } catch (error) {
      console.error('Failed to add symbols:', error);
      toast.error('Failed to add symbols');
    } finally {
      setAddingSymbols(false);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`/api/watchlist?symbol=${symbol}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWatchlist();
        toast.success(`Removed ${symbol} from watchlist`);
      } else {
        toast.error('Failed to remove symbol');
      }
    } catch (error) {
      console.error('Failed to remove symbol:', error);
      toast.error('Failed to remove symbol');
    }
  };

  // Determine which tabs to show based on brand (using isFundley from component state)
  const allTabs = [
    { id: 'profile' as const, label: t('tokenUsage'), icon: User, showFor: ['foga'] },
    { id: 'templates' as const, label: t('templates'), icon: FileText, showFor: ['fundley', 'foga'] },
    { id: 'watchlist' as const, label: 'Watchlist', icon: Star, showFor: ['fundley', 'foga'] },
    { id: 'pricing' as const, label: tPricing('title'), icon: Sparkles, showFor: ['fundley'] },
    { id: 'subscription' as const, label: tSubscription('title'), icon: CreditCard, showFor: ['fundley'] },
  ];

  // Filter tabs based on brand
  const brand = isFundley ? 'fundley' : 'foga';
  const tabs = allTabs.filter(tab => tab.showFor.includes(brand));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[85vh] p-0 gap-0 bg-popover border border-border rounded-lg overflow-hidden">
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-48 shrink-0 border-r border-border bg-background p-4 space-y-1 overflow-y-auto">
            <DialogHeader className="px-2 mb-6">
              <DialogTitle className="text-base font-semibold text-foreground">
                {t('title')}
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
          <div className="flex-1 overflow-y-auto min-w-0 bg-background">
            {activeTab === 'profile' && !isFundley && (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">{t('tokenUsage')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('yourAIStats')}
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
                                <span className="text-sm font-medium">{t('estimatedCost')}</span>
                              </div>
                              <p className="text-4xl font-bold text-foreground">
                                ${estimatedCost.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('basedOnPricing')}
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
                          <span className="text-sm font-medium">{t('totalSessions')}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.total_sessions.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('inputTokens')}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.input_tokens.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('outputTokens')}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.output_tokens.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 text-brand-primary mb-3">
                          <Coins className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('totalTokens')}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {tokenUsage.total_tokens.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="border border-border rounded-lg p-6 bg-background">
                      <h3 className="text-base font-semibold text-foreground mb-6">
                        {t('tokenBreakdown')}
                      </h3>

                      <div className="space-y-5">
                        {/* Input Tokens */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">{t('inputTokens')}</span>
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
                            <span className="text-sm text-muted-foreground">{t('outputTokens')}</span>
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
                                {t('reasoningTokens')}
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
                  <h2 className="text-xl font-semibold text-foreground">{t('analysisTemplates')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('manageWorkflows')}
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
                                {t('title_column')}
                              </TableHead>
                              <TableHead className="min-w-[250px] text-muted-foreground font-medium">
                                {t('description_column')}
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                {t('category_column')}
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                {t('source_column')}
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                {t('visibility_column')}
                              </TableHead>
                              <TableHead className="text-muted-foreground font-medium">
                                {t('created_column')}
                              </TableHead>
                              <TableHead className="min-w-[120px] text-muted-foreground font-medium">
                                {t('action_column')}
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
                                <TableCell className="min-w-[120px]">
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
                                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
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

            {activeTab === 'pricing' && isFundley && (
              <div className="p-8 lg:p-12 bg-[#0A0F1C] min-h-full flex flex-col items-center justify-center">
                {/* Header */}
                <div className="mb-8 text-center max-w-4xl">
                  <div className="inline-block mb-4">
                    <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      No BS Pricing
                    </span>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                    Just credits. Full capability.
                  </h1>
                  <p className="text-lg text-gray-400">
                    Same AI features, same data, same power. Only difference? How many credits you need.
                  </p>
                </div>

                {/* Pricing Table */}
                <div className="w-full max-w-5xl">
                  <div className="bg-[#0F1419] rounded-2xl border border-[#2A2F3E] overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-4 px-8 py-4 border-b border-[#2A2F3E]">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Credits/Mo</div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Price/Mo</div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Action</div>
                    </div>

                    {/* Starter Row */}
                    <div className="grid grid-cols-4 gap-4 px-8 py-6 border-b border-[#2A2F3E] items-center hover:bg-[#1A1F2E]/50 transition-colors">
                      <div>
                        <h3 className="text-xl font-bold text-white">Starter</h3>
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-brand-primary">75</span>
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-white">$99</span>
                      </div>
                      <div className="text-center">
                        <Button
                          className="px-8 py-2 rounded-lg font-semibold text-sm bg-transparent border-2 border-[#2A2F3E] text-white hover:border-brand-primary hover:bg-brand-primary/10 transition-all"
                          variant="outline"
                          onClick={() => handleSubscribe('starter')}
                          disabled={pricingLoading !== null}
                        >
                          {pricingLoading === 'starter' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Start'
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Pro Row - Most Popular */}
                    <div className="grid grid-cols-4 gap-4 px-8 py-6 border-b border-[#2A2F3E] items-center bg-[#1A1F2E] relative">
                      <div className="absolute -top-3 left-8">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary text-white">
                          Most Popular
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Pro</h3>
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-brand-primary">300</span>
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-white">$249</span>
                      </div>
                      <div className="text-center">
                        <Button
                          className="px-8 py-2 rounded-lg font-semibold text-sm bg-brand-primary hover:bg-brand-primary/90 text-white transition-all"
                          onClick={() => handleSubscribe('pro')}
                          disabled={pricingLoading !== null}
                        >
                          {pricingLoading === 'pro' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Start'
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Institutional Row */}
                    <div className="grid grid-cols-4 gap-4 px-8 py-6 items-center hover:bg-[#1A1F2E]/50 transition-colors">
                      <div>
                        <h3 className="text-xl font-bold text-white">Institutional</h3>
                        <p className="text-xs text-gray-400 mt-1">Custom data sources, white-label, API access & dedicated support</p>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-brand-primary">Unlimited</span>
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-white">$1249</span>
                      </div>
                      <div className="text-center">
                        <Button
                          className="px-8 py-2 rounded-lg font-semibold text-sm bg-transparent border-2 border-[#2A2F3E] text-white hover:border-brand-primary hover:bg-brand-primary/10 transition-all"
                          variant="outline"
                          onClick={() => handleSubscribe('institutional')}
                          disabled={pricingLoading !== null}
                        >
                          {pricingLoading === 'institutional' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Contact'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && isFundley && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-xl font-semibold text-foreground">
                    {tSubscription('title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your plan and view usage
                  </p>
                </div>

                {/* Credit Balance Card */}
                <div className="border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 bg-background">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-1">
                        {tSubscription('credits')}
                      </h3>
                      {creditBalance?.is_internal && (
                        <span className="inline-block px-2 py-1 text-xs bg-brand-primary/10 text-brand-primary rounded">
                          {tSubscription('internal')}
                        </span>
                      )}
                    </div>
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                  </div>

                  {creditBalance ? (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {tSubscription('subscriptionCredits')}
                        </p>
                        <p className="text-lg sm:text-xl font-bold">
                          {formatCredits(creditBalance.subscription_credits)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {tSubscription('addonCredits')}
                        </p>
                        <p className="text-lg sm:text-xl font-bold">
                          {formatCredits(creditBalance.addon_credits)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {tSubscription('totalCredits')}
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-brand-primary">
                          {formatCredits(creditBalance.total_credits)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Subscription Management */}
                <div className="border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 bg-background">
                  <h3 className="text-base sm:text-lg font-semibold mb-4">
                    {tSubscription('yourPlan')}
                  </h3>

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">
                        Manage your subscription in Stripe Customer Portal
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Update payment method</li>
                        <li>• Change plan</li>
                        <li>• Cancel subscription</li>
                        <li>• View invoices</li>
                      </ul>
                    </div>

                    <Button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="shrink-0 w-full sm:w-auto"
                    >
                      {portalLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      {tSubscription('manageSubscription')}
                    </Button>
                  </div>

                  {!creditBalance && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-3">
                        Don't have a subscription yet?
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('pricing')}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        View Plans
                      </Button>
                    </div>
                  )}
                </div>

                {/* Usage History */}
                <div className="border border-border rounded-lg bg-background mb-6">
                  <div className="p-4 sm:p-6 border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-semibold">
                        {tSubscription('usageHistory')}
                      </h3>
                      {creditHistoryTotal > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {((creditHistoryPage - 1) * HISTORY_PAGE_SIZE) + 1}-
                          {Math.min(creditHistoryPage * HISTORY_PAGE_SIZE, creditHistoryTotal)} of {creditHistoryTotal}
                        </span>
                      )}
                    </div>
                  </div>

                  {creditHistory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm px-4 sm:px-6">
                      {tSubscription('noHistory')}
                    </p>
                  ) : (
                    <>
                      {/* Scrollable table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-3 sm:px-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                {tSubscription('date')}
                              </th>
                              <th className="text-left py-3 px-3 sm:px-4 text-xs font-semibold text-muted-foreground">
                                {tSubscription('description')}
                              </th>
                              <th className="text-right py-3 px-3 sm:px-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                {tSubscription('creditsUsed')}
                              </th>
                              <th className="text-right py-3 px-3 sm:px-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                {tSubscription('balance')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {creditHistory.map((transaction: any) => (
                              <tr key={transaction.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(transaction.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs">
                                  <div className="line-clamp-2">
                                    {transaction.description}
                                  </div>
                                </td>
                                <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-right font-mono whitespace-nowrap">
                                  <span
                                    className={
                                      transaction.amount < 0
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }
                                  >
                                    {transaction.amount > 0 ? '+' : ''}
                                    {transaction.amount.toFixed(4)}
                                  </span>
                                </td>
                                <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-right font-medium font-mono whitespace-nowrap">
                                  {transaction.balance_after != null
                                    ? formatCredits(transaction.balance_after)
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Pagination - always visible when there are multiple pages */}
                  {creditHistory.length > 0 && creditHistoryTotal > HISTORY_PAGE_SIZE && (
                    <div className="flex items-center justify-between p-3 sm:p-4 border-t border-border gap-2 bg-background">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCreditData(creditHistoryPage - 1)}
                        disabled={creditHistoryPage === 1}
                        className="text-xs"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Page {creditHistoryPage} of {Math.ceil(creditHistoryTotal / HISTORY_PAGE_SIZE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCreditData(creditHistoryPage + 1)}
                        disabled={creditHistoryPage >= Math.ceil(creditHistoryTotal / HISTORY_PAGE_SIZE)}
                        className="text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Watchlist Tab */}
            {activeTab === 'watchlist' && (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">Watchlist Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add and remove symbols from your watchlist
                  </p>
                </div>

                {/* Add Symbols Section */}
                <div className="border border-border rounded-lg p-6 mb-6 bg-background">
                  <h3 className="text-base font-semibold mb-3 text-foreground">Add Symbols</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter stock symbols separated by spaces or commas (e.g., AAPL MSFT GOOGL)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addSymbols}
                      onChange={(e) => setAddSymbols(e.target.value)}
                      placeholder="AAPL, MSFT, GOOGL"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      disabled={addingSymbols}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && addSymbols.trim()) {
                          handleAddSymbols()
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddSymbols}
                      disabled={addingSymbols || !addSymbols.trim()}
                      className="bg-brand-primary text-white hover:bg-brand-primary/90"
                    >
                      {addingSymbols ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Symbols List */}
                <div className="border border-border rounded-lg bg-background">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-foreground">Your Watchlist</h3>
                      <span className="text-sm text-muted-foreground">
                        {watchlist.filter(item => {
                          if (!watchlistSearch.trim()) return true;
                          const searchSymbols = watchlistSearch
                            .split(/[\s,]+/)
                            .map(s => s.trim().toUpperCase())
                            .filter(s => s.length > 0);
                          if (searchSymbols.length === 0) return true;
                          return searchSymbols.some(searchSym =>
                            item.symbol.toUpperCase().includes(searchSym)
                          );
                        }).length} / {watchlist.length} {watchlist.length === 1 ? 'symbol' : 'symbols'}
                      </span>
                    </div>
                    {/* Search Input */}
                    <input
                      type="text"
                      value={watchlistSearch}
                      onChange={(e) => setWatchlistSearch(e.target.value)}
                      placeholder="Search symbols (e.g., AAPL, MSFT, GOOGL)..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  {loadingWatchlist ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : watchlist.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No symbols in your watchlist</p>
                      <p className="text-xs mt-1">Add some symbols above to get started</p>
                    </div>
                  ) : (
                    <>
                      {/* Scrollable table container with max height */}
                      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0 z-10">
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 font-medium text-foreground">Symbol</th>
                              <th className="text-left py-3 px-4 font-medium text-foreground">Asset Type</th>
                              <th className="text-left py-3 px-4 font-medium text-foreground">Added</th>
                              <th className="text-right py-3 px-4 font-medium text-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {watchlist
                              .filter(item => {
                                if (!watchlistSearch.trim()) return true;
                                const searchSymbols = watchlistSearch
                                  .split(/[\s,]+/)
                                  .map(s => s.trim().toUpperCase())
                                  .filter(s => s.length > 0);
                                if (searchSymbols.length === 0) return true;
                                return searchSymbols.some(searchSym =>
                                  item.symbol.toUpperCase().includes(searchSym)
                                );
                              })
                              .map((item: any) => (
                                <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                                  <td className="py-3 px-4 font-medium text-foreground">{item.symbol}</td>
                                  <td className="py-3 px-4 text-muted-foreground">{item.asset_type || 'stock'}</td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {new Date(item.added_at).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveSymbol(item.symbol)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Show message when filtered list is empty */}
                      {watchlist.filter(item => {
                        if (!watchlistSearch.trim()) return true;
                        const searchSymbols = watchlistSearch
                          .split(/[\s,]+/)
                          .map(s => s.trim().toUpperCase())
                          .filter(s => s.length > 0);
                        if (searchSymbols.length === 0) return true;
                        return searchSymbols.some(searchSym =>
                          item.symbol.toUpperCase().includes(searchSym)
                        );
                      }).length === 0 && watchlistSearch.trim() && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No symbols match your search</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
