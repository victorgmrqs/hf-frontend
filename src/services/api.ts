import { config } from '../config';

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  baseUrl: string = config.api.baseUrl,
): Promise<{ data: T | null; error: unknown }> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // 204 No Content (ex.: DELETE) não tem corpo — response.json() lançaria.
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error || 'Unknown error' };
    }

    return { data: result.data as T, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
