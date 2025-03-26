import React, { useState } from 'react';
import { useLocalStorage } from '../lib/hooks/useLocalStorage';

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  section: string;
  isChecked: boolean;
  source: string; // Recipe name or 'custom'
  recipeId?: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: GroceryItem[];
}

interface GroceryListProps {
  ingredients?: string[];
  recipeName?: string;
  onClose: () => void;
}

const GroceryList: React.FC<GroceryListProps> = ({ ingredients = [], recipeName = '', onClose }) => {
  // State for recipes and custom items
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', []);
  const [customItems, setCustomItems] = useLocalStorage<GroceryItem[]>('customItems', []);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Form state for adding custom items
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: ''
  });
  
  // State for suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common grocery items for predictive text
  const commonGroceryItems = [
    // Produce
    "Apple", "Banana", "Orange", "Strawberry", "Blueberry", "Lemon", "Lime", "Avocado",
    "Tomato", "Potato", "Onion", "Garlic", "Carrot", "Celery", "Lettuce", "Spinach",
    "Kale", "Cucumber", "Bell Pepper", "Jalapeño", "Zucchini", "Broccoli", "Cauliflower",
    "Mushroom", "Sweet Potato", "Green Beans", "Asparagus", "Corn", "Ginger",
    
    // Dairy & Eggs
    "Milk", "Eggs", "Butter", "Cheese", "Yogurt", "Cream", "Sour Cream", "Cream Cheese",
    "Cheddar Cheese", "Mozzarella", "Parmesan", "Feta Cheese", "Half and Half",
    
    // Meat & Seafood
    "Chicken Breast", "Ground Beef", "Ground Turkey", "Steak", "Pork Chops", "Bacon",
    "Sausage", "Ham", "Salmon", "Tuna", "Shrimp", "Fish Fillets", "Hot Dogs", "Deli Meat",
    
    // Pantry
    "Bread", "Rice", "Pasta", "Flour", "Sugar", "Oil", "Vinegar", "Salt", "Pepper",
    "Cereal", "Oatmeal", "Peanut Butter", "Jelly", "Honey", "Maple Syrup", "Ketchup",
    "Mustard", "Mayonnaise", "Soy Sauce", "Hot Sauce", "BBQ Sauce", "Salsa", "Pasta Sauce",
    "Canned Tomatoes", "Canned Beans", "Canned Soup", "Canned Tuna", "Broth", "Coffee",
    "Tea", "Juice", "Soda", "Water", "Chips", "Crackers", "Cookies", "Spices", "Herbs",
    
    // Baking
    "Baking Powder", "Baking Soda", "Vanilla Extract", "Chocolate Chips", "Brown Sugar",
    "Powdered Sugar", "Cocoa Powder", "Yeast", "Cornstarch",
    
    // Frozen
    "Frozen Pizza", "Ice Cream", "Frozen Vegetables", "Frozen Fruit", "Frozen Waffles"
  ];
  
  // Handle input changes and update suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewItem({ ...newItem, name: value });
    
    if (value.trim() !== '') {
      const inputLower = value.toLowerCase();
      
      // Split into exact matches (starting with input) and partial matches
      const exactMatches = commonGroceryItems.filter(item => 
        item.toLowerCase().startsWith(inputLower)
      );
      
      const partialMatches = commonGroceryItems.filter(item => 
        !item.toLowerCase().startsWith(inputLower) && 
        item.toLowerCase().includes(inputLower)
      );
      
      // Combine exact matches first, then partial matches
      const allMatches = [...exactMatches, ...partialMatches];
      
      setSuggestions(allMatches.slice(0, 5)); // Limit to 5 suggestions
      setShowSuggestions(allMatches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setNewItem({ ...newItem, name: suggestion });
    setSuggestions([]);
    setShowSuggestions(false);
  };
  
  // Handle form click to close suggestions when clicking outside
  const formRef = React.useRef<HTMLFormElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add current recipe ingredients to recipes list if not already added
  React.useEffect(() => {
    if (ingredients.length > 0 && recipeName) {
      // Check if this recipe is already in the list
      const existingRecipe = recipes.find(r => r.name === recipeName);
      
      if (!existingRecipe) {
        const newRecipe: Recipe = {
          id: Date.now().toString(),
          name: recipeName,
          ingredients: ingredients.map(ingredient => ({
            id: Date.now() + Math.random().toString(36).substring(2, 9),
            name: ingredient,
            quantity: '',
            section: determineSection(ingredient),
            isChecked: false,
            source: recipeName
          }))
        };
        
        setRecipes([...recipes, newRecipe]);
      }
    }
  }, [ingredients, recipeName]);

  // Get all grocery items from all sources
  const getAllItems = () => {
    const recipeItems = recipes.flatMap(recipe => 
      recipe.ingredients.map(item => ({...item, recipeId: recipe.id}))
    );
    return [...recipeItems, ...customItems];
  };

  // Toggle check status for an item
  const toggleItemCheck = (itemId: string, recipeId?: string) => {
    // Check if it's a custom item
    const customItemIndex = customItems.findIndex(item => item.id === itemId);
    
    if (customItemIndex !== -1) {
      // Update custom item
      const updatedCustomItems = [...customItems];
      updatedCustomItems[customItemIndex] = {
        ...updatedCustomItems[customItemIndex],
        isChecked: !updatedCustomItems[customItemIndex].isChecked
      };
      setCustomItems(updatedCustomItems);
      // Notify other components of the update
      notifyGroceryListUpdated();
    } else if (recipeId) {
      // Update recipe item
      const updatedRecipes = recipes.map(recipe => {
        if (recipe.id === recipeId) {
          return {
            ...recipe,
            ingredients: recipe.ingredients.map(ingredient => 
              ingredient.id === itemId 
                ? { ...ingredient, isChecked: !ingredient.isChecked } 
                : ingredient
            )
          };
        }
        return recipe;
      });
      setRecipes(updatedRecipes);
      // Notify other components of the update
      notifyGroceryListUpdated();
    } else {
      // If no recipeId provided, try to find the item in all recipes
      const allItems = getAllItems();
      const item = allItems.find(item => item.id === itemId);
      
      if (item && item.recipeId) {
        // Found the item, update it in the correct recipe
        const updatedRecipes = recipes.map(recipe => {
          if (recipe.id === item.recipeId) {
            return {
              ...recipe,
              ingredients: recipe.ingredients.map(ingredient => 
                ingredient.id === itemId 
                  ? { ...ingredient, isChecked: !ingredient.isChecked } 
                  : ingredient
              )
            };
          }
          return recipe;
        });
        setRecipes(updatedRecipes);
        // Notify other components of the update
        notifyGroceryListUpdated();
      }
    }
  };

  // Function to automatically determine the section for an item
  const determineSection = (itemName: string): string => {
    itemName = itemName.toLowerCase();
    
    // Define categories and their common items
    const categories = {
      "Produce": ["apple", "banana", "orange", "lettuce", "tomato", "cucumber", "carrot", "onion", "potato", "avocado", "spinach", "kale", "broccoli", "cauliflower", "pepper", "zucchini", "squash", "garlic", "ginger", "lemon", "lime", "herbs", "cilantro", "parsley", "basil", "mint", "thyme", "rosemary"],
      "Dairy": ["milk", "cheese", "yogurt", "butter", "cream", "egg", "eggs", "sour cream", "cottage cheese", "ricotta", "mozzarella", "cheddar", "parmesan", "feta", "cream cheese"],
      "Meat & Seafood": ["beef", "chicken", "pork", "lamb", "turkey", "salmon", "tuna", "fish", "shrimp", "bacon", "sausage", "steak", "ground", "hamburger", "tilapia", "cod", "crab", "lobster"],
      "Grains & Bread": ["bread", "rice", "pasta", "cereal", "flour", "oat", "oats", "quinoa", "tortilla", "noodle", "bagel", "bun", "roll", "cracker", "granola", "barley", "couscous"],
      "Canned & Jarred": ["can", "canned", "jar", "soup", "beans", "tomato sauce", "salsa", "olives", "pickles", "tuna", "corn", "peas", "canned vegetable", "canned fruit"],
      "Frozen": ["frozen", "ice cream", "frozen pizza", "frozen vegetable", "frozen fruit", "frozen meal"],
      "Snacks": ["chip", "chips", "cracker", "cookie", "candy", "chocolate", "popcorn", "pretzel", "nuts", "dried fruit", "snack", "bar", "granola bar"],
      "Beverages": ["water", "soda", "juice", "coffee", "tea", "wine", "beer", "alcohol", "milk", "drink", "beverage", "lemonade"],
      "Condiments & Sauces": ["ketchup", "mustard", "mayonnaise", "sauce", "dressing", "oil", "vinegar", "soy sauce", "hot sauce", "bbq sauce", "gravy", "syrup", "honey", "jam", "jelly"],
      "Spices & Baking": ["salt", "pepper", "spice", "herb", "sugar", "flour", "baking powder", "baking soda", "vanilla", "cinnamon", "cumin", "paprika", "oregano", "basil", "bay leaf"],
    };
    
    // Check if item name contains any of the terms in each category
    for (const [category, terms] of Object.entries(categories)) {
      if (terms.some(term => itemName.includes(term))) {
        return category;
      }
    }
    
    // Default section if no match is found
    return "Other";
  };

  // Add a custom item to the grocery list
  const addCustomItem = () => {
    if (newItem.name.trim() === '') return;
    
    // Determine the section automatically based on the item name
    const section = determineSection(newItem.name);
    
    setCustomItems([
      ...customItems,
      {
        id: `custom-${Date.now().toString()}`,
        name: newItem.name,
        quantity: newItem.quantity || '1',
        section,
        isChecked: false,
        source: 'custom'
      }
    ]);
    
    setNewItem({ name: '', quantity: '' });
  };

  // Remove a custom item
  const removeCustomItem = (itemId: string) => {
    setCustomItems(customItems.filter(item => item.id !== itemId));
  };

  // Helper function to notify other components about grocery list changes
  const notifyGroceryListUpdated = () => {
    if (typeof window !== 'undefined') {
      // Use a normal event for same-window components
      const event = new Event('groceryListUpdated');
      window.dispatchEvent(event);
      
      // Also trigger a storage event for cross-tab updates
      const tempKey = 'temp-grocery-update-' + Date.now();
      localStorage.setItem(tempKey, 'true');
      localStorage.removeItem(tempKey);
    }
  };

  // Remove a recipe
  const removeRecipe = (recipeId: string) => {
    setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
    // If we're currently viewing the recipe being removed, switch back to 'all' view
    if (activeTab === recipeId) {
      setActiveTab('all');
    }
    
    // Notify other components
    notifyGroceryListUpdated();
  };
  
  // Clear all grocery items (both custom and recipes)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  
  const handleClearAll = () => {
    setShowClearConfirmation(true);
  };
  
  const confirmClearAll = () => {
    setCustomItems([]);
    setRecipes([]);
    setShowClearConfirmation(false);
    
    // Notify other components
    notifyGroceryListUpdated();
  };
  
  const cancelClearAll = () => {
    setShowClearConfirmation(false);
  };
  
  // Remove checked items from all lists
  const removeCheckedItems = () => {
    // Remove checked custom items
    setCustomItems(customItems.filter(item => !item.isChecked));
    
    // Remove checked items from recipes
    const updatedRecipes = recipes.map(recipe => ({
      ...recipe,
      ingredients: recipe.ingredients.filter(ingredient => !ingredient.isChecked)
    }));
    
    // Remove recipes that no longer have any ingredients
    setRecipes(updatedRecipes.filter(recipe => recipe.ingredients.length > 0));
    
    // Notify other components
    notifyGroceryListUpdated();
  };

  // Group items by section (for "All Items" view)
  const getItemsBySection = () => {
    const allItems = getAllItems();
    const sections: Record<string, GroceryItem[]> = {};
    
    allItems.forEach(item => {
      if (!sections[item.section]) {
        sections[item.section] = [];
      }
      sections[item.section].push(item);
    });
    
    return sections;
  };
  
  // Check if we have any recipes
  const hasRecipes = recipes.length > 0;
  
  // Remove checked items from a specific recipe
  const removeCheckedItemsFromRecipe = (recipeId: string) => {
    const updatedRecipes = recipes.map(recipe => {
      if (recipe.id === recipeId) {
        const updatedIngredients = recipe.ingredients.filter(item => !item.isChecked);
        return {
          ...recipe,
          ingredients: updatedIngredients
        };
      }
      return recipe;
    });
    
    // Remove recipes that no longer have any ingredients
    setRecipes(updatedRecipes.filter(recipe => recipe.ingredients.length > 0));
    
    // Notify other components
    notifyGroceryListUpdated();
  };

  // Group ingredients by section
  const organizeRecipeItemsBySection = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      const sections: Record<string, GroceryItem[]> = {};
      recipe.ingredients.forEach(item => {
        if (!sections[item.section]) {
          sections[item.section] = [];
        }
        sections[item.section].push(item);
      });
      return sections;
    }
    return {};
  };

  // Group all items by section for display
  const organizeItemsBySection = () => {
    const sections: Record<string, GroceryItem[]> = {};
    
    // Add custom items
    customItems.forEach(item => {
      if (!sections[item.section]) {
        sections[item.section] = [];
      }
      sections[item.section].push(item);
    });
    
    // Add recipe items
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(item => {
        if (!sections[item.section]) {
          sections[item.section] = [];
        }
        sections[item.section].push({
          ...item,
          recipeId: recipe.id
        });
      });
    });
    
    return sections;
  };

  // Remove any grocery item (from custom items or recipe ingredients)
  const removeGroceryItem = (itemId: string, recipeId?: string) => {
    // Check if it's a custom item first
    const customItemIndex = customItems.findIndex(item => item.id === itemId);
    
    if (customItemIndex !== -1) {
      // Item is a custom item
      removeCustomItem(itemId);
      return;
    }
    
    // If recipeId is provided, we know which recipe to update
    if (recipeId) {
      const updatedRecipes = recipes.map(recipe => {
        if (recipe.id === recipeId) {
          const updatedIngredients = recipe.ingredients.filter(item => item.id !== itemId);
          return {
            ...recipe,
            ingredients: updatedIngredients
          };
        }
        return recipe;
      });
      
      // Remove recipes that no longer have any ingredients
      setRecipes(updatedRecipes.filter(recipe => recipe.ingredients.length > 0));
      
      // Notify other components
      notifyGroceryListUpdated();
      return;
    }
    
    // If we reach here, we need to find the item in all recipes
    const allItems = getAllItems();
    const item = allItems.find(item => item.id === itemId);
    
    if (item && item.recipeId) {
      // Found the item, remove it from the correct recipe
      const targetRecipeId = item.recipeId;
      const updatedRecipes = recipes.map(recipe => {
        if (recipe.id === targetRecipeId) {
          const updatedIngredients = recipe.ingredients.filter(ingredient => ingredient.id !== itemId);
          return {
            ...recipe,
            ingredients: updatedIngredients
          };
        }
        return recipe;
      });
      
      // Remove recipes that no longer have any ingredients
      setRecipes(updatedRecipes.filter(recipe => recipe.ingredients.length > 0));
      
      // Notify other components
      notifyGroceryListUpdated();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center md:p-4 z-50">
      <div className="bg-gray-900 rounded-xl md:rounded-xl p-4 md:p-6 w-full max-w-3xl md:max-h-[90vh] h-full md:h-auto overflow-y-auto relative">
        {/* Close button */}
          <button 
            onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        
        <h2 className="text-2xl font-bold text-white mb-4">Grocery List</h2>
        
        {/* Tab navigation with horizontal scrolling */}
        <div className="relative mb-4">
          {/* Scrollable container */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {/* All Items tab is always present */}
          <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg flex-shrink-0 ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            All Items
            </button>
            
            {/* Recipe tabs with X buttons */}
            {recipes.map(recipe => (
              <div key={recipe.id} className="flex-shrink-0 relative">
                <button
                  onClick={() => setActiveTab(recipe.id)}
                  className={`px-4 pr-8 py-2 rounded-lg whitespace-nowrap ${activeTab === recipe.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  {recipe.name}
          </button>
          <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the tab button click
                    removeRecipe(recipe.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={`Remove ${recipe.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
          </button>
              </div>
            ))}
          </div>
          
          {/* Optional scroll shadows for better UX */}
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none"></div>
        </div>
        
        {/* Add custom item form */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-xl text-blue-400 mb-4">Add Custom Item</h3>
          
          <form ref={formRef} onSubmit={(e) => { e.preventDefault(); addCustomItem(); }} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                  <input 
                  type="text"
                  value={newItem.name}
                  onChange={handleInputChange}
                  placeholder="Item name"
                  className="bg-gray-900 text-white rounded-lg p-3 w-full"
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-white"
                      >
                        {suggestion}
                </li>
              ))}
            </ul>
                )}
              </div>
              
              <input
                type="text"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                placeholder="Quantity"
                className="bg-gray-900 text-white rounded-lg p-3 w-full md:w-auto"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
            >
              Add Item
            </button>
          </form>
          
          {/* Move these buttons inside the gray box */}
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <button
              onClick={removeCheckedItems}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-colors"
            >
              Remove Checked Items
            </button>
            
            <button
              onClick={() => setShowClearConfirmation(true)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors"
            >
              Clear All Items
            </button>
          </div>
        </div>
        
        {/* Display grocery items based on active tab */}
        {activeTab === 'all' ? (
          // Show all items grouped by section
          <>
            {Object.entries(getItemsBySection()).map(([section, items]) => (
              <div key={section} className="mb-8">
                <h3 className="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">{section}</h3>
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={item.isChecked}
                          onChange={() => toggleItemCheck(item.id, item.recipeId)}
                          className="h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 mr-3"
                        />
                        <span className={`${item.isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                          {item.name} {item.quantity ? `(${item.quantity})` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => removeGroceryItem(item.id, item.recipeId)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          // Show recipe-specific view
          recipes.find(r => r.id === activeTab) && (
            <div key={activeTab} className="recipe-list">
              {/* Group ingredients by section */}
              {Object.entries(organizeRecipeItemsBySection(activeTab)).map(([section, items]) => (
                <div key={section} className="mb-6">
                  <h4 className="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">{section}</h4>
                  <ul className="space-y-2">
                    {items.map(item => (
                      <li key={item.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={item.isChecked}
                            onChange={() => toggleItemCheck(item.id, activeTab)}
                            className="h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 mr-3"
                          />
                          <span className={`${item.isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                            {item.name} {item.quantity ? `(${item.quantity})` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => removeGroceryItem(item.id, activeTab)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        )}
        
        {/* Confirmation Modal for Clear All */}
        {showClearConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Clear All Items?</h3>
              <p className="text-gray-300 mb-6">This will remove all items from your grocery list. This action cannot be undone.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowClearConfirmation(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearAll}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default GroceryList; 