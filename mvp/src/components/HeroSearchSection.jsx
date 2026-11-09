import React, { useEffect, useRef, useState } from 'react';

function useSharedFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-fonts="dealdock-fonts"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&family=Inter:wght@400;500;600;700;800;900&display=swap';
    link.setAttribute('data-fonts', 'dealdock-fonts');
    document.head.appendChild(link);
  }, []);
}

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

function HeroSearchSection({ onCompareSearch, onOpenAiPage, hasSearched = false, loading = false }) {
  useSharedFonts();
  useFullBleedPage();

  const [query, setQuery] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const heroRef = useRef(null);

  const aiSuggestions = [
    'What are you cooking today?',
    'Build and compare my full grocery basket',
    'Find the cheapest ingredients for chicken biryani',
    'Compare weekly essentials for a family',
  ];

  const popularStores = [
    { name: 'Zepto', color: '#6E2CF3', text: 'Z' },
    { name: 'Blinkit', color: '#F4C400', text: 'b', dark: true },
    { name: 'Instamart', color: '#FF7A30', text: 'i' },
    { name: 'BigBasket', color: '#84C225', text: 'bb' },
    { name: 'JioMart', color: '#005AAC', text: 'jm' },
    { name: 'Flipkart', color: '#F8D706', text: 'f', dark: true },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (heroRef.current && !heroRef.current.contains(e.target)) {
        setShowAiPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (hasSearched) {
      setShowAiPanel(false);
    }
  }, [hasSearched]);

  const handleFocus = () => {
    if (!hasSearched && query.trim().length === 0) {
      setShowAiPanel(true);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    const trimmedValue = value.trim();

    setQuery(value);

    if (hasSearched) {
      setShowAiPanel(false);
      return;
    }

    if (trimmedValue.length === 0) {
      setShowAiPanel(true);
    } else {
      setShowAiPanel(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = query.trim();
    if (!value || loading) return;
    setShowAiPanel(false);
    onCompareSearch?.(value);
  };

  return (
    <section
      className={`dd-hero ${hasSearched ? 'dd-hero--searched' : ''}`}
      aria-label="Search and compare grocery prices"
    >
      <style>{`
        .dd-hero {
          --ivory: #F8F6F1;
          --section-darker: #F0EBE1;
          --cream: #E9E4DA;
          --taupe: #8D7966;
          --gold: #D4A017;
          --ink: #1F1F1F;
          --muted: #6E655A;
          --soft: #9A9184;
          --card: #FFFFFF;
          --line: #E6DED4;
          --shadow-soft: 0 10px 25px rgba(31, 31, 31, 0.05);
          --shadow-lift: 0 18px 45px rgba(31, 31, 31, 0.08);
          --font-body: "Inter", "Helvetica Neue", Arial, sans-serif;
          --font-display: "Fraunces", Georgia, serif;

          position: relative;
          width: 100%;
          overflow: hidden;
          background: var(--section-darker);
          padding: 64px 24px 60px;
          font-family: var(--font-body);
          color: var(--ink);
          transition: padding 0.28s ease, background 0.28s ease;
        }

        .dd-hero--searched {
          padding: 18px 24px 16px;
          background: #F8F6F1;
          border-bottom: 1px solid #E9E1D5;
        }

        .dd-hero__glow {
          position: absolute;
          inset: auto auto 20% 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 900px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.12) 0%, rgba(212,160,23,0) 68%);
          pointer-events: none;
          transition: opacity 0.22s ease;
        }

        .dd-hero--searched .dd-hero__glow {
          opacity: 0;
        }

        .dd-hero__inner {
          position: relative;
          z-index: 2;
          max-width: 980px;
          margin: 0 auto;
          text-align: center;
        }

        .dd-hero__title {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 500;
          font-size: clamp(1.5rem, 4.6vw, 3.6rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: var(--ink);
          white-space: nowrap;
          transition: opacity 0.2s ease, max-height 0.28s ease, margin 0.28s ease;
          max-height: 120px;
        }

        .dd-hero--searched .dd-hero__title {
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          margin: 0;
          pointer-events: none;
        }

        .dd-hero__titleAccent {
          font-style: italic;
          color: var(--taupe);
        }

        .dd-searchWrap {
          position: relative;
          margin: 36px auto 0;
          max-width: 780px;
          transition: margin 0.28s ease;
        }

        .dd-hero--searched .dd-searchWrap {
          margin-top: 0;
        }

        .dd-searchShell {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .dd-searchForm {
          width: 100%;
        }

        .dd-searchBar {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 66px;
          padding: 0 8px 0 24px;
          border-radius: 999px;
          background: rgba(255,255,255,0.96);
          border: 1px solid var(--line);
          box-shadow: var(--shadow-lift);
          transition: border-color 0.18s ease, box-shadow 0.18s ease, height 0.22s ease;
        }

        .dd-hero--searched .dd-searchBar {
          box-shadow: 0 8px 22px rgba(31, 31, 31, 0.07);
          background: #FFFFFF;
        }

        .dd-searchBar:focus-within {
          border-color: rgba(141,121,102,0.35);
        }

        .dd-searchIcon {
          width: 20px;
          height: 20px;
          color: #9A8F82;
          flex: 0 0 auto;
        }

        .dd-searchInput {
          flex: 1;
          min-width: 0;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: var(--ink);
          font-family: var(--font-body);
          font-size: 16px;
          font-weight: 500;
          line-height: 66px;
        }

        .dd-searchInput::placeholder {
          color: #9F9387;
        }

        .dd-searchButton {
          height: 50px;
          padding: 0 26px;
          border: none;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--ink);
          color: #F8F6F1;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(31,31,31,0.16);
          flex: 0 0 auto;
          font-family: var(--font-body);
          font-size: 14.5px;
          font-weight: 700;
          transition: transform 0.15s ease;
        }

        .dd-searchButton:hover {
          transform: translateY(-1px);
        }

        .dd-searchButton svg {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
        }

        .dd-popular {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 10px 16px;
          margin-top: 16px;
          transition: opacity 0.2s ease, max-height 0.28s ease, margin 0.28s ease;
          max-height: 120px;
          overflow: hidden;
        }

        .dd-hero--searched .dd-popular {
          opacity: 0;
          max-height: 0;
          margin-top: 0;
          pointer-events: none;
        }

        .dd-popularLabel {
          font-size: 13px;
          color: var(--soft);
          font-weight: 600;
        }

        .dd-store {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 12px 6px 6px;
          border-radius: 999px;
          background: var(--card);
          border: 1px solid var(--line);
          font-size: 13px;
          color: var(--muted);
          font-weight: 600;
        }

        .dd-storeBadge {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          flex: 0 0 auto;
        }

        .dd-storeBadge.darkText {
          color: #1F1F1F;
        }

        .dd-aiPanel {
          margin-top: 10px;
          width: 100%;
          background: rgba(255,255,255,0.98);
          border: 1px solid #ECE3D8;
          border-radius: 24px;
          box-shadow: var(--shadow-soft);
          overflow: hidden;
          text-align: left;
          animation: ddFadeUp 0.18s ease;
        }

        .dd-aiTopAction {
          width: 100%;
          border: none;
          background: transparent;
          padding: 16px 22px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          text-align: left;
          border-bottom: 1px solid #F2EAE0;
        }

        .dd-aiTopAction:hover {
          background: #FCFAF6;
        }

        .dd-aiTopIcon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(212,160,23,0.13);
          color: var(--gold);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .dd-aiTopIcon svg {
          width: 17px;
          height: 17px;
        }

        .dd-aiTopContent {
          flex: 1;
          min-width: 0;
        }

        .dd-aiTopLabel {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--gold);
          margin-bottom: 3px;
        }

        .dd-aiTopTitle {
          font-size: 15px;
          line-height: 1.4;
          color: var(--ink);
          font-weight: 700;
        }

        .dd-aiTopArrow {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #F6EFE2;
          color: var(--ink);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .dd-aiTopArrow svg {
          width: 15px;
          height: 15px;
        }

        .dd-aiList {
          padding: 6px 0;
        }

        .dd-aiItem {
          width: 100%;
          border: none;
          background: transparent;
          padding: 13px 22px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          text-align: left;
          color: #5D5449;
          font-size: 14.5px;
          font-weight: 600;
        }

        .dd-aiItem:hover {
          background: #FCFAF6;
        }

        .dd-aiItemIcon {
          width: 18px;
          height: 18px;
          color: #9B907F;
          flex: 0 0 auto;
        }

        @keyframes ddFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .dd-hero {
            padding: 44px 18px 44px;
          }

          .dd-hero--searched {
            padding: 14px 18px 14px;
          }

          .dd-hero__title {
            font-size: clamp(1.15rem, 6.4vw, 2rem);
            white-space: normal;
          }

          .dd-searchBar {
            height: 56px;
            padding: 0 6px 0 16px;
            gap: 8px;
          }

          .dd-searchInput {
            font-size: 14.5px;
            line-height: 56px;
          }

          .dd-searchButton {
            height: 42px;
            padding: 0 16px;
            font-size: 13px;
          }

          .dd-aiTopAction,
          .dd-aiItem {
            padding-left: 16px;
            padding-right: 16px;
          }

          .dd-aiTopTitle,
          .dd-aiItem {
            font-size: 13.5px;
          }
        }

        @media (max-width: 420px) {
          .dd-hero__title {
            font-size: clamp(0.95rem, 6vw, 1.5rem);
          }

          .dd-searchButton span {
            display: none;
          }

          .dd-searchButton {
            width: 42px;
            height: 42px;
            padding: 0;
            border-radius: 50%;
          }
        }
      `}</style>

      <div className="dd-hero__glow" aria-hidden="true" />

      <div className="dd-hero__inner" ref={heroRef}>
        {!hasSearched && (
          <h1 className="dd-hero__title">
            Compare Real Prices. <span className="dd-hero__titleAccent">Skip the Guesswork.</span>
          </h1>
        )}

        <div className="dd-searchWrap">
          <div className="dd-searchShell">
            <form className="dd-searchForm" onSubmit={handleSubmit}>
              <div className="dd-searchBar">
                <svg
                  className="dd-searchIcon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>

                <input
                  maxLength={120}
                  disabled={loading}
                  className="dd-searchInput"
                  type="text"
                  value={query}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onClick={handleFocus}
                  placeholder="Search a product like milk, paneer, rice..."
                  aria-label="Search grocery product"
                />

                <button className="dd-searchButton" type="submit" aria-label="Search" disabled={loading}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <span>Search</span>
                </button>
              </div>
            </form>

            {!hasSearched && showAiPanel && (
              <div className="dd-aiPanel">
                <button
                  type="button"
                  className="dd-aiTopAction"
                  onClick={() => onOpenAiPage?.()}
                >
                  <div className="dd-aiTopIcon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
                    </svg>
                  </div>

                  <div className="dd-aiTopContent">
                    <div className="dd-aiTopLabel">Ask our AI</div>
                    <div className="dd-aiTopTitle">
                      What are you cooking? Build and compare your entire grocery basket
                    </div>
                  </div>

                  <div className="dd-aiTopArrow">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </button>

                <div className="dd-aiList">
                  {aiSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="dd-aiItem"
                      onClick={() => onOpenAiPage?.(item)}
                    >
                      <svg
                        className="dd-aiItemIcon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </svg>
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!hasSearched && (
              <div className="dd-popular">
                <span className="dd-popularLabel">Popular stores:</span>
                {popularStores.map((store) => (
                  <div key={store.name} className="dd-store">
                    <span
                      className={`dd-storeBadge ${store.dark ? 'darkText' : ''}`}
                      style={{ background: store.color }}
                    >
                      {store.text}
                    </span>
                    <span>{store.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSearchSection;