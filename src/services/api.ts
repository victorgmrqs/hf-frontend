import { config } from '../config';

const BASE_URL = config.api.baseUrl;

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<{ data: T | null; error: any }> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error || 'Unknown error' };
    }

    return { data: result.data as T, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
