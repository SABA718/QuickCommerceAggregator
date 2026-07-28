import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useRef, useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import AiPage from './pages/AiPage';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';

function AppLayout() {
  const categoriesRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleCategoriesClick = () => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollToCategories: true } });
    } else {
      categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (location.pathname === '/' && location.state?.scrollToCategories) {
      setTimeout(() => {
        categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F8F6F1' }}>
      <Navbar
        onLoginClick={() => setIsLoginOpen(true)}
        onCategoriesClick={handleCategoriesClick}
        userData={userData}
      />

      <Routes>
        <Route
          path="/"
          element={<HomePage categoriesRef={categoriesRef} userData={userData} />}
        />
        <Route path="/ai" element={<AiPage userData={userData} />} />
      </Routes>

      <LoginPage
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(data) => {
          setUserData(data || { loggedIn: true });
          setIsLoginOpen(false);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;