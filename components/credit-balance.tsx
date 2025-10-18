'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Coins, Loader2 } from 'lucide-react';
import { formatCredits } from '@/lib/credits';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CreditBalance {
  subscription_credits: number;
  addon_credits: number;
  total_credits: number;
  is_internal: boolean;
}

export function CreditBalance() {
  const t = useTranslations('subscription');
  const router = useRouter();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const isLowBalance = balance.total_credits < 5 && !balance.is_internal;
  const displayCredits = formatCredits(balance.total_credits);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/subscription')}
          className={`gap-2 ${isLowBalance ? 'text-orange-600 dark:text-orange-400' : ''}`}
        >
          <Coins className="w-4 h-4" />
          <span className="font-semibold">{displayCredits}</span>
          {balance.is_internal && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {t('internal')}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {t('subscriptionCredits')}:
            </span>
            <span className="font-semibold">
              {formatCredits(balance.subscription_credits)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {t('addonCredits')}:
            </span>
            <span className="font-semibold">
              {formatCredits(balance.addon_credits)}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t">
            <span className="text-muted-foreground">
              {t('totalCredits')}:
            </span>
            <span className="font-bold">
              {displayCredits}
            </span>
          </div>
          {isLowBalance && (
            <p className="text-xs text-orange-600 dark:text-orange-400 pt-1">
              {t('lowBalance')}
            </p>
          )}
          <p className="text-xs text-muted-foreground pt-1">
            {t('clickToManage')}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact version for mobile/smaller displays
 */
export function CreditBalanceCompact() {
  const router = useRouter();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !balance) {
    return null;
  }

  const isLowBalance = balance.total_credits < 5 && !balance.is_internal;
  const displayCredits = formatCredits(balance.total_credits);

  return (
    <button
      onClick={() => router.push('/subscription')}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
        isLowBalance
          ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
          : 'bg-muted hover:bg-muted/80'
      }`}
    >
      <Coins className="w-3.5 h-3.5" />
      {displayCredits}
    </button>
  );
}
