import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '@/services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      
      if (response.success) {
        setState({ data: response.data, loading: false, error: null });
        options.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });
        options.onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      options.onError?.(errorMessage);
    }
  }, [apiCall, options.onSuccess, options.onError]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return {
    ...state,
    refetch,
  };
}

export function useApiMutation<T, R>(
  apiCall: (data: T) => Promise<ApiResponse<R>>
) {
  const [state, setState] = useState<{
    data: R | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (data: T) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall(data);
      
      if (response.success) {
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } else {
        const errorMessage = response.message || 'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, [apiCall]);

  return {
    ...state,
    mutate,
  };
} 