import { useEffect, useRef, useState } from 'react';
import { ApiError, compareBasket, errorMessage, parseList, type BasketResponse, type User } from '../api';

export default function ListPage({ userData, onLoginClick }: { userData: User | null; onLoginClick: () => void }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<{ item: string; quantity: string }[]>([]);
  const [basket, setBasket] = useState<BasketResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function compare() {
    if (active.current) return;
    if (!text.trim() || text.trim().length > 4000) { setError('Enter a grocery list between 1 and 4000 characters.'); return; }
    if (!userData) { onLoginClick(); return; }
    const controller = new AbortController();
    active.current = controller;
    const deadline = setTimeout(() => controller.abort(), 180_000);
    setBusy(true); setError(''); setBasket(null); setItems([]);
    try {
      const parsed = await parseList(text.trim(), controller.signal);
      if (!parsed.success || !Array.isArray(parsed.items) || !parsed.items.length || parsed.items.length > 20) throw new Error('Enter a list containing 1 to 20 grocery items.');
      setItems(parsed.items);
      for (let attempt = 0; attempt < 45; attempt++) {
        const result = await compareBasket(parsed.items.map(item => item.item), controller.signal);
        if (!result.isPending) { setBasket(result); return; }
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
          const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, 4000);
          if (controller.signal.aborted) abort();
          else controller.signal.addEventListener('abort', abort, { once: true });
        });
      }
      throw new Error('Prices are taking longer than expected. Please try again shortly.');
    } catch (failure) {
      setError(controller.signal.aborted ? 'Comparison stopped. Please try again.' : errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 401) onLoginClick();
    } finally {
      clearTimeout(deadline); active.current = null; setBusy(false);
    }
  }
  return <main className="status-page" style={{ maxWidth: 760, margin: 'auto', padding: 24 }}>
    <h1>Compare a shopping list</h1>
    <p>Paste up to 20 grocery items. We compare one available pack per item; requested quantities are shown for reference. Confirm pack sizes, delivery fees, location and availability with each store.</p>
    <form onSubmit={event => { event.preventDefault(); void compare(); }}>
      <label htmlFor="grocery-list">Your grocery list</label>
      <textarea id="grocery-list" value={text} onChange={event => setText(event.target.value)} maxLength={4000} required rows={6} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'list-error' : undefined} style={{ display: 'block', width: '100%', margin: '12px 0', padding: 12 }} />
      <button type="submit" disabled={busy}>{busy ? 'Comparing prices…' : 'Compare list'}</button>
    </form>
    {error && <p id="list-error" role="alert">{error}</p>}
    {busy && <p role="status">Fetching current offers…</p>}
    {items.length > 0 && <ul>{items.map((item, index) => <li key={index}>{item.item} — requested: {item.quantity}</li>)}</ul>}
    {basket && <section aria-label="Store subtotals"><h2>Available offer subtotals</h2>
      {Object.entries(basket.totals).map(([platform, total]) => <p key={platform}>
        {platform}: ₹{total.totalPrice.toFixed(2)} · {total.itemsFound} items found{total.isComplete ? '' : ' · Incomplete basket'}
      </p>)}
    </section>}
  </main>;
}
