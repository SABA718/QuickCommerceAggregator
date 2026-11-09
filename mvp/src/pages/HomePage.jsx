import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroSearchSection from '../components/HeroSearchSection';
import CategoryGrid from '../components/CategoryGrid';
import SearchResultsSection from '../components/SearchResultsSection';
import { searchProducts, errorMessage } from '../api';

export default function HomePage({ categoriesRef, onLoginClick }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [requiresLogin, setRequiresLogin] = useState(false);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const handleCompareSearch = async (searchQuery) => {
    const finalQuery = searchQuery?.trim();
    if (!finalQuery || finalQuery.length > 120) { setError('Enter a product name between 1 and 120 characters.'); return; }
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setQuery(finalQuery); setResults([]); setLoading(true); setIsPolling(false); setError(''); setRequiresLogin(false);
    try {
      for (let attempt = 0; attempt < 45; attempt++) {
        const data = await searchProducts(finalQuery, controller.signal);
        if (controller.signal.aborted) return;
        if (!data.isPending) { setResults(data.results || []); return; }
        setIsPolling(true); setLoadingMessage(data.message || 'Fetching the latest offers…');
        await new Promise((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
          const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(undefined); }, 4000);
          controller.signal.addEventListener('abort', abort, { once: true });
        });
      }
      setError('Prices are taking longer than expected. Please try again shortly.');
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(errorMessage(failure)); setRequiresLogin(failure.status === 401);
    } finally {
      if (active.current === controller) { setLoading(false); setIsPolling(false); }
    }
  };
  return <>
    <p className="app-message"><Link to="/list">Compare a pasted shopping list</Link></p>
    <HeroSearchSection onCompareSearch={handleCompareSearch} onOpenAiPage={prompt => navigate('/ai', { state: { prompt: prompt || '' } })} hasSearched={Boolean(query)} loading={loading} />
    {error && <div className="app-message" role="alert">{error} {requiresLogin && <button type="button" onClick={onLoginClick}>Log in to fetch fresh prices</button>}</div>}
    {!error && <SearchResultsSection query={query} results={results} loading={loading} isPolling={isPolling} loadingMessage={loadingMessage} />}
    {!query && <CategoryGrid categoryRef={categoriesRef} onCategoryClick={handleCompareSearch} />}
  </>;
}
