/**
 * API Client Helpers
 * Утилиты для обработки ответов от API на клиенте
 */

import { AppError, ErrorType, formatError } from './errors';

// ============================================================================
// ТИПЫ ДЛЯ API ОТВЕТОВ
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: AppError;
  success?: boolean;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  type?: ErrorType;
  details?: string;
  field?: string;
  code?: string;
}

// ============================================================================
// ОБРАБОТКА ОТВЕТОВ ОТ API
// ============================================================================

/**
 * Обрабатывает ответ от API и возвращает данные или ошибку
 */
export async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json();

    if (!response.ok) {
      // Это ошибка от API
      const apiError: ApiErrorResponse = data;

      const error: AppError = {
        type: apiError.type || ErrorType.UNKNOWN,
        message: apiError.error || 'Произошла ошибка на сервере',
        details: apiError.details,
        field: apiError.field,
        code: apiError.code,
      };

      return { error };
    }

    // Успешный ответ
    return { data, success: true };
  } catch (error) {
    // Ошибка парсинга JSON или другая ошибка
    return {
      error: formatError(error),
    };
  }
}

/**
 * Делает POST запрос с FormData
 */
export async function postFormData<T>(
  url: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    return await handleApiResponse<T>(response);
  } catch (error) {
    return {
      error: formatError(error),
    };
  }
}

/**
 * Делает POST запрос с JSON данными
 */
export async function postJSON<T>(
  url: string,
  data: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleApiResponse<T>(response);
  } catch (error) {
    return {
      error: formatError(error),
    };
  }
}

/**
 * Делает DELETE запрос
 */
export async function deleteRequest<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });

    return await handleApiResponse<T>(response);
  } catch (error) {
    return {
      error: formatError(error),
    };
  }
}

/**
 * Делает PUT запрос с JSON данными
 */
export async function putJSON<T>(
  url: string,
  data: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleApiResponse<T>(response);
  } catch (error) {
    return {
      error: formatError(error),
    };
  }
}

/**
 * Делает GET запрос
 */
export async function getRequest<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);

    return await handleApiResponse<T>(response);
  } catch (error) {
    return {
      error: formatError(error),
    };
  }
}

// ============================================================================
// REACT HOOKS ДЛЯ РАБОТЫ С API
// ============================================================================

import { useState, useCallback } from 'react';

export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
}

export function useApi<T>(options?: UseApiOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (apiCall: () => Promise<ApiResponse<T>>) => {
      setLoading(true);
      setError(null);

      const response = await apiCall();

      setLoading(false);

      if (response.error) {
        setError(response.error);
        options?.onError?.(response.error);
        return null;
      }

      setData(response.data || null);
      options?.onSuccess?.(response.data);
      return response.data;
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    clearError,
    reset,
  };
}

// ============================================================================
// СПЕЦИАЛИЗИРОВАННЫЕ ХУКИ
// ============================================================================

/**
 * Хук для DELETE запросов
 */
export function useDelete(url: string, options?: UseApiOptions) {
  const api = useApi<{ success: boolean }>(options);

  const deleteItem = useCallback(async () => {
    return await api.execute(() => deleteRequest(url));
  }, [url, api]);

  return {
    ...api,
    deleteItem,
  };
}

/**
 * Хук для POST запросов с JSON
 */
export function usePostJSON<T, D = any>(url: string, options?: UseApiOptions) {
  const api = useApi<T>(options);

  const post = useCallback(
    async (data: D) => {
      return await api.execute(() => postJSON<T>(url, data));
    },
    [url, api]
  );

  return {
    ...api,
    post,
  };
}

/**
 * Хук для POST запросов с FormData
 */
export function usePostFormData<T>(url: string, options?: UseApiOptions) {
  const api = useApi<T>(options);

  const post = useCallback(
    async (formData: FormData) => {
      return await api.execute(() => postFormData<T>(url, formData));
    },
    [url, api]
  );

  return {
    ...api,
    post,
  };
}

/**
 * Хук для DELETE запросов с динамическим ID
 * Использование: const { del } = useDeleteJSON('/api/users')
 * Вызов: await del(userId)
 */
export function useDeleteJSON(baseUrl: string, options?: UseApiOptions) {
  const api = useApi<{ success: boolean }>(options);

  const del = useCallback(
    async (id: string) => {
      const url = `${baseUrl}/${id}`;
      return await api.execute(() => deleteRequest(url));
    },
    [baseUrl, api]
  );

  return {
    ...api,
    del,
  };
}
