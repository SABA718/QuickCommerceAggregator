import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoginPage from './LoginPage';

function AiPage({ userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const promptFromState = location.state?.prompt || '';

  const [query, setQuery] = useState(promptFromState);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const allowedPlatformKeys = ['blinkit', 'zepto', 'instamart', 'bigbasket'];

  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [removedIngredients, setRemovedIngredients] = useState([]);
  const [selectedIngredientStores, setSelectedIngredientStores] = useState({});
  const [selectedSummaryStore, setSelectedSummaryStore] = useState('');

  useEffect(() => {
    if (promptFromState) {
      fetchIngredients(promptFromState);
    }
  }, [promptFromState]);

  useEffect(() => {
    if (document.querySelector('link[data-fonts="dealdock-fonts"]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&family=Inter:wght@400;500;600;700;800;900&display=swap';
    link.setAttribute('data-fonts', 'dealdock-fonts');
    document.head.appendChild(link);
  }, []);

  const PlatformMark = ({ platform, size = 16 }) => {
    const marks = {
      zepto: (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d="M4 4h16l-8 8h8l-9 9 2-7H5l8-8H5z" fill="#7c3aed" />
        </svg>
      ),
      blinkit: (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path
            d="M13 2 4 14h6l-1 8 10-13h-6z"
            fill="#f8cb46"
            stroke="#eab308"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>
      ),
      instamart: (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path
            d="M12 3c3 3.2 5.5 6.4 5.5 9.6a5.5 5.5 0 1 1-11 0C6.5 9.4 9 6.2 12 3z"
            fill="#f97316"
          />
        </svg>
      ),
      bigbasket: (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d="M6 9h12l-1.3 10.2a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6 9z" fill="#84cc16" />
          <path d="M9 9a3 3 0 0 1 6 0" fill="none" stroke="#4d7c0f" strokeWidth="1.4" />
        </svg>
      ),
      default: (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <circle cx="12" cy="12" r="9" fill="#9ca3af" />
        </svg>
      ),
    };

    return marks[platform] || marks.default;
  };

  const platformCatalog = {
    zepto: {
      key: 'zepto',
      name: 'Zepto',
      color: '#7c3aed',
      soft: '#f3e8ff',
      deepLink: 'https://www.zeptonow.com/',
    },
    blinkit: {
      key: 'blinkit',
      name: 'Blinkit',
      color: '#eab308',
      soft: '#fef9c3',
      deepLink: 'https://blinkit.com/',
    },
    instamart: {
      key: 'instamart',
      name: 'Instamart',
      color: '#f97316',
      soft: '#ffedd5',
      deepLink: 'https://www.swiggy.com/instamart',
    },
    bigbasket: {
      key: 'bigbasket',
      name: 'BigBasket',
      color: '#84cc16',
      soft: '#ecfccb',
      deepLink: 'https://www.bigbasket.com/',
    },
  };

  const mockInterfaceResult = {
    winner: {
      platform: 'Zepto',
      totalPrice: 238,
      avgRating: 4.5,
      deliveryTime: '10 mins',
      checkoutUrl: 'https://www.zeptonow.com/',
    },
    runnerUps: [
      { platform: 'Blinkit', totalPrice: 245, avgRating: 4.4, deliveryTime: '12 mins' },
      { platform: 'Instamart', totalPrice: 249, avgRating: 4.3, deliveryTime: '14 mins' },
      { platform: 'BigBasket', totalPrice: 258, avgRating: 4.4, deliveryTime: '18 mins' },
    ],
    winnerItems: [
      {
        originalQuery: 'Cumin Seeds',
        weight: '100g',
        unitPrice: '₹21/100g',
        quantityOptions: ['50g Pack', '100g Pack', '200g Pack'],
        options: [
          { platform: 'Zepto', price: 40, url: 'https://www.zeptonow.com/' },
          { platform: 'Blinkit', price: 42, url: 'https://blinkit.com/' },
          { platform: 'Instamart', price: 46, url: 'https://www.swiggy.com/instamart' },
          { platform: 'BigBasket', price: 49, url: 'https://www.bigbasket.com/' },
        ],
      },
      {
        originalQuery: 'Coriander Seeds',
        weight: '50g',
        unitPrice: '₹25/100g',
        quantityOptions: ['50g Pack', '100g Pack'],
        options: [
          { platform: 'Blinkit', price: 11, url: 'https://blinkit.com/' },
          { platform: 'Zepto', price: 12, url: 'https://www.zeptonow.com/' },
          { platform: 'Instamart', price: 12, url: 'https://www.swiggy.com/instamart' },
          { platform: 'BigBasket', price: 14, url: 'https://www.bigbasket.com/' },
        ],
      },
      {
        originalQuery: 'Turmeric',
        weight: '500g',
        unitPrice: '₹15/100g',
        quantityOptions: ['100g Pack', '250g Pack', '500g Pack'],
        options: [
          { platform: 'Zepto', price: 42, url: 'https://www.zeptonow.com/' },
          { platform: 'Blinkit', price: 44, url: 'https://blinkit.com/' },
          { platform: 'Instamart', price: 46, url: 'https://www.swiggy.com/instamart' },
          { platform: 'BigBasket', price: 49, url: 'https://www.bigbasket.com/' },
        ],
      },
      {
        originalQuery: 'Red Chili Powder',
        weight: '200g',
        unitPrice: '₹23/100g',
        quantityOptions: ['100g Pack', '200g Pack', '500g Pack'],
        options: [
          { platform: 'Zepto', price: 46, url: 'https://www.zeptonow.com/' },
          { platform: 'Blinkit', price: 48, url: 'https://blinkit.com/' },
          { platform: 'Instamart', price: 49, url: 'https://www.swiggy.com/instamart' },
          { platform: 'BigBasket', price: 52, url: 'https://www.bigbasket.com/' },
        ],
      },
      {
        originalQuery: 'Garam Masala',
        weight: '500g',
        unitPrice: '₹15/100g',
        quantityOptions: ['100g Pack', '250g Pack', '500g Pack'],
        options: [
          { platform: 'Zepto', price: 75, url: 'https://www.zeptonow.com/' },
          { platform: 'Blinkit', price: 78, url: 'https://blinkit.com/' },
          { platform: 'BigBasket', price: 79, url: 'https://www.bigbasket.com/' },
          { platform: 'Instamart', price: 80, url: 'https://www.swiggy.com/instamart' },
        ],
      },
      {
        originalQuery: 'Cilantro',
        weight: '50g',
        unitPrice: '₹27/100g',
        quantityOptions: ['50g Pack', '100g Pack'],
        options: [
          { platform: 'Zepto', price: 13, url: 'https://www.zeptonow.com/' },
          { platform: 'Instamart', price: 14, url: 'https://www.swiggy.com/instamart' },
          { platform: 'Blinkit', price: 14, url: 'https://blinkit.com/' },
          { platform: 'BigBasket', price: 16, url: 'https://www.bigbasket.com/' },
        ],
      },
      {
        originalQuery: 'Mint',
        weight: '100g',
        unitPrice: '₹13/100g',
        quantityOptions: ['50g Pack', '100g Pack'],
        options: [
          { platform: 'Zepto', price: 13, url: 'https://www.zeptonow.com/' },
          { platform: 'Blinkit', price: 14, url: 'https://blinkit.com/' },
          { platform: 'Instamart', price: 15, url: 'https://www.swiggy.com/instamart' },
          { platform: 'BigBasket', price: 17, url: 'https://www.bigbasket.com/' },
        ],
      },
    ],
  };

  const getPlatformMeta = (platform) => {
    const key = String(platform || '').toLowerCase().replace(/\s+/g, '');

    if (key.includes('bigbasket')) return platformCatalog.bigbasket;
    if (key.includes('instamart')) return platformCatalog.instamart;
    if (key.includes('blinkit')) return platformCatalog.blinkit;
    if (key.includes('zepto')) return platformCatalog.zepto;

    return {
      key: 'default',
      name: platform || 'Store',
      color: '#1f1f1f',
      soft: '#f3f4f6',
      deepLink: '#',
    };
  };

  const getPlatformColor = (platform) => getPlatformMeta(platform).color;

  const normalizeBackendResult = (backendData) => {
    if (!backendData) {
      return {
        winner: mockInterfaceResult.winner,
        runnerUps: mockInterfaceResult.runnerUps,
        winnerItems: mockInterfaceResult.winnerItems,
      };
    }

    const normalizeOptions = (options = [], fallbackOptions = []) => {
      const safeOptions = (options.length ? options : fallbackOptions).filter((option) =>
        allowedPlatformKeys.includes(getPlatformMeta(option.platform).key)
      );

      return safeOptions.sort((a, b) => a.price - b.price);
    };

    if (Array.isArray(backendData.winnerItems) && backendData.winnerItems.length > 0) {
      return {
        winner:
          backendData.winner && allowedPlatformKeys.includes(getPlatformMeta(backendData.winner.platform).key)
            ? backendData.winner
            : mockInterfaceResult.winner,
        runnerUps: (backendData.runnerUps || mockInterfaceResult.runnerUps).filter((platform) =>
          allowedPlatformKeys.includes(getPlatformMeta(platform.platform).key)
        ),
        winnerItems: backendData.winnerItems.map((item, index) => {
          const fallback = mockInterfaceResult.winnerItems[index] || mockInterfaceResult.winnerItems[0];

          return {
            originalQuery: item.originalQuery || fallback.originalQuery,
            weight: item.weight || fallback.weight,
            unitPrice: item.unitPrice || fallback.unitPrice,
            quantityOptions:
              item.quantityOptions ||
              fallback.quantityOptions ||
              [item.weight ? `${item.weight} Pack` : '100g Pack'],
            options: normalizeOptions(item.options || [], fallback.options || []),
            image_url: item.image_url || fallback.image_url || '',
          };
        }),
      };
    }

    if (Array.isArray(backendData?.winner?.items) && backendData.winner.items.length > 0) {
      const safeItems = backendData.winner.items.map((item, index) => {
        const fallback =
          mockInterfaceResult.winnerItems.find(
            (m) => m.originalQuery.toLowerCase() === String(item.originalQuery || '').toLowerCase()
          ) ||
          mockInterfaceResult.winnerItems[index] ||
          mockInterfaceResult.winnerItems[0];

        return {
          originalQuery: item.originalQuery || fallback.originalQuery,
          weight: item.weight || fallback.weight,
          unitPrice: item.unitPrice || fallback.unitPrice,
          quantityOptions:
            item.quantityOptions ||
            fallback.quantityOptions ||
            [item.weight ? `${item.weight} Pack` : '100g Pack'],
          options: normalizeOptions(item.options || [], fallback.options || []),
          image_url: item.image_url || fallback.image_url || '',
        };
      });

      return {
        winner:
          backendData.winner && allowedPlatformKeys.includes(getPlatformMeta(backendData.winner.platform).key)
            ? backendData.winner
            : mockInterfaceResult.winner,
        runnerUps: (backendData.runnerUps || mockInterfaceResult.runnerUps).filter((platform) =>
          allowedPlatformKeys.includes(getPlatformMeta(platform.platform).key)
        ),
        winnerItems: safeItems,
      };
    }

    return {
      winner: mockInterfaceResult.winner,
      runnerUps: mockInterfaceResult.runnerUps,
      winnerItems: mockInterfaceResult.winnerItems,
    };
  };

  const fetchIngredients = async (dish) => {
    if (!dish.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);
    setRemovedIngredients([]);
    setSelectedIngredientStores({});
    setSelectedSummaryStore('');
    setSelectedQuantities({});

    try {
      const response = await axios.post('http://localhost:3000/api/get-ingredients', {
        dishName: dish,
      });

      if (response.data.success) {
        setResult(normalizeBackendResult(response.data.data));
      } else {
        setError('Engine failed to generate a list.');
      }
    } catch (err) {
      console.error(err);
      setResult(normalizeBackendResult(mockInterfaceResult));
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchIngredients(query);
  };

  const handleChipClick = (dish) => {
    setQuery(dish);
    fetchIngredients(dish);
  };

  const handleQuantityChange = (itemName, value) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemName]: value,
    }));
  };

  const handleRemoveIngredient = (itemName) => {
    setRemovedIngredients((prev) => [...prev, itemName]);
  };

  const handleRestoreIngredients = () => {
    setRemovedIngredients([]);
  };

  const handleSelectIngredientStore = (itemName, storeKey) => {
    setSelectedIngredientStores((prev) => ({
      ...prev,
      [itemName]: storeKey,
    }));
  };

  const suggestionChips = [
    'Chicken Biryani',
    'Paneer Butter Masala',
    'Masala Dosa',
    'Other Dishes',
  ];

  const placeholderBlocks = [
    {
      title: 'Ingredient basket',
      text: 'Each ingredient row will show only Blinkit, Zepto, Instamart and BigBasket.',
    },
    {
      title: 'Store mapping',
      text: 'Customer can change quantity, remove ingredients, and select store cards.',
    },
    {
      title: 'Best-value recommendation',
      text: 'Backend can later replace mock data with live scraper or catalog results.',
    },
  ];

  const visibleWinnerItems = useMemo(() => {
    if (!result?.winnerItems) return [];

    return result.winnerItems
      .filter((item) => !removedIngredients.includes(item.originalQuery))
      .map((item) => {
        const visibleOptions = [...(item.options || [])].sort((a, b) => a.price - b.price);
        const defaultKey = getPlatformMeta(visibleOptions[0]?.platform).key;
        const selectedKey = selectedIngredientStores[item.originalQuery] || defaultKey;

        return {
          ...item,
          visibleOptions,
          selectedStoreKey: selectedKey,
        };
      });
  }, [result, removedIngredients, selectedIngredientStores]);

  const platformTotals = useMemo(() => {
    const totals = {};

    visibleWinnerItems.forEach((item) => {
      const selectedOption = item.visibleOptions.find(
        (option) => getPlatformMeta(option.platform).key === item.selectedStoreKey
      );

      if (selectedOption) {
        const meta = getPlatformMeta(selectedOption.platform);
        const existing = totals[meta.key] || {
          platform: meta.name,
          totalPrice: 0,
          avgRating: 4.4,
          deliveryTime: '10 mins',
          checkoutUrl: meta.deepLink,
          itemCount: 0,
        };

        totals[meta.key] = {
          ...existing,
          totalPrice: existing.totalPrice + Number(selectedOption.price || 0),
          itemCount: existing.itemCount + 1,
        };
      }
    });

    return Object.values(totals).sort((a, b) => a.totalPrice - b.totalPrice);
  }, [visibleWinnerItems]);

  const bestPlatform = platformTotals[0] || null;
  const selectedPlatformForCheckout = selectedSummaryStore || bestPlatform?.platform || '';

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
          background: #f8f6f1;
          color: #1f1f1f;
        }

        .ai-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top center, rgba(212, 160, 23, 0.10), transparent 30%),
            linear-gradient(180deg, #f8f6f1 0%, #f3eee6 100%);
          position: relative;
          z-index: 1;
        }

        .ai-shell {
          max-width: 1440px;
          margin: 0 auto;
          padding: 28px 24px 72px;
          position: relative;
          z-index: 1;
        }

        .ai-topbar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 16px;
          margin: 10px 0 26px;
          position: relative;
          z-index: 2;
        }

        .ai-backBtn {
          height: 46px;
          padding: 0 18px;
          border: 1px solid #e7ddd1;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #352f29;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(31, 31, 31, 0.05);
        }

        .ai-backBtn svg {
          width: 16px;
          height: 16px;
        }

        .ai-hero {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid #eadfd3;
          background: linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(250,247,241,0.92) 100%);
          box-shadow: 0 24px 60px rgba(31, 31, 31, 0.06);
          padding: 52px 34px 42px;
          z-index: 1;
        }

        .ai-heroGlow {
          position: absolute;
          right: -120px;
          top: -80px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.16) 0%, rgba(212,160,23,0) 72%);
          pointer-events: none;
        }

        .ai-heroContent {
          position: relative;
          z-index: 1;
          max-width: 980px;
          margin: 0 auto;
          text-align: center;
        }

        .ai-title {
          margin: 0 auto 18px;
          max-width: 100%;
          font-family: "Fraunces", Georgia, serif;
          font-size: clamp(2.2rem, 4.4vw, 4.7rem);
          line-height: 1.04;
          font-weight: 500;
          letter-spacing: -0.04em;
          color: #1f1f1f;
          text-align: center;
          white-space: nowrap;
        }

        .ai-titleAccent {
          color: #8d7966;
          font-style: italic;
        }

        .ai-searchCard {
          position: relative;
          z-index: 2;
          margin: 28px auto 0;
          padding: 22px;
          max-width: 1060px;
          border-radius: 24px;
          background: rgba(255,255,255,0.88);
          border: 1px solid #efe4d7;
          box-shadow: 0 12px 28px rgba(31,31,31,0.04);
        }

        .ai-form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
        }

        .ai-inputWrap {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 64px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid #e7ddd1;
          background: #fffdfb;
        }

        .ai-inputIcon {
          width: 20px;
          height: 20px;
          color: #988d80;
          flex: 0 0 auto;
        }

        .ai-input {
          flex: 1;
          min-width: 0;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #1f1f1f;
          font-size: 16px;
          font-weight: 600;
        }

        .ai-input::placeholder {
          color: #a09386;
        }

        .ai-submit {
          height: 56px;
          padding: 0 24px;
          border: none;
          border-radius: 999px;
          background: #1f1f1f;
          color: #f8f6f1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 12px 26px rgba(31,31,31,0.14);
          transition: opacity 0.2s;
        }

        .ai-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-submit svg {
          width: 16px;
          height: 16px;
        }

        .ai-chipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
          justify-content: flex-start;
        }

        .ai-chip {
          border: 1px solid #e9dfd2;
          background: #fff;
          color: #5f564d;
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
        }

        .ai-chip:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ai-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.62fr);
          gap: 20px;
          margin-top: 22px;
          align-items: start;
        }

        .ai-panel {
          border-radius: 28px;
          background: rgba(255,255,255,0.84);
          border: 1px solid #eadfd2;
          box-shadow: 0 16px 40px rgba(31,31,31,0.05);
        }

        .ai-panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 22px 24px 12px;
        }

        .ai-panelTitle {
          margin: 0;
          color: #1f1f1f;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .ai-panelMeta {
          color: #928678;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .ai-panelBody {
          padding: 0 20px 20px;
        }

        .ai-emptyState {
          display: grid;
          gap: 14px;
        }

        .ai-emptyCard {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 20px;
          background: #fcfaf7;
          border: 1px solid #efe5d9;
        }

        .ai-emptyIcon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #f6efe2;
          color: #8d7966;
          flex: 0 0 auto;
        }

        .ai-emptyIcon svg {
          width: 18px;
          height: 18px;
        }

        .ai-emptyText {
          flex: 1;
        }

        .ai-emptyTitle {
          margin: 0 0 4px;
          color: #26211d;
          font-size: 15px;
          font-weight: 800;
        }

        .ai-emptyCopy {
          margin: 0;
          color: #766d64;
          font-size: 13.5px;
          line-height: 1.65;
        }

        .ai-loadingState {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          gap: 12px;
          color: #8d7966;
          font-weight: 600;
        }

        .ai-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #eadfd2;
          border-top-color: #1f1f1f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .ai-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          padding: 10px 4px;
          flex-wrap: wrap;
          border-bottom: 1px solid #f0e7da;
        }

        .ai-toolbarCount {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #6d6358;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .ai-toolbarDot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #c9a13b;
          display: inline-block;
        }

        .ai-inlineAction {
          border: 1px solid #e7ddd1;
          background: #fff;
          color: #4b433b;
          border-radius: 999px;
          padding: 7px 13px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }

        .ai-inlineAction:hover {
          border-color: #d8c9a8;
          background: #fbf6ea;
          color: #2b241d;
        }

        .ai-liveList {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
        }

        .ai-liveItem {
          display: grid;
          grid-template-columns: 88px 220px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid #efe6d9;
          border-radius: 16px;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .ai-liveItem:hover {
          border-color: #e4d6bd;
          box-shadow: 0 6px 18px rgba(31, 31, 31, 0.045);
        }

        .ai-itemThumb {
          width: 74px;
          height: 74px;
          border-radius: 20px;
          background: #f5f2ec;
          border: 1px solid #eadfd3;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 8px;
          flex-shrink: 0;
        }

        .ai-itemThumb img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .ai-itemThumbPlaceholder {
          color: #c2b8aa;
          font-size: 11px;
          font-weight: 700;
        }

        .ai-itemLeft {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-itemQuery {
          font-weight: 750;
          color: #201c18;
          text-transform: capitalize;
          display: block;
          font-size: 14px;
          line-height: 1.25;
          letter-spacing: -0.005em;
        }

        .ai-itemMetaLine {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ai-select {
          height: 40px;
          border-radius: 12px;
          border: 1px solid #e2d7c7;
          background: #fdfbf8;
          color: #2b241d;
          font-size: 13px;
          font-weight: 700;
          padding: 0 12px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s ease;
          min-width: 116px;
        }

        .ai-select:focus {
          border-color: #c9a13b;
        }

        .ai-miniListHorizontal {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .ai-miniListHorizontal::-webkit-scrollbar {
          height: 6px;
        }

        .ai-miniListHorizontal::-webkit-scrollbar-thumb {
          background: #ddd3c7;
          border-radius: 999px;
        }

        .ai-miniCard {
          position: relative;
          min-width: 114px;
          height: 48px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #ece3d8;
          background: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease, background 0.14s ease;
          flex: 0 0 auto;
        }

        .ai-miniCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(31,31,31,0.07);
          border-color: #ddccae;
        }

        .ai-miniCardSelected {
          border: 1.5px solid #c9a13b;
          background: linear-gradient(180deg, #fdf9ef 0%, #faf3e0 100%);
          box-shadow: 0 4px 12px rgba(201, 161, 59, 0.16);
        }

        .ai-miniCardSelected::before {
          content: '';
          position: absolute;
          top: -1.5px;
          left: 8px;
          right: 8px;
          height: 2px;
          border-radius: 0 0 3px 3px;
          background: #c9a13b;
        }

        .ai-miniLogoWrap {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          background: #faf7f2;
          overflow: hidden;
          flex: 0 0 auto;
          border: 1px solid #eee4d7;
        }

        .ai-miniCard svg {
          width: 11px;
          height: 11px;
        }

        .ai-miniPrice {
          font-size: 12px;
          font-weight: 800;
          color: #1f1f1f;
          line-height: 1;
          white-space: nowrap;
        }

        .ai-miniCardSelected .ai-miniPrice {
          color: #8a6a12;
        }

        .ai-removeBtn {
          flex: 0 0 auto;
          width: 30px;
          height: 30px;
          border: 1px solid #f1d9d9;
          background: #fff;
          color: #c17b7b;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .ai-removeBtn svg {
          width: 13px;
          height: 13px;
        }

        .ai-removeBtn:hover {
          background: #fdf1f1;
          color: #c24141;
          border-color: #f3c7c7;
        }

        .ai-emptyInline {
          padding: 16px;
          text-align: center;
          border: 1px dashed #e7ddd1;
          border-radius: 14px;
          color: #8d7966;
          font-size: 12.5px;
          font-weight: 700;
          background: #fffdfb;
        }

        .ai-summaryCard {
          padding: 20px;
          border-radius: 22px;
          background: linear-gradient(180deg, #fcf7ec 0%, #f3e8d3 100%);
          border: 1px solid #ecdcae;
        }

        .ai-summaryEyebrow {
          color: #a27b20;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .ai-summaryTitle {
          margin: 10px 0 6px;
          font-family: "Fraunces", Georgia, serif;
          font-size: 28px;
          line-height: 1.12;
          color: #2b241d;
        }

        .ai-summaryCopy {
          margin: 0;
          color: #665948;
          font-size: 14px;
          line-height: 1.7;
        }

        .ai-checkoutBtn {
          width: 100%;
          margin-top: 16px;
          height: 54px;
          border: none;
          border-radius: 14px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .ai-checkoutBtn:hover {
          opacity: 0.9;
        }

        .ai-storeList {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }

        .ai-storeCard {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          border-radius: 18px;
          background: #fff;
          border: 1px solid #eee3d7;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .ai-storeCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(31,31,31,0.06);
        }

        .ai-storeCardSelected {
          border-width: 2px;
        }

        .ai-platformLogoWrap {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #fff;
          border: 1px solid #ece3d8;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .ai-storeName {
          color: #201c18;
          font-size: 15px;
          font-weight: 800;
        }

        .ai-storeMeta {
          margin-top: 4px;
          color: #8b7f72;
          font-size: 12.5px;
          font-weight: 700;
        }

        .ai-storeStatus {
          padding: 8px 12px;
          border-radius: 999px;
          background: #f5efe7;
          color: #5f564d;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .ai-note {
          margin-top: 16px;
          font-size: 12px;
          color: #8d7966;
        }

        .ai-errorState {
          padding: 16px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          border-radius: 16px;
          font-weight: 600;
          margin: 16px 0 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .ai-grid {
            grid-template-columns: 1fr;
          }

          .ai-title {
            white-space: normal;
          }

          .ai-liveItem {
            grid-template-columns: 74px 1fr;
            align-items: stretch;
          }

          .ai-miniListHorizontal {
            grid-column: 1 / -1;
          }

          .ai-removeBtn {
            justify-self: end;
          }
        }

        @media (max-width: 768px) {
          .ai-shell {
            padding: 22px 16px 56px;
          }

          .ai-hero {
            padding: 28px 18px 24px;
            border-radius: 24px;
          }

          .ai-title {
            font-size: clamp(1.8rem, 8vw, 2.8rem);
            max-width: 100%;
            white-space: normal;
          }

          .ai-form {
            grid-template-columns: 1fr;
          }

          .ai-inputWrap {
            height: 58px;
          }

          .ai-submit {
            width: 100%;
            justify-content: center;
          }

          .ai-chipRow {
            justify-content: center;
          }

          .ai-panelHead,
          .ai-panelBody {
            padding-left: 16px;
            padding-right: 16px;
          }

          .ai-topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .ai-itemLeft {
            width: 100%;
          }

          .ai-liveItem {
            grid-template-columns: 1fr;
          }

          .ai-itemThumb {
            width: 64px;
            height: 64px;
          }
        }
      `}</style>

      <div className="ai-page">
        <div className="ai-shell">
          <div className="ai-topbar">
            <button
              className="ai-backBtn"
              onClick={() => navigate('/')}
              type="button"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to home
            </button>
          </div>

          <section className="ai-hero">
            <div className="ai-heroGlow" aria-hidden="true" />

            <div className="ai-heroContent">
              <h1 className="ai-title">
                Tell us the dish.&nbsp;<span className="ai-titleAccent">We’ll shape the basket.</span>
              </h1>

              <div className="ai-searchCard">
                <form className="ai-form" onSubmit={handleSubmit}>
                  <div className="ai-inputWrap">
                    <svg
                      className="ai-inputIcon"
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
                      className="ai-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Type a dish name or grocery intent"
                      disabled={isLoading}
                    />
                  </div>

                  <button className="ai-submit" type="submit" disabled={isLoading || !query.trim()}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                    {isLoading ? 'Scanning...' : 'Continue'}
                  </button>
                </form>

                <div className="ai-chipRow">
                  {suggestionChips.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="ai-chip"
                      onClick={() => handleChipClick(item)}
                      disabled={isLoading}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {error && <div className="ai-errorState">{error}</div>}

          <section className="ai-grid">
            <div className="ai-panel">
              <div className="ai-panelHead">
                <div>
                  <h2 className="ai-panelTitle">
                    {result ? `${bestPlatform?.platform || result.winner.platform} Ingredient Basket` : 'Basket workspace'}
                  </h2>
                  <div className="ai-panelMeta">
                    {result
                      ? 'Horizontal card layout like your sketch'
                      : 'Reserved for AI output and item-level mapping'}
                  </div>
                </div>
              </div>

              <div className="ai-panelBody">
                {isLoading && (
                  <div className="ai-loadingState">
                    <div className="ai-spinner" />
                    <span>Scraping local catalog variants...</span>
                  </div>
                )}

                {!isLoading && !result && (
                  <div className="ai-emptyState">
                    {placeholderBlocks.map((item) => (
                      <div className="ai-emptyCard" key={item.title}>
                        <div className="ai-emptyIcon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
                          </svg>
                        </div>
                        <div className="ai-emptyText">
                          <p className="ai-emptyTitle">{item.title}</p>
                          <p className="ai-emptyCopy">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && result && visibleWinnerItems.length > 0 && (
                  <>
                    <div className="ai-toolbar">
                      <div className="ai-toolbarCount">
                        <span className="ai-toolbarDot" />
                        {visibleWinnerItems.length} ingredient{visibleWinnerItems.length > 1 ? 's' : ''} visible
                      </div>

                      {removedIngredients.length > 0 && (
                        <button
                          type="button"
                          className="ai-inlineAction"
                          onClick={handleRestoreIngredients}
                        >
                          Restore ingredients
                        </button>
                      )}
                    </div>

                    <ul className="ai-liveList">
                      {visibleWinnerItems.map((item, index) => {
                        const selectedQuantity =
                          selectedQuantities[item.originalQuery] ||
                          item.quantityOptions?.[0] ||
                          `${item.weight || '100g'} Pack`;

                        return (
                          <li key={`${item.originalQuery}-${index}`} className="ai-liveItem">
                            <div className="ai-itemThumb">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.originalQuery} />
                              ) : (
                                <div className="ai-itemThumbPlaceholder">Image</div>
                              )}
                            </div>

                            <div className="ai-itemLeft">
                              <span className="ai-itemQuery">{item.originalQuery}</span>

                              <div className="ai-itemMetaLine">
                                <select
                                  className="ai-select"
                                  value={selectedQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.originalQuery, e.target.value)
                                  }
                                >
                                  {(item.quantityOptions || [`${item.weight || '100g'} Pack`]).map((qty) => (
                                    <option key={qty} value={qty}>
                                      {qty}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {item.visibleOptions.length > 0 ? (
                              <div className="ai-miniListHorizontal">
                                {item.visibleOptions.map((option) => {
                                  const meta = getPlatformMeta(option.platform);
                                  const isSelected = item.selectedStoreKey === meta.key;

                                  return (
                                    <button
                                      type="button"
                                      className={`ai-miniCard ${isSelected ? 'ai-miniCardSelected' : ''}`}
                                      key={`${item.originalQuery}-${meta.key}`}
                                      onClick={() => handleSelectIngredientStore(item.originalQuery, meta.key)}
                                      title={`${meta.name} - ₹${option.price}`}
                                    >
                                      <div className="ai-miniLogoWrap">
                                        <PlatformMark platform={meta.key} size={14} />
                                      </div>

                                      <span className="ai-miniPrice">₹{option.price}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="ai-emptyInline">
                                No store cards available for this ingredient.
                              </div>
                            )}

                            <button
                              type="button"
                              className="ai-removeBtn"
                              aria-label="Remove ingredient"
                              title="Remove ingredient"
                              onClick={() => handleRemoveIngredient(item.originalQuery)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 6 6 18" />
                                <path d="M6 6l12 12" />
                              </svg>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {!isLoading && result && visibleWinnerItems.length === 0 && (
                  <div className="ai-emptyInline">
                    No ingredient list found in response or all ingredients were removed.
                  </div>
                )}
              </div>
            </div>

            <aside className="ai-panel">
              <div className="ai-panelBody" style={{ paddingTop: '24px' }}>
                <div className="ai-summaryCard">
                  <div className="ai-summaryEyebrow">Comparison summary</div>
                  <h3 className="ai-summaryTitle">
                    {bestPlatform ? `₹${bestPlatform.totalPrice}` : 'Best recommendation area'}
                  </h3>
                  <p className="ai-summaryCopy">
                    {bestPlatform
                      ? `${bestPlatform.platform} currently has the lowest selected total based on your ingredient-level quick-commerce selections.`
                      : 'You can later show cheapest store, basket total, estimated savings, and quick call-to-action here.'}
                  </p>
                </div>

                {bestPlatform && (
                  <button
                    className="ai-checkoutBtn"
                    style={{ backgroundColor: getPlatformColor(selectedPlatformForCheckout) }}
                    onClick={() =>
                      window.open(
                        getPlatformMeta(selectedPlatformForCheckout).deepLink,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    Checkout on {selectedPlatformForCheckout}
                  </button>
                )}

                <h3
                  className="ai-panelTitle"
                  style={{ fontSize: '15px', marginTop: '24px', marginBottom: '12px' }}
                >
                  Platform totals
                </h3>

                <div className="ai-storeList">
                  {platformTotals.length > 0 ? (
                    platformTotals.map((platform, index) => {
                      const meta = getPlatformMeta(platform.platform);
                      const isWinner = index === 0;
                      const isSelected = selectedPlatformForCheckout === platform.platform;

                      return (
                        <button
                          type="button"
                          className={`ai-storeCard ${isSelected ? 'ai-storeCardSelected' : ''}`}
                          key={platform.platform}
                          style={{
                            borderColor: isSelected ? meta.color : isWinner ? meta.color : '#eee3d7',
                            borderWidth: isSelected || isWinner ? '2px' : '1px',
                          }}
                          onClick={() => setSelectedSummaryStore(platform.platform)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              className="ai-platformLogoWrap"
                              style={{ background: isWinner ? meta.soft : '#fff' }}
                            >
                              <PlatformMark platform={meta.key} size={18} />
                            </div>

                            <div>
                              <div className="ai-storeName">
                                {platform.platform} {isWinner ? '🏆' : ''}
                              </div>
                              <div className="ai-storeMeta">
                                {platform.itemCount} selected ingredient{platform.itemCount > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>

                          <div
                            className="ai-storeStatus"
                            style={{
                              backgroundColor: isWinner ? '#f0fdf4' : '#fbf8f3',
                              color: isWinner ? '#16a34a' : '#5f564d',
                            }}
                          >
                            ₹{platform.totalPrice}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    ['zepto', 'blinkit', 'instamart', 'bigbasket'].map((key) => (
                      <div className="ai-storeCard" key={key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="ai-platformLogoWrap">
                            <PlatformMark platform={key} size={18} />
                          </div>
                          <div>
                            <div className="ai-storeName">{platformCatalog[key].name}</div>
                            <div className="ai-storeMeta">Store result placeholder</div>
                          </div>
                        </div>
                        <div className="ai-storeStatus">Pending</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="ai-note">
                  Prompt passed from home: <strong>{promptFromState || 'No prompt received yet'}</strong>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>

      <LoginPage
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => setIsLoginOpen(false)}
      />
    </>
  );
}

export default AiPage;