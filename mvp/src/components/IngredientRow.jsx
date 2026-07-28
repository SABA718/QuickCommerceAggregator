import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function IngredientRow({ 
  baseIngredient, // e.g., "tomato"
  displayName,    // e.g., "Tomato"
  availableQuantities, // e.g., ["250g", "500g", "1kg", "2kg", "5kg"]
  imageIcon 
}) {
  // Track the currently selected dropdown value
  const [selectedQuantity, setSelectedQuantity] = useState(availableQuantities[0]);
  const [platformData, setPlatformData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // The Fetch Effect: Runs automatically whenever selectedQuantity changes
  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        // Construct the EXACT string stored in your Supabase DB (e.g., "tomato 1kg")
        const exactSearchQuery = `${baseIngredient} ${selectedQuantity}`.toLowerCase();
        
        // Hit your existing Node.js Gateway
        const response = await axios.get(`http://localhost:3000/api/search?query=${exactSearchQuery}`);
        
        if (response.data && response.data.results) {
          setPlatformData(response.data.results);
        }
      } catch (error) {
        console.error(`Error fetching data for ${baseIngredient}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [baseIngredient, selectedQuantity]); 

  return (
    <div className="flex items-center justify-between p-4 mb-4 bg-white border border-gray-100 rounded-xl shadow-sm">
      
      {/* LEFT SIDE: Image, Name, and Dynamic Dropdown */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          <img src={imageIcon} alt={displayName} className="object-cover" />
        </div>
        
        <div>
          <h3 className="font-bold text-gray-800 capitalize">{displayName}</h3>
          
          <select 
            className="mt-1 block w-32 px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
            value={selectedQuantity}
            onChange={(e) => setSelectedQuantity(e.target.value)}
            disabled={isLoading}
          >
            {availableQuantities.map((qty) => (
              <option key={qty} value={qty}>
                {qty}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RIGHT SIDE: The Price Comparison Blocks */}
      <div className="flex gap-2">
        {isLoading ? (
          <div className="text-sm text-gray-400 animate-pulse">Fetching...</div>
        ) : (
          platformData.length > 0 ? (
            platformData.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg min-w-[100px]"
              >
                {item.platform === 'Blinkit' && <span className="text-yellow-500 font-bold">B</span>}
                {item.platform === 'Zepto' && <span className="text-purple-600 font-bold">Z</span>}
                <span className="font-bold text-gray-800">₹{item.price}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-red-400">Out of Stock</div>
          )
        )}
      </div>
    </div>
  );
}