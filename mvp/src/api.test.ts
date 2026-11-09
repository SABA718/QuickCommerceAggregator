import { afterEach, describe, expect, it, vi } from 'vitest';
import { request, safeProductUrl, sendOtp } from './api';

afterEach(() => vi.unstubAllGlobals());
describe('API transport', () => {
  it('uses same-origin paths and httpOnly session cookies', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await sendOtp('+919876543210');
    expect(fetch).toHaveBeenCalledWith('/api/auth/send-otp', expect.objectContaining({ credentials: 'include', method: 'POST', body: JSON.stringify({ phoneNumber: '+919876543210' }) }));
  });
  it('surfaces rejected authorization and never treats it as results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Log in first' }), { status: 401 })));
    await expect(request('/api/cart')).rejects.toMatchObject({ status: 401, message: 'Log in first' });
  });
  it('rejects malformed successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>', { status: 200 })));
    await expect(request('/api/search')).rejects.toMatchObject({ status: 502 });
  });
  it('rejects unsafe offer URLs', () => {
    expect(safeProductUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeProductUrl('data:text/html,test')).toBeUndefined();
    expect(safeProductUrl('http://example.com')).toBeUndefined();
    expect(safeProductUrl('https://blinkit.com/item')).toBe('https://blinkit.com/item');
  });
});
