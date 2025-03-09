import React, { useState } from 'react';

interface GroceryListProps {
  ingredients: string[];
  onClose: () => void;
}

const GroceryList: React.FC<GroceryListProps> = ({ ingredients, onClose }) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'sections'>('sections');
  
  // Organize ingredients by section
  const categorizeIngredients = (items: string[]) => {
    const categories: Record<string, string[]> = {
      'Produce': [],
      'Meat & Seafood': [],
      'Dairy & Eggs': [],
      'Bakery': [],
      'Pantry': [],
      'Spices & Seasonings': [],
      'Other': []
    };
    
    // Simple keyword-based categorization
    const categoryKeywords: Record<string, string[]> = {
      'Produce': ['apple', 'banana', 'orange', 'lemon', 'lime', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'celery', 'lettuce', 'spinach', 'kale', 'cucumber', 'pepper', 'zucchini', 'squash', 'broccoli', 'cauliflower', 'mushroom', 'avocado', 'herb', 'cilantro', 'parsley', 'basil', 'mint', 'thyme', 'rosemary', 'sage', 'green', 'red', 'yellow', 'bell'],
      'Meat & Seafood': ['beef', 'chicken', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'meat', 'steak', 'ground', 'sausage', 'bacon', 'ham', 'seafood', 'tilapia', 'cod', 'halibut'],
      'Dairy & Eggs': ['milk', 'cream', 'cheese', 'yogurt', 'butter', 'egg', 'margarine', 'sour cream', 'cream cheese', 'cheddar', 'mozzarella', 'parmesan', 'ricotta', 'feta', 'dairy'],
      'Bakery': ['bread', 'roll', 'bun', 'bagel', 'croissant', 'muffin', 'cake', 'pie', 'cookie', 'pastry', 'dough', 'flour', 'tortilla', 'pita'],
      'Pantry': ['rice', 'pasta', 'noodle', 'bean', 'lentil', 'chickpea', 'can', 'jar', 'sauce', 'oil', 'vinegar', 'sugar', 'honey', 'syrup', 'cereal', 'oat', 'nut', 'seed', 'dried', 'canned'],
      'Spices & Seasonings': ['salt', 'pepper', 'spice', 'seasoning', 'herb', 'cumin', 'paprika', 'cinnamon', 'nutmeg', 'oregano', 'basil', 'thyme', 'rosemary', 'sage', 'bay leaf', 'chili powder', 'curry', 'turmeric', 'ginger', 'garlic powder', 'onion powder']
    };
    
    items.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      let assigned = false;
      
      // Check each category for matching keywords
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
          categories[category].push(ingredient);
          assigned = true;
          break;
        }
      }
      
      // If no category matched, put in "Other"
      if (!assigned) {
        categories['Other'].push(ingredient);
      }
    });
    
    // Remove empty sections
    return Object.fromEntries(
      Object.entries(categories).filter(([_, items]) => items.length > 0)
    );
  };
  
  const categorizedIngredients = categorizeIngredients(ingredients);
  
  const handleCheckItem = (ingredient: string, checked: boolean) => {
    const newChecked = new Set(checkedItems);
    if (checked) {
      newChecked.add(ingredient);
    } else {
      newChecked.delete(ingredient);
    }
    setCheckedItems(newChecked);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-xl max-h-[95vh] overflow-auto">
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-2xl font-bold">Grocery List</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex border-b border-gray-700">
          <button
            className={`flex-1 py-4 text-center text-xl font-medium ${
              viewMode === 'all' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setViewMode('all')}
          >
            All Items
          </button>
          <button
            className={`flex-1 py-4 text-center text-xl font-medium ${
              viewMode === 'sections' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setViewMode('sections')}
          >
            By Section
          </button>
        </div>
        
        <div className="p-5">
          {viewMode === 'all' ? (
            <ul className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-4">
                  <input 
                    type="checkbox" 
                    id={`ingredient-${index}`}
                    className="mt-1 h-6 w-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    checked={checkedItems.has(ingredient)}
                    onChange={(e) => handleCheckItem(ingredient, e.target.checked)}
                  />
                  <label 
                    htmlFor={`ingredient-${index}`}
                    className="text-gray-300 text-xl"
                  >
                    {ingredient}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-8">
              {Object.entries(categorizedIngredients).map(([section, items]) => (
                <div key={section}>
                  <h4 className="text-xl font-medium text-blue-400 mb-3">{section}</h4>
                  <ul className="space-y-4 pl-2">
                    {items.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <input 
                          type="checkbox" 
                          id={`section-${section}-ingredient-${index}`}
                          className="mt-1 h-6 w-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          checked={checkedItems.has(ingredient)}
                          onChange={(e) => handleCheckItem(ingredient, e.target.checked)}
                        />
                        <label 
                          htmlFor={`section-${section}-ingredient-${index}`}
                          className="text-gray-300 text-xl"
                        >
                          {ingredient}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroceryList; 