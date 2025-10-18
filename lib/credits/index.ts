/**
 * Credit System Utilities
 *
 * Pricing model:
 * - 1 Credit = $0.2
 * - GPT-5: $1.25/M input, $10/M output/reasoning
 *
 * Plans:
 * - Starter ($99): 50 credits/month
 * - Pro ($249): 200 credits/month
 * - Institutional ($1,249): Unlimited
 */

export interface TokenMetrics {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
}

export interface CreditBalance {
  subscription_credits: number;
  addon_credits: number;
  total_credits: number;
  is_internal: boolean;
}

export interface CreditDeduction {
  credits_used: number;
  subscription_credits_deducted: number;
  addon_credits_deducted: number;
  remaining_subscription_credits: number;
  remaining_addon_credits: number;
  source_type: 'subscription' | 'addon' | 'both';
}

/**
 * Calculate credit cost from token usage
 *
 * Formula:
 * credit_cost = (input * 1.25 + (output + reasoning) * 10) / 1_000_000 / 0.2
 *             = (input * 1.25 + (output + reasoning) * 10) / 200_000
 *
 * @param metrics Token usage metrics
 * @returns Credit cost (can be fractional)
 */
export function calculateCreditCost(metrics: TokenMetrics): number {
  const { input_tokens, output_tokens, reasoning_tokens } = metrics;

  // GPT-5 pricing
  const inputCost = input_tokens * 1.25; // $1.25 per 1M input tokens
  const outputCost = (output_tokens + reasoning_tokens) * 10; // $10 per 1M output/reasoning tokens

  // Total cost in dollars per million tokens
  const totalCostPerMillion = inputCost + outputCost;

  // Convert to credits (1 credit = $0.2)
  const creditCost = totalCostPerMillion / 200_000;

  // Round to 4 decimal places for precision
  return Math.round(creditCost * 10000) / 10000;
}

/**
 * Deduct credits from user's balance (subscription first, then addon)
 *
 * @param currentBalance Current credit balance
 * @param creditsToDeduct Credits to deduct
 * @returns Deduction result with breakdown
 */
export function deductCredits(
  currentBalance: CreditBalance,
  creditsToDeduct: number
): CreditDeduction {
  if (currentBalance.is_internal) {
    // Internal users never deduct credits
    return {
      credits_used: 0,
      subscription_credits_deducted: 0,
      addon_credits_deducted: 0,
      remaining_subscription_credits: currentBalance.subscription_credits,
      remaining_addon_credits: currentBalance.addon_credits,
      source_type: 'subscription',
    };
  }

  let remainingToDeduct = creditsToDeduct;
  let subscriptionDeducted = 0;
  let addonDeducted = 0;
  let sourceType: 'subscription' | 'addon' | 'both' = 'subscription';

  // Step 1: Deduct from subscription credits first
  if (currentBalance.subscription_credits > 0) {
    if (currentBalance.subscription_credits >= remainingToDeduct) {
      // Sufficient subscription credits
      subscriptionDeducted = remainingToDeduct;
      remainingToDeduct = 0;
      sourceType = 'subscription';
    } else {
      // Partial deduction from subscription
      subscriptionDeducted = currentBalance.subscription_credits;
      remainingToDeduct -= currentBalance.subscription_credits;
      sourceType = 'both';
    }
  }

  // Step 2: Deduct remaining from addon credits
  if (remainingToDeduct > 0 && currentBalance.addon_credits > 0) {
    addonDeducted = Math.min(currentBalance.addon_credits, remainingToDeduct);
    remainingToDeduct -= addonDeducted;

    if (subscriptionDeducted === 0) {
      sourceType = 'addon';
    } else {
      sourceType = 'both';
    }
  }

  return {
    credits_used: creditsToDeduct - remainingToDeduct,
    subscription_credits_deducted: subscriptionDeducted,
    addon_credits_deducted: addonDeducted,
    remaining_subscription_credits: currentBalance.subscription_credits - subscriptionDeducted,
    remaining_addon_credits: currentBalance.addon_credits - addonDeducted,
    source_type: sourceType,
  };
}

/**
 * Check if user has sufficient credits
 *
 * @param currentBalance Current credit balance
 * @param requiredCredits Required credits
 * @returns True if user has enough credits (or is internal)
 */
export function hasSufficientCredits(
  currentBalance: CreditBalance,
  requiredCredits: number
): boolean {
  if (currentBalance.is_internal) {
    return true; // Internal users always have credits
  }

  return currentBalance.total_credits >= requiredCredits;
}

/**
 * Get plan details by plan type
 */
export const PLAN_DETAILS = {
  starter: {
    name: 'Starter',
    price: 99,
    monthly_credits: 50,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
  },
  pro: {
    name: 'Pro',
    price: 249,
    monthly_credits: 200,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
  },
  institutional: {
    name: 'Institutional',
    price: 1249,
    monthly_credits: 999999, // Effectively unlimited
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_INSTITUTIONAL_PRICE_ID || '',
  },
} as const;

export type PlanType = keyof typeof PLAN_DETAILS;

/**
 * Estimate token usage that can be covered by credits
 *
 * @param credits Available credits
 * @returns Estimated tokens (assuming average 50/50 input/output mix)
 */
export function estimateTokensFromCredits(credits: number): number {
  // Average cost: (1.25 + 10) / 2 = 5.625 per M tokens
  // 1 credit = $0.2
  // Tokens per credit = 0.2 / (5.625 / 1_000_000) ≈ 35,556 tokens
  const avgCostPerMTokens = (1.25 + 10) / 2;
  const tokensPerCredit = (0.2 / avgCostPerMTokens) * 1_000_000;
  return Math.floor(credits * tokensPerCredit);
}

/**
 * Format credits for display
 *
 * @param credits Credit amount
 * @returns Formatted string (e.g., "12.5" or "∞" for unlimited)
 */
export function formatCredits(credits: number): string {
  if (credits >= 999999) {
    return '∞'; // Unlimited
  }

  if (credits % 1 === 0) {
    return credits.toString(); // Whole number
  }

  return credits.toFixed(2); // Decimal with 2 places
}
