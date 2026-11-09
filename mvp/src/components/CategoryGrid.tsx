const categoriesList = [
  "Fruits & Vegetables",
  "Grocery & Staples",
  "Dairy, Bread & Eggs",
  "Meat & Seafood",
  "Snacks & Packaged Foods",
  "Beverages",
  "Personal Care",
  "Household Essentials",
  "Cleaning Supplies",
  "Health & Wellness",
  "Pharmacy",
  "Ready-to-Eat / Ready-to-Cook"
];

function CategoryGrid({ categoryRef, onCategoryClick }: { categoryRef: React.Ref<HTMLElement>; onCategoryClick: (category: string) => void }) {
  const handleCategoryClick = (category: string) => {
    onCategoryClick(category);
  };

  return (
    <section 
      id="categories-section" 
      ref={categoryRef} 
      className="dd-categories" 
      aria-label="Browse by Categories"
    >
      <style>{`
        .dd-categories {
          --ivory: #F8F6F1;
          --cream: #E9E4DA;
          --taupe: #8D7966;
          --gold: #D4A017;
          --ink: #1F1F1F;
          --line: #E6DED4;
          --font-body: "Inter", sans-serif;
          --font-display: "Fraunces", Georgia, serif;

          width: 100%;
          /* Matches the Hero background perfectly to remove the split line */
          background: #F0EBE1; 
          padding: 20px 36px 80px; /* Reduced top padding since it flows directly from the hero */
          font-family: var(--font-body);
          color: var(--ink);
        }

        .dd-categories__inner {
          max-width: 1600px;
          margin: 0 auto;
        }

        .dd-categories__header {
          margin-bottom: 40px;
          text-align: left;
        }

        .dd-categories__title {
          margin: 0 0 8px 0;
          font-family: var(--font-display);
          font-weight: 500;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          letter-spacing: -0.02em;
        }

        .dd-categories__subtitle {
          margin: 0;
          font-size: 15px;
          color: var(--taupe);
          font-weight: 500;
        }

        .dd-categories__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .dd-categoryCard {
          width: 100%;
          min-height: 84px;
          background: #FFFFFF;
          border: 1px solid var(--cream);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          text-align: left;
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 14.5px;
          font-weight: 600;
          color: var(--ink);
          box-shadow: 0 4px 12px rgba(31, 31, 31, 0.02);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }

        .dd-categoryCard:hover {
          transform: translateY(-2px);
          border-color: var(--taupe);
          box-shadow: 0 8px 20px rgba(31, 31, 31, 0.06);
        }

        .dd-categoryCard:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .dd-categories {
            padding: 10px 18px 60px;
          }
          .dd-categories__grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
          }
          .dd-categoryCard {
            min-height: 72px;
            padding: 12px 14px;
            font-size: 13.5px;
            border-radius: 12px;
          }
        }
      `}</style>

      <div className="dd-categories__inner">
        <div className="dd-categories__header">
          <h2 className="dd-categories__title">Shop by Category</h2>
          <p className="dd-categories__subtitle">Select a category to view matched prices</p>
        </div>

        <div className="dd-categories__grid">
          {categoriesList.map((category) => (
            <button
              key={category}
              type="button"
              className="dd-categoryCard"
              onClick={() => handleCategoryClick(category)}
            >
              <span>{category}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoryGrid;
