import { useState, useEffect, useCallback } from 'react';

interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSQLQuery<T>(
  endpoint: string,
  options: {
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
): UseQueryResult<T> {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, refetchOnMount = true } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(undefined);
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  loading: boolean;
  error: Error | null;
}

export function useSQLMutation<TData, TVariables>(
  endpoint: string,
  options: {
    method?: 'POST' | 'PUT' | 'DELETE';
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  } = {}
): UseMutationResult<TData, TVariables> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { method = 'POST', onSuccess, onError } = options;

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, onSuccess, onError]);

  return {
    mutate,
    loading,
    error,
  };
}