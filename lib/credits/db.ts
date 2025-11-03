/**
 * Database operations for credit system
 */

import { neon } from '@neondatabase/serverless';
import type { CreditBalance, CreditDeduction, TokenMetrics } from './index';
import { calculateCreditCost, deductCredits } from './index';

const sql = neon(process.env.DATABASE_URL!);

/**
 * Get user's current credit balance with subscription status
 *
 * @param userId User ID (UUID or clerk_user_id)
 * @returns Credit balance with subscription status
 */
export async function getUserCreditBalance(userId: string): Promise<CreditBalance | null> {
  try {
    const result = await sql`
      SELECT
        u.subscription_credits,
        u.addon_credits,
        u.is_internal,
        (COALESCE(u.subscription_credits, 0) + COALESCE(u.addon_credits, 0)) as total_credits,
        CASE
          WHEN s.status = 'active' AND s.monthly_credits > 0 THEN true
          ELSE false
        END as has_active_subscription
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id::TEXT = ${userId} OR u.clerk_user_id = ${userId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      subscription_credits: parseFloat(row.subscription_credits) || 0,
      addon_credits: parseFloat(row.addon_credits) || 0,
      total_credits: parseFloat(row.total_credits) || 0,
      is_internal: row.is_internal || false,
      has_active_subscription: row.has_active_subscription || false,
    };
  } catch (error) {
    console.error('[Credits] Failed to get user credit balance:', error);
    throw error;
  }
}

/**
 * Deduct credits from user's balance and record transaction
 *
 * @param userId User ID
 * @param chatId Chat ID (for audit)
 * @param metrics Token metrics
 * @param agentTier Agent tier used (premium or budget)
 * @param isFreeUsage Whether this is free usage (subscriber fallback benefit)
 * @returns Deduction result
 */
export async function deductUserCredits(
  userId: string,
  chatId: string,
  metrics: TokenMetrics,
  agentTier: 'premium' | 'budget' = 'premium',
  isFreeUsage: boolean = false
): Promise<CreditDeduction | null> {
  try {
    // Step 1: Get current balance
    const balance = await getUserCreditBalance(userId);
    if (!balance) {
      throw new Error('User not found');
    }

    // Step 2: Calculate credit cost (with tier-specific pricing)
    const creditCost = calculateCreditCost(metrics, agentTier);

    let deduction: CreditDeduction;
    let balanceAfter: number;

    // Step 3: Check if this is free usage (subscriber fallback benefit)
    if (isFreeUsage) {
      // Free usage: Record usage but don't charge (subscriber benefit)
      deduction = {
        credits_used: 0,  // FREE!
        subscription_credits_deducted: 0,
        addon_credits_deducted: 0,
        remaining_subscription_credits: balance.subscription_credits,
        remaining_addon_credits: balance.addon_credits,
        source_type: 'subscription',
      };
      balanceAfter = balance.subscription_credits + balance.addon_credits;

      console.log(
        `[Credits] FREE usage for subscriber ${userId} (${agentTier} tier, would have cost ${creditCost.toFixed(4)} credits)`
      );
    } else {
      // Paid usage: Deduct credits as normal
      deduction = deductCredits(balance, creditCost);
      balanceAfter = deduction.remaining_subscription_credits + deduction.remaining_addon_credits;

      // Step 4: Update user's credits in database (skip if internal)
      if (!balance.is_internal) {
        await sql`
          UPDATE users
          SET
            subscription_credits = ${deduction.remaining_subscription_credits},
            addon_credits = ${deduction.remaining_addon_credits}
          WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId}
        `;
      }

      console.log(
        `[Credits] Deducted ${creditCost.toFixed(4)} credits from user ${userId} (${agentTier} tier, ${deduction.source_type})`
      );
    }

    // Step 5: Record transaction for audit (ALWAYS record, even for free usage)
    await sql`
      INSERT INTO credit_transactions (
        user_id,
        chat_id,
        amount,
        transaction_type,
        source_type,
        input_tokens,
        output_tokens,
        reasoning_tokens,
        total_tokens,
        description,
        balance_after,
        agent_tier
      )
      VALUES (
        (SELECT id FROM users WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId} LIMIT 1),
        ${chatId},
        ${isFreeUsage ? 0 : -creditCost}, -- 0 for free usage, negative for paid
        'usage',
        ${deduction.source_type},
        ${metrics.input_tokens},
        ${metrics.output_tokens},
        ${metrics.reasoning_tokens},
        ${metrics.total_tokens},
        ${isFreeUsage
          ? `FREE subscriber fallback (${agentTier} tier, would cost ${creditCost.toFixed(4)} credits)`
          : `Deducted ${creditCost.toFixed(4)} credits (${agentTier} tier, ${deduction.source_type})`
        },
        ${balanceAfter},
        ${agentTier}
      )
    `;

    return deduction;
  } catch (error) {
    console.error('[Credits] Failed to deduct credits:', error);
    throw error;
  }
}

/**
 * Add addon credits to user (for purchases or gifts)
 *
 * @param userId User ID
 * @param credits Credits to add
 * @param description Transaction description
 */
export async function addAddonCredits(
  userId: string,
  credits: number,
  description: string = 'Addon credits purchased'
): Promise<void> {
  try {
    // Get current balance first
    const balance = await getUserCreditBalance(userId);
    if (!balance) {
      throw new Error('User not found');
    }

    // Update addon credits
    await sql`
      UPDATE users
      SET addon_credits = COALESCE(addon_credits, 0) + ${credits}
      WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId}
    `;

    // Calculate balance after adding credits
    const balanceAfter = balance.subscription_credits + balance.addon_credits + credits;

    // Record transaction with balance_after
    await sql`
      INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        source_type,
        description,
        balance_after
      )
      VALUES (
        (SELECT id FROM users WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId} LIMIT 1),
        ${credits},
        'addon_purchase',
        'addon',
        ${description},
        ${balanceAfter}
      )
    `;

    console.log(`[Credits] Added ${credits} addon credits to user ${userId}`);
  } catch (error) {
    console.error('[Credits] Failed to add addon credits:', error);
    throw error;
  }
}

/**
 * Reset subscription credits (called monthly by Stripe webhook)
 *
 * @param userId User ID
 * @param monthlyCredits Credits to reset to
 */
export async function resetSubscriptionCredits(
  userId: string,
  monthlyCredits: number
): Promise<void> {
  try {
    // Get current balance first (to preserve addon_credits)
    const balance = await getUserCreditBalance(userId);
    if (!balance) {
      throw new Error('User not found');
    }

    // Update subscription credits
    await sql`
      UPDATE users
      SET
        subscription_credits = ${monthlyCredits},
        credits_reset_at = NOW() + INTERVAL '1 month'
      WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId}
    `;

    // Calculate balance after reset (subscription reset + existing addon)
    const balanceAfter = monthlyCredits + balance.addon_credits;

    // Record transaction with balance_after
    await sql`
      INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        source_type,
        description,
        balance_after
      )
      VALUES (
        (SELECT id FROM users WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId} LIMIT 1),
        ${monthlyCredits},
        'monthly_reset',
        'subscription',
        ${`Monthly subscription credits reset to ${monthlyCredits}`},
        ${balanceAfter}
      )
    `;

    console.log(`[Credits] Reset subscription credits to ${monthlyCredits} for user ${userId}`);
  } catch (error) {
    console.error('[Credits] Failed to reset subscription credits:', error);
    throw error;
  }
}

/**
 * Get user's credit transaction history with pagination
 *
 * @param userId User ID
 * @param limit Number of transactions to fetch
 * @param offset Number of transactions to skip
 * @returns Transaction history with total count
 */
export async function getCreditTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM credit_transactions
      WHERE user_id = (SELECT id FROM users WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId} LIMIT 1)
    `;
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Get paginated results
    const result = await sql`
      SELECT
        id,
        amount,
        transaction_type,
        source_type,
        input_tokens,
        output_tokens,
        reasoning_tokens,
        total_tokens,
        description,
        balance_after,
        agent_tier,
        created_at
      FROM credit_transactions
      WHERE user_id = (SELECT id FROM users WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId} LIMIT 1)
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const transactions = result.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      transaction_type: row.transaction_type,
      source_type: row.source_type,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      reasoning_tokens: row.reasoning_tokens,
      total_tokens: row.total_tokens,
      description: row.description,
      balance_after: row.balance_after ? parseFloat(row.balance_after) : null,
      agent_tier: row.agent_tier,
      created_at: row.created_at,
    }));

    return { transactions, total };
  } catch (error) {
    console.error('[Credits] Failed to get transaction history:', error);
    throw error;
  }
}

/**
 * Set user as internal (unlimited access)
 *
 * @param userId User ID
 * @param isInternal Whether user is internal
 */
export async function setUserInternal(userId: string, isInternal: boolean): Promise<void> {
  try {
    await sql`
      UPDATE users
      SET is_internal = ${isInternal}
      WHERE id::TEXT = ${userId} OR clerk_user_id = ${userId}
    `;

    console.log(`[Credits] Set user ${userId} internal status to ${isInternal}`);
  } catch (error) {
    console.error('[Credits] Failed to set internal status:', error);
    throw error;
  }
}
