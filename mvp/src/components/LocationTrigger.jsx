function LocationTrigger({ onClick, selectedLocation }) {
  return (
    <>
      <style>{`
        .location-trigger-btn {
          height: 52px;
          padding: 0 18px;
          border: 1px solid rgba(139, 98, 77, 0.10);
          border-radius: 999px;
          background: #f6eee7;
          box-shadow: 0 8px 20px rgba(58, 35, 24, 0.06);
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #5d4539;
          font-family: "Inter", sans-serif;
          font-size: 16px;
          font-weight: 800;
        }

        .location-trigger-btn:hover {
          background: #f4e9e0;
        }

        .location-trigger-label {
          max-width: 240px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <button type="button" className="location-trigger-btn" onClick={onClick}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7A5947"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>

        <span className="location-trigger-label">
          {selectedLocation || 'Add your location'}
        </span>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8B624D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </>
  );
}

export default LocationTrigger;