/**
 * Simple timeout wrapper for AI tools to prevent blocking
 * Adds 30-second timeout protection with graceful error handling
 */

export const withTimeout = <T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> => {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
    )
  ]);
};

export const safeExecute = async <T>(
  operation: () => Promise<T>,
  fallbackResult?: T
): Promise<T | { error: string; recoverable: boolean }> => {
  try {
    return await withTimeout(operation);
  } catch (error: any) {
    const errorMessage = error?.message || 'Tool execution failed';
    
    // Return fallback if provided
    if (fallbackResult !== undefined) {
      return fallbackResult;
    }
    
    // Return structured error for LLM
    return {
      error: errorMessage,
      recoverable: true
    };
  }
};