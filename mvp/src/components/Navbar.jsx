import { useEffect, useState } from 'react';
import LocationModal from './LocationModal';
import LocationTrigger from './LocationTrigger';

function useFullBleedPage() {
  useEffect(() => {
    if (document.querySelector('style[data-reset="dealdock-fullbleed"]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-reset', 'dealdock-fullbleed');
    style.textContent = `
      html, body { margin: 0; padding: 0; width: 100%; background: #F8F6F1; }
      #root, #__next { width: 100%; }
      * { box-sizing: border-box; }
      body { overflow-x: hidden; }
    `;
    document.head.appendChild(style);
  }, []);
}

const navLinks = ['Categories', 'About Us'];

function Navbar({ onLoginClick, onCategoriesClick, userData, onLogout, onCartClick }) {
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);

  useFullBleedPage();

  useEffect(() => {
    const existingLink = document.querySelector('link[data-fonts="dealdock-fonts"]');
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&family=Inter:wght@400;500;600;700;800&display=swap';
    link.setAttribute('data-fonts', 'dealdock-fonts');
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ivory = '#F8F6F1';
  const cream = '#E9E4DA';
  const taupe = '#8D7966';
  const gold = '#D4A017';
  const ink = '#1F1F1F';

  const pillBorder = `1px solid ${cream}`;
  const softShadow = '0 6px 20px rgba(31,31,31,0.05)';

  const IconCart = (props) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={ink}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );

  return (
    <div
      style={{
        width: '100%',
        background: ivory,
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
        color: ink,
        position: 'relative',
        zIndex: 100,
      }}
    >
      <nav className="main-navbar"
        style={{
          width: '100%',
          background: 'rgba(248, 246, 241, 0.92)',
          borderBottom: `1px solid ${cream}`,
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          boxShadow: scrolled ? '0 8px 24px rgba(31,31,31,0.06)' : 'none',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '14px 36px',
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: ink,
                display: 'grid',
                placeItems: 'center',
                flex: '0 0 auto',
              }}
            >
              <span
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  color: ivory,
                }}
              >
                D
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
              <span
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 500,
                  fontSize: '24px',
                  lineHeight: 1,
                  letterSpacing: '-0.5px',
                  color: ink,
                  whiteSpace: 'nowrap',
                }}
              >
                Deal
              </span>
              <span
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: '24px',
                  lineHeight: 1,
                  letterSpacing: '-0.5px',
                  color: taupe,
                  whiteSpace: 'nowrap',
                }}
              >
                Dock
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '22px', background: cream, flex: '0 0 auto' }} />

          <div style={{ flex: '0 0 auto' }}>
            <LocationTrigger
              selectedLocation={'Provider location'}
              onClick={() => setIsLocationOpen(true)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '30px',
              marginLeft: '8px',
            }}
          >
            {navLinks.map((label) => (
              <a
                key={label}
                href={label === 'Categories' ? '/#categories-section' : '/about'}
                onClick={(e) => {
                  if (label === 'Categories') {
                    e.preventDefault();
                    onCategoriesClick?.();
                  }
                }}
                onMouseEnter={() => setHoveredLink(label)}
                onMouseLeave={() => setHoveredLink(null)}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: hoveredLink === label ? ink : '#5b5347',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  paddingBottom: '3px',
                  borderBottom:
                    hoveredLink === label ? `2px solid ${gold}` : '2px solid transparent',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {label}
              </a>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
            <button
              type="button"
              onClick={userData ? onLogout : onLoginClick}
              style={{
                height: '42px',
                padding: '0 18px',
                border: '1px solid transparent',
                background: 'transparent',
                color: ink,
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                position: 'relative',
                zIndex: 101,
              }}
            >
              {userData ? 'Log out' : 'Login'}
            </button>

            <button
              type="button"
              aria-label="Open recipe basket"
              onClick={onCartClick}
              style={{
                position: 'relative',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: pillBorder,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: softShadow,
                flex: '0 0 auto',
              }}
            >
              <IconCart />

            </button>
          </div>
        </div>
      </nav>

      <LocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}

      />
    </div>
  );
}

export default Navbar;