import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSearchSection from '../components/HeroSearchSection';
import CategoryGrid from '../components/CategoryGrid';
import LoginPage from './LoginPage';
import SearchResultsSection from '../components/SearchResultsSection';

function HomePage({ categoriesRef }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleCompareSearch = async (searchQuery) => {
    const finalQuery = searchQuery?.trim();
    if (!finalQuery) return;

    setQuery(finalQuery);
    setResults([]);
    setLoading(true);
    setIsPolling(false);
    setLoadingMessage('');

    try {
      const response = await fetch(`http://localhost:3000/api/search?query=${encodeURIComponent(finalQuery)}`);
      const data = await response.json();

      if (data.isPending) {
        setLoadingMessage(data.message || 'Searching products...');
        setIsPolling(true);
      } else {
        setResults(data.results || []);
        setLoading(false);
      }
    } catch (error) {
      console.error('Search API Error:', error);
      setLoading(false);
      setIsPolling(false);
    }
  };

  useEffect(() => {
    let intervalId;
    if (isPolling && query) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/search?query=${encodeURIComponent(query)}`);
          const data = await response.json();

          if (!data.isPending) {
            setResults(data.results || []);
            setIsPolling(false);
            setLoading(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
          setIsPolling(false);
          setLoading(false);
        }
      }, 4000);
    }
    return () => clearInterval(intervalId);
  }, [isPolling, query]);

  const handleOpenAiPage = (prompt) => {
    navigate('/ai', { state: { prompt: prompt || '' } });
  };

  const hasSearched = Boolean(query?.trim());

  return (
    <>
      <HeroSearchSection
        onCompareSearch={handleCompareSearch}
        onOpenAiPage={handleOpenAiPage}
        hasSearched={hasSearched}
      />

      <SearchResultsSection
        query={query}
        results={results}
        loading={loading}
        isPolling={isPolling}
        loadingMessage={loadingMessage}
      />

      {!hasSearched && (
        <CategoryGrid
          categoryRef={categoriesRef}
          onCategoryClick={(cat) => handleCompareSearch(cat)} 
        />
      )}

      <LoginPage
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(data) => {
          setUserData(data || { loggedIn: true });
          setIsLoginOpen(false);
        }}
      />
    </>
  );
}

export default HomePage;