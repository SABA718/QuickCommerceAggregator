import { useMemo, useState } from 'react';
import { safeProductUrl } from '../api';
import { useLocation } from 'react-router-dom';

function SearchResultsSection({ query, results = [], loading, isPolling, loadingMessage }) {
  const [selectedOffers, setSelectedOffers] = useState({});
  
  // 🌟 NEW: Check if we are currently on the AI Recipe/Basket page
  const location = useLocation();
  const isAiPage = location.pathname === '/ai';

  const getTimeAgo = (dateString) => {
    if (!dateString || Number.isNaN(Date.parse(dateString))) return 'time unavailable';
    const diffInMinutes = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours} hr${diffInHours > 1 ? 's' : ''} ago`;
  };

  const storeTheme = {
    blinkit: { iconBg: '#FACC15', iconColor: '#1F1F1F', short: 'b' },
    zepto: { iconBg: '#7C3AED', iconColor: '#FFFFFF', short: 'z' },
    instamart: { iconBg: '#FF7A30', iconColor: '#FFFFFF', short: 'i' },
    bigbasket: { iconBg: '#84C225', iconColor: '#FFFFFF', short: 'bb' },
    jiomart: { iconBg: '#005AAC', iconColor: '#FFFFFF', short: 'jm' },
    default: { iconBg: '#D1D5DB', iconColor: '#111827', short: 's' },
  };

  const getStoreTheme = (platform = '') => {
    const key = platform.toLowerCase().replace(/\s+/g, '');
    return storeTheme[key] || storeTheme.default;
  };

  const getQuantityText = (item) => item.weight || item.quantity || item.size || item.unit || '';

  const groupedProducts = useMemo(
    () =>
      Object.values(
        (results || []).reduce((acc, item) => {
          const productName = item.name?.trim() || 'Unnamed Product';
          const key = `${productName.toLowerCase()}|${getQuantityText(item)}`;

          if (!acc[key]) {
            acc[key] = {
              name: productName,
              image_url: item.image_url || '',
              quantity: getQuantityText(item),
              created_at: item.created_at,
              offers: [],
            };
          }

          if (!acc[key].image_url && item.image_url) acc[key].image_url = item.image_url;

          acc[key].offers.push({
            platform: item.platform || 'Store',
            price: Number(item.price) || 0,
            time: item.time,
            link: safeProductUrl(item.link),
            created_at: item.created_at,
          });

          return acc;
        }, {})
      ).map((product) => ({
        ...product,
        offers: product.offers.sort((a, b) => (a.price || 0) - (b.price || 0)),
      })),
    [results]
  );

  const platformTotals = useMemo(() => {
    const totals = {};

    groupedProducts.forEach((product) => {
      const selectedPlatform =
        selectedOffers[product.name] || product.offers?.[0]?.platform || '';

      const matchedOffer = product.offers.find((offer) => offer.platform === selectedPlatform);

      if (matchedOffer) {
        const key = matchedOffer.platform;
        totals[key] = (totals[key] || 0) + (Number(matchedOffer.price) || 0);
      }
    });

    return Object.entries(totals)
      .map(([platform, total]) => ({ platform, total }))
      .sort((a, b) => a.total - b.total);
  }, [groupedProducts, selectedOffers]);

  const handleSelectOffer = (productName, platform) => {
    setSelectedOffers((prev) => ({
      ...prev,
      [productName]: platform,
    }));
  };

  if (!query && !loading && !isPolling) return null;

  return (
    <section
      style={{
        padding: '20px 16px',
        maxWidth: '1240px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {isPolling && (
        <div
          style={{
            textAlign: 'center',
            padding: '12px 14px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            color: '#0369a1',
            fontWeight: '700',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          ⏳ {loadingMessage}
        </div>
      )}

      {loading && !isPolling && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '16px',
            color: '#666',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          <div role="status" className="loading-skeleton">Checking prices…</div>
        </div>
      )}

      {/* 🌟 THE FIX: Added isAiPage to the conditional render so it ONLY shows on /ai */}
      {!loading && !isPolling && platformTotals.length > 0 && isAiPage && (
        <div
          style={{
            marginBottom: '18px',
            border: '1px solid #EAEAEA',
            borderRadius: '16px',
            padding: '16px',
            background: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: '800',
              color: '#111111',
              marginBottom: '12px',
            }}
          >
            Selected total by quick commerce
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {platformTotals.map((item) => {
              const theme = getStoreTheme(item.platform);
              return (
                <div
                  key={item.platform}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    border: '1px solid #ECECEC',
                    background: '#FAFAFA',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: theme.iconBg,
                      color: theme.iconColor,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {theme.short}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#111111' }}>
                    {item.platform}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#000000' }}>
                    ₹{item.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ columnWidth: '280px', columnGap: '16px', width: '100%' }}>
        {groupedProducts.length > 0 ? (
          groupedProducts.map((product, index) => {
            const selectedPlatform =
              selectedOffers[product.name] || product.offers?.[0]?.platform || '';

            return (
              <div
                key={`${product.name}-${index}`}
                style={{
                  border: '1px solid #EAEAEA',
                  borderRadius: '16px',
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  marginBottom: '16px',
                  breakInside: 'avoid',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: '#F4F4F4',
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '6px',
                      flexShrink: 0,
                      border: '1px solid #ECECEC',
                    }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ color: '#C2C2C2', fontSize: '10px', fontWeight: '600' }}>
                        Image
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: '15px',
                        lineHeight: '1.4',
                        color: '#000000',
                        fontWeight: '700',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.name}
                    </h3>

                    {product.quantity && (
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#666666',
                          fontWeight: '500',
                        }}
                      >
                        {product.quantity}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {product.offers.map((offer, offerIndex) => {
                    const theme = getStoreTheme(offer.platform);
                    const displayTime = offer.time || 'Check store for delivery';
                    const isSelected = selectedPlatform === offer.platform;

                    return (
                      <button
  key={`${offer.platform}-${offerIndex}`}
  type="button"
  onClick={() => {
    // 1. Keep the existing selection logic for the AI cart calculator
    handleSelectOffer(product.name, offer.platform);
    
    // 2. 🌟 THE FIX: Trigger the "One-tap Redirection" to the product page
    if (offer.link && offer.link !== '#') {
      // Opens the link in a new tab, which triggers app deep-links on mobile
      window.open(offer.link, '_blank', 'noopener,noreferrer');
    }
  }}
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '8px',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'inherit',
    padding: '12px 14px',
    borderRadius: '14px',
    border: isSelected ? '1.5px solid #C9A13B' : '1px solid #F0F0F0',
    background: isSelected ? '#FDF9EF' : '#F9F9F9',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: isSelected ? '0 4px 12px rgba(201, 161, 59, 0.16)' : 'none',
  }}
>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: theme.iconBg,
                              color: theme.iconColor,
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                            }}
                          >
                            {theme.short}
                          </span>

                          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#111111',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {offer.platform}
                            </span>

                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                color: '#666666',
                              }}
                            >
                              {displayTime}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: '800',
                            color: isSelected ? '#8A6A12' : '#000000',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ₹{offer.price}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#9CA3AF',
                    fontWeight: '500',
                  }}
                >
                  Updated {getTimeAgo(product.created_at)}
                </div>
              </div>
            );
          })
        ) : (
          !loading &&
          !isPolling && (
            <div
              style={{
                textAlign: 'center',
                color: '#888',
                padding: '40px 0',
                fontWeight: '600',
                gridColumn: '1 / -1',
              }}
            >
              No products found for "{query}".
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default SearchResultsSection;