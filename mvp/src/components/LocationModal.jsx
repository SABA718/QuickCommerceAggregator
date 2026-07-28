import { useEffect, useMemo, useRef, useState } from 'react';

function LocationModal({
  isOpen,
  onClose,
  onConfirm,
  theme = {},
}) {
  const [manualLocation, setManualLocation] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [mapRenderKey, setMapRenderKey] = useState('default-map');

  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const placesContainerRef = useRef(null);
  const debounceRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const lastDetectedCoordsRef = useRef(null);
  const mapClickListenerRef = useRef(null);

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const mergedTheme = useMemo(
    () => ({
      modalBg: '#fffaf6',
      overlayBg: 'rgba(26, 18, 14, 0.52)',
      border: 'rgba(139, 98, 77, 0.12)',
      inputBg: '#f7efe8',
      inputBorder: '#eadccf',
      title: '#332720',
      text: '#2b2420',
      muted: '#8a7a6f',
      accent: '#bc9064',
      accentDark: '#8b624d',
      accentSoft: '#fff7f0',
      gradientStart: '#d3aa7a',
      gradientEnd: '#bc9064',
      white: '#fffaf4',
      ...theme,
    }),
    [theme]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (!GOOGLE_MAPS_API_KEY) {
      setErrorMessage('Missing Google Maps API key.');
      return;
    }

    if (window.google?.maps?.places) {
      initializeGoogleServices();
      return;
    }

    const existingScript = document.querySelector(
      'script[data-google-maps="places"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogleServices);
      return () => {
        existingScript.removeEventListener('load', initializeGoogleServices);
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'places');
    script.addEventListener('load', initializeGoogleServices);
    script.addEventListener('error', () => {
      setErrorMessage('Failed to load Google Maps services.');
    });
    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', initializeGoogleServices);
    };
  }, [isOpen, GOOGLE_MAPS_API_KEY, mapRenderKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (!detectedLocation) return;
    if (!mapRef.current) return;
    if (!window.google?.maps) return;

    const timeout = setTimeout(() => {
      const position = {
        lat: detectedLocation.latitude,
        lng: detectedLocation.longitude,
      };

      const center = mapRef.current.getCenter?.() || position;
      window.google.maps.event.trigger(mapRef.current, 'resize');
      mapRef.current.setCenter(center);
      mapRef.current.setCenter(position);
      mapRef.current.setZoom(17);

      if (markerRef.current) {
        markerRef.current.setPosition(position);
        markerRef.current.setMap(mapRef.current);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [isOpen, detectedLocation, mapRenderKey]);

  // Reverse geocodes a lat/lng picked by tapping the map and sets it as the
  // selected location (mirrors what "Use current location" does).
  const handleMapPointSelect = async (latitude, longitude) => {
    try {
      setErrorMessage('');
      setIsDetectingLocation(true);

      lastDetectedCoordsRef.current = { lat: latitude, lng: longitude };

      if (markerRef.current && mapRef.current) {
        markerRef.current.setPosition({ lat: latitude, lng: longitude });
        markerRef.current.setMap(mapRef.current);
      } else if (mapRef.current && window.google?.maps) {
        markerRef.current = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapRef.current,
          title: 'Selected location',
          animation: window.google.maps.Animation.DROP,
        });
      }

      if (mapRef.current) {
        mapRef.current.panTo({ lat: latitude, lng: longitude });
      }

      const exactLocationName = await getExactLocationName(latitude, longitude);

      setDetectedLocation({
        address: exactLocationName,
        latitude,
        longitude,
      });

      setManualLocation(exactLocationName);
      setPredictions([]);
    } catch (error) {
      setErrorMessage(
        error.message || 'Could not fetch location for the selected point.'
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const attachMapClickListener = (map) => {
    if (!map || !window.google?.maps) return;

    if (mapClickListenerRef.current) {
      window.google.maps.event.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }

    mapClickListenerRef.current = map.addListener('click', (event) => {
      const latitude = event.latLng?.lat?.();
      const longitude = event.latLng?.lng?.();

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        handleMapPointSelect(latitude, longitude);
      }
    });
  };

  const initializeGoogleServices = () => {
    if (!window.google?.maps?.places) return;

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new window.google.maps.places.AutocompleteService();
    }

    if (!placesServiceRef.current && placesContainerRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        placesContainerRef.current
      );
    }

    if (!mapRef.current && mapContainerRef.current) {
      const initialCenter = lastDetectedCoordsRef.current || {
        lat: 20.5937,
        lng: 78.9629,
      };

      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: lastDetectedCoordsRef.current ? 17 : 5,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      attachMapClickListener(mapRef.current);

      if (lastDetectedCoordsRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: lastDetectedCoordsRef.current,
          map: mapRef.current,
          title: 'Your current location',
          animation: window.google.maps.Animation.DROP,
        });
      }
    }
  };

  const updateMapLocation = (latitude, longitude) => {
    if (!window.google?.maps || !mapContainerRef.current) return;

    const position = { lat: latitude, lng: longitude };
    lastDetectedCoordsRef.current = position;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: position,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      attachMapClickListener(mapRef.current);
    }

    window.google.maps.event.trigger(mapRef.current, 'resize');
    mapRef.current.setCenter(position);
    mapRef.current.setZoom(17);

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        title: 'Your current location',
        animation: window.google.maps.Animation.DROP,
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }

    setTimeout(() => {
      if (mapRef.current && lastDetectedCoordsRef.current) {
        window.google.maps.event.trigger(mapRef.current, 'resize');
        mapRef.current.setCenter(lastDetectedCoordsRef.current);
        mapRef.current.setZoom(17);
      }
    }, 250);
  };

  const remountMapAtLocation = (latitude, longitude) => {
    lastDetectedCoordsRef.current = { lat: latitude, lng: longitude };

    if (mapClickListenerRef.current && window.google?.maps) {
      window.google.maps.event.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = null;
    mapRef.current = null;
    setMapRenderKey(`map-${latitude}-${longitude}-${Date.now()}`);
  };

  const getExactLocationName = async (latitude, longitude) => {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exact location.');
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(data.error_message || 'No address found for current location.');
    }

    return data.results[0].formatted_address;
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported on this device.');
      return;
    }

    try {
      setIsDetectingLocation(true);
      setErrorMessage('');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            remountMapAtLocation(coords.latitude, coords.longitude);

            setTimeout(() => {
              updateMapLocation(coords.latitude, coords.longitude);
            }, 120);

            const exactLocationName = await getExactLocationName(
              coords.latitude,
              coords.longitude
            );

            setDetectedLocation({
              address: exactLocationName,
              latitude: coords.latitude,
              longitude: coords.longitude,
            });

            setManualLocation(exactLocationName);
            setPredictions([]);
          } catch (error) {
            setErrorMessage(error.message || 'Could not fetch exact location name.');
          } finally {
            setIsDetectingLocation(false);
          }
        },
        (error) => {
          setIsDetectingLocation(false);

          if (error.code === 1) {
            setErrorMessage('Location permission was denied.');
          } else if (error.code === 2) {
            setErrorMessage('Unable to detect your location.');
          } else if (error.code === 3) {
            setErrorMessage('Location request timed out.');
          } else {
            setErrorMessage('Could not fetch your location.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      setIsDetectingLocation(false);
      setErrorMessage('Could not fetch your location.');
    }
  };

  const fetchPredictions = (inputValue) => {
    if (!autocompleteServiceRef.current || !inputValue.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoadingPredictions(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: inputValue,
        componentRestrictions: { country: 'in' },
        types: ['geocode'],
      },
      (results, status) => {
        setIsLoadingPredictions(false);

        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !results
        ) {
          setPredictions([]);
          return;
        }

        setPredictions(results);
      }
    );
  };

  const handleManualInputChange = (value) => {
    setManualLocation(value);
    setErrorMessage('');
    setDetectedLocation(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 250);
  };

  const handlePredictionSelect = (prediction) => {
    if (!placesServiceRef.current) {
      setManualLocation(prediction.description);
      setPredictions([]);
      return;
    }

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'name'],
      },
      (place, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place
        ) {
          setErrorMessage('Could not fetch selected place details.');
          return;
        }

        const finalLabel =
          place.formatted_address || prediction.description || place.name;

        const latitude = place.geometry?.location?.lat?.();
        const longitude = place.geometry?.location?.lng?.();

        setManualLocation(finalLabel);
        setPredictions([]);

        if (typeof latitude === 'number' && typeof longitude === 'number') {
          remountMapAtLocation(latitude, longitude);

          setTimeout(() => {
            updateMapLocation(latitude, longitude);
          }, 120);

          setDetectedLocation({
            address: finalLabel,
            latitude,
            longitude,
          });
        }

        onConfirm?.({
          mode: 'manual',
          value: {
            placeId: prediction.place_id,
            address: finalLabel,
            latitude,
            longitude,
          },
          label: finalLabel,
        });
      }
    );
  };

  const handleManualSubmit = () => {
    if (detectedLocation) {
      onConfirm?.({
        mode: 'current',
        value: {
          latitude: detectedLocation.latitude,
          longitude: detectedLocation.longitude,
        },
        label: detectedLocation.address,
      });
      return;
    }

    const trimmed = manualLocation.trim();

    if (!trimmed) {
      setErrorMessage('Please enter your area, address, or pincode.');
      return;
    }

    setErrorMessage('');
    onConfirm?.({
      mode: 'manual',
      value: trimmed,
      label: trimmed,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .location-overlay {
          position: fixed;
          inset: 0;
          background: ${mergedTheme.overlayBg};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1400;
          animation: locationOverlayFade 220ms ease forwards;
        }

        .location-modal {
          width: min(520px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          border-radius: 22px;
          background: ${mergedTheme.modalBg};
          box-shadow: 0 36px 90px rgba(30, 20, 15, 0.24);
          border: 1px solid ${mergedTheme.border};
          animation: locationModalIn 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .location-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 22px 16px;
          border-bottom: 1px solid ${mergedTheme.border};
        }

        .location-title {
          margin: 0;
          font-family: "Fraunces", Georgia, serif;
          font-size: 28px;
          line-height: 1.1;
          color: ${mergedTheme.title};
          font-weight: 700;
        }

        .location-close {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: rgba(139, 98, 77, 0.08);
          color: #7a5947;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 180ms ease, background 180ms ease;
        }

        .location-close:hover {
          transform: rotate(90deg);
          background: rgba(139, 98, 77, 0.14);
        }

        .location-body {
          padding: 20px 22px 26px;
        }

        .location-search-wrap {
          margin-bottom: 16px;
          position: relative;
        }

        .location-input-shell {
          height: 58px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          background: ${mergedTheme.inputBg};
          border: 1px solid ${mergedTheme.inputBorder};
        }

        .location-input-shell svg {
          flex-shrink: 0;
        }

        .location-input {
          flex: 1;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-family: "Inter", sans-serif;
          font-size: 15px;
          color: ${mergedTheme.text};
          font-weight: 600;
        }

        .location-input::placeholder {
          color: #9d8c80;
          font-weight: 500;
        }

        .location-suggestions {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #fffdfb;
          border: 1px solid ${mergedTheme.inputBorder};
          border-radius: 16px;
          box-shadow: 0 18px 40px rgba(30, 20, 15, 0.12);
          overflow: hidden;
          z-index: 4;
        }

        .location-suggestion-btn {
          width: 100%;
          border: none;
          background: transparent;
          text-align: left;
          padding: 14px 16px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          border-bottom: 1px solid rgba(139, 98, 77, 0.08);
        }

        .location-suggestion-btn:last-child {
          border-bottom: none;
        }

        .location-suggestion-btn:hover {
          background: #faf4ee;
        }

        .location-suggestion-copy {
          min-width: 0;
        }

        .location-suggestion-copy strong {
          display: block;
          font-size: 14px;
          color: ${mergedTheme.title};
          font-weight: 700;
          margin-bottom: 4px;
        }

        .location-suggestion-copy span {
          display: block;
          font-size: 13px;
          color: ${mergedTheme.muted};
          line-height: 1.5;
        }

        .location-current-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid ${mergedTheme.inputBorder};
          border-radius: 16px;
          padding: 16px 16px;
          background: #fffdfb;
          margin-bottom: 18px;
        }

        .location-current-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .location-current-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(188, 144, 100, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .location-current-copy h4 {
          margin: 0 0 4px;
          font-family: "Inter", sans-serif;
          font-size: 17px;
          font-weight: 800;
          color: #6f4d3e;
        }

        .location-current-copy p {
          margin: 0;
          color: ${mergedTheme.muted};
          font-size: 14px;
          line-height: 1.45;
        }

        .location-enable-btn {
          height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid #caa27d;
          background: ${mergedTheme.accentSoft};
          color: ${mergedTheme.accentDark};
          font-family: "Inter", sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          flex-shrink: 0;
        }

        .location-enable-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .location-map-wrap {
          margin-bottom: 18px;
        }

        .location-map {
          width: 100%;
          min-height: 240px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid ${mergedTheme.inputBorder};
          background: #f3ebe4;
        }

        .location-map-address {
          margin: 12px 4px 0;
          color: ${mergedTheme.muted};
          font-size: 13px;
          line-height: 1.5;
          text-align: center;
          font-weight: 600;
        }

        .location-hint {
          text-align: center;
          color: #8c7b70;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .location-actions {
          display: flex;
          gap: 12px;
        }

        .location-secondary-btn,
        .location-primary-btn {
          flex: 1;
          height: 52px;
          border-radius: 12px;
          font-family: "Inter", sans-serif;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: filter 180ms ease, opacity 180ms ease, transform 180ms ease;
        }

        .location-secondary-btn {
          border: 1px solid #e3d5c8;
          background: #fff;
          color: #6f5a4d;
        }

        .location-primary-btn {
          border: none;
          background: linear-gradient(180deg, ${mergedTheme.gradientStart} 0%, ${mergedTheme.gradientEnd} 100%);
          color: ${mergedTheme.white};
        }

        .location-secondary-btn:hover,
        .location-primary-btn:hover {
          filter: brightness(1.03);
          transform: translateY(-1px);
        }

        .location-error {
          margin: 0 0 14px;
          color: #b55245;
          background: rgba(181, 82, 69, 0.08);
          border: 1px solid rgba(181, 82, 69, 0.14);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 600;
        }

        .location-loading {
          margin: 10px 0 0;
          color: ${mergedTheme.muted};
          font-size: 13px;
          font-weight: 600;
        }

        @keyframes locationOverlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes locationModalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 640px) {
          .location-overlay {
            padding: 12px;
            align-items: flex-end;
          }

          .location-modal {
            width: 100%;
            max-height: calc(100vh - 12px);
            border-radius: 22px 22px 0 0;
          }

          .location-title {
            font-size: 24px;
          }

          .location-current-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .location-enable-btn {
            width: 100%;
          }

          .location-actions {
            flex-direction: column;
          }

          .location-map {
            min-height: 220px;
          }
        }
      `}</style>

      <div className="location-overlay" onClick={onClose}>
        <div className="location-modal" onClick={(e) => e.stopPropagation()}>
          <div className="location-header">
            <h2 className="location-title">Choose your location</h2>
            <button
              className="location-close"
              type="button"
              onClick={onClose}
              aria-label="Close location modal"
            >
              ×
            </button>
          </div>

          <div className="location-body">
            <div className="location-search-wrap">
              <div className="location-input-shell">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8D7B6E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  className="location-input"
                  type="text"
                  placeholder="Search your area, address or pincode"
                  value={manualLocation}
                  onChange={(e) => {
                    handleManualInputChange(e.target.value);
                  }}
                />
              </div>

              {predictions.length > 0 ? (
                <div className="location-suggestions">
                  {predictions.map((prediction) => {
                    const parts = prediction.description.split(',');
                    const title = parts.shift()?.trim() || prediction.description;
                    const subtitle = parts.join(',').trim();

                    return (
                      <button
                        key={prediction.place_id}
                        type="button"
                        className="location-suggestion-btn"
                        onClick={() => handlePredictionSelect(prediction)}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#BC9064"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0, marginTop: '2px' }}
                        >
                          <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
                          <circle cx="12" cy="11" r="2.2" />
                        </svg>

                        <div className="location-suggestion-copy">
                          <strong>{title}</strong>
                          <span>{subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {isLoadingPredictions ? (
                <p className="location-loading">Loading suggestions...</p>
              ) : null}
            </div>

            <div className="location-current-card">
              <div className="location-current-left">
                <div className="location-current-icon">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#BC9064"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
                    <circle cx="12" cy="11" r="2.2" />
                  </svg>
                </div>

                <div className="location-current-copy">
                  <h4>Use my current location</h4>
                  <p>Enable device location for faster delivery and better nearby results.</p>
                </div>
              </div>

              <button
                className="location-enable-btn"
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingLocation}
              >
                {isDetectingLocation ? 'Detecting...' : 'Enable'}
              </button>
            </div>

            <div className="location-map-wrap">
              <div
                key={mapRenderKey}
                ref={mapContainerRef}
                className="location-map"
              />
              {detectedLocation ? (
                <p className="location-map-address">{detectedLocation.address}</p>
              ) : null}
            </div>

            <p className="location-hint">
              {detectedLocation
                ? 'This map is centered on your detected current location. Tap anywhere on the map to fine-tune it.'
                : 'Use current location to see your place on the map, or tap a spot on the map to select it.'}
            </p>

            {errorMessage ? (
              <p className="location-error">{errorMessage}</p>
            ) : null}

            <div className="location-actions">
              <button
                type="button"
                className="location-secondary-btn"
                onClick={onClose}
              >
                Not now
              </button>

              <button
                type="button"
                className="location-primary-btn"
                onClick={handleManualSubmit}
              >
                {detectedLocation
                  ? 'Continue with current location'
                  : 'Continue with entered location'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={placesContainerRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </>
  );
}

export default LocationModal;