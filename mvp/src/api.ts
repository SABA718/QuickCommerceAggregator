export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface User { phoneNumber: string }
export interface Product {
  name: string; platform: string; price: number; quantity?: string;
  image_url?: string; link?: string; time?: string; created_at?: string;
}
export interface SearchResponse { results: Product[]; isPending: boolean; message?: string }
export interface Variant { name: string; price: number; quantity?: string; link?: string }
export interface CartItem { originalQuery: string; image_url?: string; time?: string; variants: Variant[] }
export interface PlatformCart { platform: string; totalPrice: number; items: CartItem[] }
export interface RecipeCart { winner: PlatformCart | null; runnerUps: PlatformCart[]; itemsRequested?: number }
export interface BasketResponse {
  isPending: boolean;
  message?: string;
  totals: Record<string, { totalPrice: number; itemsFound: string; isComplete: boolean }>;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(120_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      signal,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) throw error;
    throw new ApiError('Unable to connect. Check your connection and try again.', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message :
      typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.';
    throw new ApiError(message, response.status);
  }
  if (data === null) throw new ApiError('The server returned an invalid response. Please try again.', 502);
  return data as T;
}

export const sendOtp = (phoneNumber: string) => request<{ success: boolean; phoneNumber?: string; resendAfterSeconds?: number }>('/api/auth/send-otp', {
  method: 'POST', body: JSON.stringify({ phoneNumber }),
});
export const verifyOtp = (phoneNumber: string, otp: string) => request<{ success: boolean; user: User }>('/api/auth/verify-otp', {
  method: 'POST', body: JSON.stringify({ phoneNumber, otp }),
});
export const getSession = () => request<{ success: boolean; user: User | null }>('/api/auth/me');
export const logout = () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
export const searchProducts = (query: string, signal?: AbortSignal) => request<SearchResponse>(`/api/search?query=${encodeURIComponent(query)}`, { signal });
export const getIngredients = (dishName: string, signal?: AbortSignal) => request<{ success: boolean; isPending?: boolean; message?: string; data: RecipeCart }>('/api/get-ingredients', {
  method: 'POST', body: JSON.stringify({ dishName }), signal,
});
export const parseList = (raw_list: string, signal?: AbortSignal) => request<{ success: boolean; items: { item: string; quantity: string }[] }>('/api/parse-list', {
  method: 'POST', body: JSON.stringify({ raw_list }), signal,
});
export const compareBasket = (items: string[], signal?: AbortSignal) => request<BasketResponse>('/api/cart', {
  method: 'POST', body: JSON.stringify({ items }), signal,
});
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return 'The request took too long. Please try again.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export function safeProductUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; }
  catch { return undefined; }
}
