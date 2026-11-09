import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import AiPage from './pages/Aipage';
import ListPage from './pages/ListPage';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { getSession, logout, errorMessage } from './api';

function AppLayout() {
  const categoriesRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    let active = true;
    getSession().then(data => { if (active) setUserData(data.user); }).catch(error => {
      if (active && error.status !== 401) setAuthError(errorMessage(error));
    }).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  const handleCategoriesClick = () => {
    if (location.pathname !== '/') navigate('/', { state: { scrollToCategories: true } });
    else categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    if (location.pathname === '/' && location.state?.scrollToCategories) {
      const timer = setTimeout(() => categoriesRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return () => clearTimeout(timer);
    }
  }, [location]);
  const handleLogout = async () => {
    try { await logout(); setUserData(null); setAuthError(''); navigate('/'); }
    catch (error) { setAuthError(errorMessage(error)); }
  };
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F8F6F1' }}>
      <Navbar onLoginClick={() => setIsLoginOpen(true)} onCategoriesClick={handleCategoriesClick}
        userData={userData} onLogout={handleLogout} onCartClick={() => navigate('/ai')} />
      {authError && <p className="app-message" role="alert">{authError}</p>}
      <Routes>
        <Route path="/" element={<HomePage categoriesRef={categoriesRef} onLoginClick={() => setIsLoginOpen(true)} />} />
        <Route path="/ai" element={<AiPage userData={userData} authReady={authReady} onLoginClick={() => setIsLoginOpen(true)} />} />
        <Route path="/list" element={<ListPage userData={userData} onLoginClick={() => setIsLoginOpen(true)} />} />
        <Route path="/about" element={<main className="status-page"><h1>About DealDock</h1><p>Compare grocery offers and turn recipes into shopping lists. Prices reflect the provider’s catalog location and may change at checkout. Delivery fees and availability are confirmed by each store.</p><Link to="/">Compare groceries</Link></main>} />
        <Route path="*" element={<main className="status-page"><h1>404 — Page not found</h1><p>That page isn’t available.</p><Link to="/">Return home</Link></main>} />
      </Routes>
      <LoginPage isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={(user) => {
        setUserData(user); setIsLoginOpen(false); setAuthError('');
      }} />
    </div>
  );
}
export default function App() {
  return <ErrorBoundary><BrowserRouter><AppLayout /></BrowserRouter></ErrorBoundary>;
}
