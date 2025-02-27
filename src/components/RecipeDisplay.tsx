import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveRecipe, signInWithGoogle } from '@/lib/firebase/firebaseUtils';

export default function RecipeDisplay({ recipe, recipeImage }: { recipe: any, recipeImage: string | null }) {
  // Add state for showing/hiding the shopping list
  const [showShoppingList, setShowShoppingList] = useState(false);
  
  // Add state for recipe saving
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Extract all ingredients into a flat array
  const extractIngredients = () => {
    if (typeof recipe === 'string') {
      // Extract ingredients from markdown - improved version
      const ingredientLines = [];
      
      // Find all ingredient sections (both main Ingredients section and subsections)
      const mainIngredientsMatch = recipe.match(/## Ingredients[\s\S]*?(?=##|$)/);
      
      if (mainIngredientsMatch) {
        const ingredientsSection = mainIngredientsMatch[0];
        
        // Get all lines that start with "- " (ingredient items)
        const lines = ingredientsSection.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('- ')) {
            // Add the ingredient without the "- " prefix
            ingredientLines.push(trimmedLine.substring(2).trim());
          }
        }
      }
      
      // Also look for subsections like "Meat Sauce:" and "Cheese Filling:"
      const subsectionMatches = recipe.match(/(?:^|\n)([^#].*?):\s*\n((?:\s*- .*\n)+)/gm);
      if (subsectionMatches) {
        subsectionMatches.forEach(match => {
          const lines = match.split('\n');
          lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ')) {
              // Add the ingredient without the "- " prefix
              ingredientLines.push(trimmedLine.substring(2).trim());
            }
          });
        });
      }
      
      return ingredientLines;
    } else if (recipe.ingredients) {
      // If we have structured data, use that
      return Array.isArray(recipe.ingredients) 
        ? recipe.ingredients 
        : [];
    }
    return [];
  };
  
  // Don't try to parse as JSON - handle as markdown or object
  const parsedRecipe = typeof recipe === 'object' ? recipe : { 
    title: 'Recipe',
    markdown: recipe 
  };
  
  // If we have markdown content, render it
  if (typeof recipe === 'string') {
    // Extract metadata from markdown if possible
    const prepTimeMatch = recipe.match(/Prep Time:\s*(.+?)(?:\n|$)/i);
    const cookTimeMatch = recipe.match(/Cook Time:\s*(.+?)(?:\n|$)/i);
    const totalTimeMatch = recipe.match(/Total Time:\s*(.+?)(?:\n|$)/i);
    const servingsMatch = recipe.match(/Servings:\s*(.+?)(?:\n|$)/i);
    
    // Format markdown for display
    const formattedMarkdown = formatMarkdown(recipe);
    
    const handleSaveRecipe = async () => {
      if (!user) {
        // Show login prompt instead of saving
        setShowLoginPrompt(true);
        return;
      }
      
      try {
        setIsSaving(true);
        
        // Prepare the recipe data
        const recipeData = typeof recipe === 'string' 
          ? { 
              content: recipe, 
              title: recipe.match(/# (.+?)(\n|$)/)?.[1] || 'Untitled Recipe',
              type: 'markdown'
            }
          : { 
              ...recipe,
              type: 'structured'
            };
        
        // Add the image if present
        if (recipeImage) {
          recipeData.imageUrl = recipeImage;
        }
        
        await saveRecipe(user.uid, recipeData);
        setSaveSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Failed to save recipe. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };
    
    return (
      <div className="bg-gray-900 rounded-xl p-6 shadow-lg relative">
        {recipeImage && (
          <div className="mb-6 rounded-xl overflow-hidden relative h-64 w-full">
            <Image 
              src={recipeImage} 
              alt="Recipe image" 
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            
            {/* Shopping list button positioned in the bottom right of the image container */}
            <button 
              onClick={() => setShowShoppingList(true)}
              className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-10"
              aria-label="Show shopping list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            
            {/* Save button positioned in the bottom left of the image container */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button 
                onClick={handleSaveRecipe}
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full shadow-lg z-10 transition-all"
                aria-label={user ? "Save recipe" : "Sign in to save recipe"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={saveSuccess ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Recipe metadata display - modern style */}
        {(prepTimeMatch || cookTimeMatch || totalTimeMatch || servingsMatch) && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6 flex flex-wrap justify-around items-center gap-2 shadow-md">
            {prepTimeMatch && (
              <div className="flex items-center gap-2 px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-300">Prep: <span className="text-white">{prepTimeMatch[1]}</span></span>
              </div>
            )}
            
            {cookTimeMatch && (
              <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
                <span className="text-gray-300">Cook: <span className="text-white">{cookTimeMatch[1]}</span></span>
              </div>
            )}
            
            {totalTimeMatch && (
              <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-300">Total: <span className="text-white">{totalTimeMatch[1]}</span></span>
              </div>
            )}
            
            {servingsMatch && (
              <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-gray-300">Serves: <span className="text-white">{servingsMatch[1]}</span></span>
              </div>
            )}
          </div>
        )}
        
        <div 
          className="prose prose-invert max-w-none" 
          dangerouslySetInnerHTML={{ __html: formattedMarkdown }} 
        />
        
        {/* If no recipe image, show the button in the fixed position */}
        {!recipeImage && (
          <button 
            onClick={() => setShowShoppingList(true)}
            className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-10"
            aria-label="Show shopping list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        )}
        
        {/* Shopping list modal/panel */}
        {showShoppingList && (
          <ShoppingList 
            ingredients={extractIngredients()} 
            onClose={() => setShowShoppingList(false)} 
          />
        )}
        
        {showLoginPrompt && <LoginPrompt />}
      </div>
    );
  }
  
  // If we have a structured object, render it normally
  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg relative">
      {recipeImage && (
        <div className="mb-6 rounded-xl overflow-hidden relative h-64 w-full">
          <Image 
            src={recipeImage} 
            alt={parsedRecipe.title || 'Recipe image'} 
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
          
          {/* Shopping list button positioned in the bottom right of the image container */}
          <button 
            onClick={() => setShowShoppingList(true)}
            className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-10"
            aria-label="Show shopping list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      )}
      
      <h1 className="text-2xl font-bold mb-4">{parsedRecipe.title || 'Recipe'}</h1>
      
      {/* Recipe metadata display - modern iOS-like style */}
      {(parsedRecipe.prepTime || parsedRecipe.cookTime || parsedRecipe.servings) && (
        <div className="bg-gray-800 rounded-xl p-4 mb-6 flex flex-wrap justify-around items-center gap-2 shadow-md">
          {parsedRecipe.prepTime && (
            <div className="flex items-center gap-2 px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-300">Prep: <span className="text-white">{parsedRecipe.prepTime}</span></span>
            </div>
          )}
          
          {parsedRecipe.cookTime && (
            <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
              <span className="text-gray-300">Cook: <span className="text-white">{parsedRecipe.cookTime}</span></span>
            </div>
          )}
          
          {parsedRecipe.servings && (
            <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-gray-300">Serves: <span className="text-white">{parsedRecipe.servings}</span></span>
            </div>
          )}
        </div>
      )}
      
      {parsedRecipe.description && (
        <div className="mb-4">
          <p className="italic text-gray-300">{parsedRecipe.description}</p>
        </div>
      )}
      
      {parsedRecipe.ingredients && parsedRecipe.ingredients.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-400 mb-2">Ingredients</h2>
          <ul className="space-y-2">
            {parsedRecipe.ingredients.map((ingredient: string, index: number) => (
              <li key={index} className="py-1 border-b border-gray-700 last:border-0">{ingredient}</li>
            ))}
          </ul>
        </div>
      )}
      
      {parsedRecipe.instructions && parsedRecipe.instructions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-400 mb-2">Instructions</h2>
          <ol className="list-decimal pl-5 space-y-4">
            {parsedRecipe.instructions.map((instruction: string, index: number) => (
              <li key={index} className="pl-2">{instruction}</li>
            ))}
          </ol>
        </div>
      )}
      
      {parsedRecipe.notes && (
        <div>
          <h2 className="text-xl font-semibold text-blue-400 mb-2">Notes</h2>
          <p className="text-gray-300">{parsedRecipe.notes}</p>
        </div>
      )}
      
      {/* Shopping list modal/panel */}
      {showShoppingList && (
        <ShoppingList 
          ingredients={Array.isArray(parsedRecipe.ingredients) ? parsedRecipe.ingredients : []} 
          onClose={() => setShowShoppingList(false)} 
        />
      )}
    </div>
  );
}

// New component for the shopping list
function ShoppingList({ ingredients, onClose }: { ingredients: string[], onClose: () => void }) {
  const [checkedItems, setCheckedItems] = useState<{[key: string]: boolean}>({});
  const [activeView, setActiveView] = useState<'all' | 'categorized'>('all');
  const [categorizedIngredients, setCategorizedIngredients] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Clean ingredient text by removing markdown formatting
  const cleanIngredientText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic formatting
      .trim();
  };
  
  // Clean all ingredients
  const displayIngredients = useMemo(() => {
    const cleaned = ingredients.map(cleanIngredientText);
    // Enhanced filter for subcategories
    return cleaned.filter(item => {
      // Filter out items ending with colon
      if (item.endsWith(':')) return false;
      
      const lowerItem = item.toLowerCase();
      // Filter out common subcategory patterns
      if (lowerItem.includes('sauce') || 
          lowerItem.includes('filling') || 
          lowerItem.includes('layers') ||
          lowerItem.includes('assembly') ||
          lowerItem.includes('mixture') ||
          lowerItem === 'for serving' ||
          lowerItem.includes('topping')) {
        return false;
      }
      
      return true;
    });
  }, [ingredients]);
  
  useEffect(() => {
    if (ingredients && ingredients.length > 0) {
      setIsLoading(true);
      
      // Clean the ingredients and apply comprehensive filtering for subcategories
      const cleaned = ingredients.map(item => 
        item.replace(/^\s*[-•]\s*/, '').trim()
      )
      .filter(Boolean)
      .filter(item => {
        // Filter out items ending with colon
        if (item.endsWith(':')) return false;
        
        const lowerItem = item.toLowerCase();
        // Filter out common subcategory patterns
        if (lowerItem.includes('sauce') || 
            lowerItem.includes('filling') || 
            lowerItem.includes('layers') ||
            lowerItem.includes('assembly') ||
            lowerItem.includes('mixture') ||
            lowerItem === 'for serving' ||
            lowerItem.includes('topping')) {
          return false;
        }
        
        // Additional filtering for common recipe subdivision markers
        if (lowerItem === 'for the sauce' ||
            lowerItem === 'for the filling' ||
            lowerItem === 'for the topping' ||
            lowerItem === 'for the crust' ||
            lowerItem === 'for garnish' ||
            /^(to|for) (serve|garnish|decorate)/.test(lowerItem)) {
          return false;
        }
        
        return true;
      });
      
      // Use the exact same filtered ingredient list for categorization
      setCategorizedIngredients(categorizeIngredients(cleaned));
      setIsLoading(false);
    }
  }, [ingredients]);
  
  // Extract categorization logic to a separate function to ensure consistency
  const categorizeIngredients = (cleanedIngredients: string[]) => {
    const defaultCategories = {
      'Produce': [],
      'Meat & Seafood': [],
      'Dairy & Eggs': [],
      'Pantry Items': [],
      'Spices & Seasonings': [],
      'Other': []
    };
    
    // Simple local categorization logic
    return cleanedIngredients.reduce((acc: Record<string, string[]>, item: string) => {
      const lowerItem = item.toLowerCase();
      
      // Meat & Seafood (check this first so meat items aren't miscategorized)
      if (lowerItem.includes('meat') || 
          lowerItem.includes('chicken') || 
          lowerItem.includes('beef') || 
          lowerItem.includes('pork') || 
          lowerItem.includes('bacon') || 
          lowerItem.includes('ham') || 
          lowerItem.includes('sausage') || 
          lowerItem.includes('turkey') || 
          lowerItem.includes('lamb') || 
          lowerItem.includes('fish') || 
          lowerItem.includes('seafood') || 
          lowerItem.includes('shrimp') || 
          lowerItem.includes('crab') || 
          lowerItem.includes('lobster') || 
          lowerItem.includes('salmon') || 
          lowerItem.includes('tuna') || 
          lowerItem.includes('ground') && (
            lowerItem.includes('beef') || 
            lowerItem.includes('pork') || 
            lowerItem.includes('turkey') || 
            lowerItem.includes('chicken')
          )) {
        acc['Meat & Seafood'].push(item);
      } 
      // Dairy & Eggs
      else if (lowerItem.includes('milk') || 
          lowerItem.includes('cheese') || 
          lowerItem.includes('yogurt') || 
          lowerItem.includes('cream') || 
          lowerItem.includes('butter') || 
          lowerItem.includes('egg') || 
          lowerItem.includes('dairy') || 
          lowerItem.includes('ricotta') || 
          lowerItem.includes('mozzarella') || 
          lowerItem.includes('parmesan') || 
          lowerItem.includes('cheddar') || 
          lowerItem.includes('yoghurt') || 
          lowerItem.includes('buttermilk')) {
        acc['Dairy & Eggs'].push(item);
      } 
      // Produce (fruits and vegetables)
      else if (lowerItem.includes('vegetable') || 
          lowerItem.includes('fruit') || 
          lowerItem.includes('onion') || 
          lowerItem.includes('garlic') || 
          lowerItem.includes('tomato') || 
          lowerItem.includes('potato') || 
          lowerItem.includes('carrot') || 
          lowerItem.includes('lettuce') || 
          lowerItem.includes('apple') || 
          lowerItem.includes('banana') || 
          lowerItem.includes('orange') || 
          lowerItem.includes('lemon') || 
          lowerItem.includes('lime') || 
          lowerItem.includes('pepper') && (
            lowerItem.includes('bell') || 
            lowerItem.includes('red') || 
            lowerItem.includes('green') || 
            lowerItem.includes('yellow')
          ) || 
          lowerItem.includes('celery') || 
          lowerItem.includes('cucumber') || 
          lowerItem.includes('zucchini') || 
          lowerItem.includes('squash') || 
          lowerItem.includes('mushroom') || 
          lowerItem.includes('spinach') || 
          lowerItem.includes('kale') || 
          lowerItem.includes('broccoli') || 
          lowerItem.includes('cauliflower') || 
          lowerItem.includes('berries') || 
          lowerItem.includes('avocado')) {
        acc['Produce'].push(item);
      } 
      // Spices & Seasonings
      else if (lowerItem.includes('salt') || 
          lowerItem.includes('black pepper') || 
          lowerItem.includes('spice') || 
          lowerItem.includes('herb') || 
          lowerItem.includes('powder') || 
          lowerItem.includes('cumin') || 
          lowerItem.includes('oregano') || 
          lowerItem.includes('basil') || 
          lowerItem.includes('thyme') || 
          lowerItem.includes('rosemary') || 
          lowerItem.includes('cilantro') || 
          lowerItem.includes('coriander') || 
          lowerItem.includes('cinnamon') || 
          lowerItem.includes('nutmeg') || 
          lowerItem.includes('paprika') || 
          lowerItem.includes('chili') || 
          lowerItem.includes('cayenne') || 
          lowerItem.includes('seasoning') || 
          lowerItem.includes('vanilla')) {
        acc['Spices & Seasonings'].push(item);
      } 
      // Pantry Items
      else if (lowerItem.includes('flour') || 
          lowerItem.includes('sugar') || 
          lowerItem.includes('oil') || 
          lowerItem.includes('pasta') || 
          lowerItem.includes('rice') || 
          lowerItem.includes('beans') || 
          lowerItem.includes('canned') || 
          lowerItem.includes('broth') || 
          lowerItem.includes('stock') || 
          lowerItem.includes('vinegar') || 
          lowerItem.includes('sauce') || 
          lowerItem.includes('soy sauce') || 
          lowerItem.includes('ketchup') || 
          lowerItem.includes('mustard') || 
          lowerItem.includes('mayonnaise') || 
          lowerItem.includes('honey') || 
          lowerItem.includes('maple syrup') || 
          lowerItem.includes('bread') || 
          lowerItem.includes('cereal') || 
          lowerItem.includes('crackers') || 
          lowerItem.includes('nuts') || 
          lowerItem.includes('chocolate') || 
          lowerItem.includes('baking')) {
        acc['Pantry Items'].push(item);
      } 
      // Other (anything not matching above)
      else {
        acc['Other'].push(item);
      }
      
      return acc;
    }, JSON.parse(JSON.stringify(defaultCategories)));
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          aria-label="Close shopping list"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold mb-2">Shopping List</h2>
        
        <div className="overflow-y-auto flex-grow pr-2 pb-2 mt-4">
          {displayIngredients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No ingredients found in this recipe.</p>
            </div>
          ) : (
            <>
              {/* Tab buttons for view options */}
              <div className="flex mb-6 border-b border-gray-700">
                <button 
                  onClick={() => setActiveView('all')}
                  className={`py-3 px-4 text-lg ${activeView === 'all' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-400 hover:text-white'}`}
                >
                  All Items
                </button>
                <button 
                  onClick={() => setActiveView('categorized')}
                  className={`py-3 px-4 text-lg ${activeView === 'categorized' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-400 hover:text-white'}`}
                >
                  By Category
                </button>
              </div>
              
              {/* All items view */}
              {activeView === 'all' && (
                <ul className="space-y-3">
                  {displayIngredients.map((item, index) => {
                    const isChecked = !!checkedItems[item];
                    return (
                      <li key={`all-${index}`} className="border-b border-gray-700 last:border-0 hover:bg-gray-700 rounded">
                        <label 
                          htmlFor={`item-all-${index}`}
                          className="flex items-start gap-3 py-3 px-2 cursor-pointer w-full"
                        >
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              id={`item-all-${index}`}
                              checked={isChecked}
                              onChange={() => {
                                setCheckedItems(prev => ({
                                  ...prev,
                                  [item]: !isChecked
                                }));
                              }}
                              className="h-5 w-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                            />
                          </div>
                          <span className={`flex-grow text-lg ${isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                            {item}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              
              {/* Categorized view */}
              {activeView === 'categorized' && Object.keys(categorizedIngredients).length > 0 && (
                <div>
                  {Object.entries(categorizedIngredients).map(([category, items]) => (
                    <div key={category} className="mb-8">
                      <h3 className="text-xl font-semibold text-blue-400 mb-3">{category}</h3>
                      <ul className="space-y-3">
                        {items.map((item, index) => {
                          const isChecked = !!checkedItems[item];
                          return (
                            <li key={`${category}-${index}`} className="border-b border-gray-700 last:border-0 hover:bg-gray-700 rounded">
                              <label 
                                htmlFor={`item-${category}-${index}`}
                                className="flex items-start gap-3 py-3 px-2 cursor-pointer w-full"
                              >
                                <div className="flex-shrink-0 pt-1">
                                  <input
                                    type="checkbox"
                                    id={`item-${category}-${index}`}
                                    checked={isChecked}
                                    onChange={() => {
                                      setCheckedItems(prev => ({
                                        ...prev,
                                        [item]: !isChecked
                                      }));
                                    }}
                                    className="h-5 w-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                                  />
                                </div>
                                <span className={`flex-grow text-lg ${isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                                  {item}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Update the formatMarkdown function to remove border lines from non-ingredient sections

function formatMarkdown(text: string) {
  // First, skip common metadata lines that we're already displaying at the top
  const cleanedText = text
    .replace(/^Prep Time:\s*(.+?)$/gm, '')
    .replace(/^Cook Time:\s*(.+?)$/gm, '')
    .replace(/^Total Time:\s*(.+?)$/gm, '')
    .replace(/^Servings:\s*(.+?)$/gm, '')
    .replace(/^Yield:\s*(.+?)$/gm, '')
    .replace(/^Difficulty:\s*(.+?)$/gm, '')
    .replace(/\n\n\n+/g, '\n\n'); // Clean up excess empty lines
  
  // Now split the text into sections based on headers
  const sections = cleanedText.split(/^#+ /m);
  
  let html = '';
  
  // Process each section
  sections.forEach((section, index) => {
    if (index === 0 && !section.trim()) return; // Skip empty first section
    
    const lines = section.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    
    // Skip sections that are just metadata which we already display at the top
    if (/^(prep time|cook time|total time|cooking time|servings|yield|difficulty|serves)/i.test(title)) {
      return;
    }
    
    // Determine header level based on the original markdown
    const headerMatch = text.match(new RegExp(`^(#+) ${title}`, 'm'));
    const headerLevel = headerMatch ? headerMatch[1].length : 1;
    
    // Add section header with more spacing
    html += `<div class="recipe-section mb-14">`;
    
    // Make the main title much larger and centered
    if (headerLevel === 1) {
      html += `<h1 class="text-3xl font-bold text-white mb-6 text-center">${title}</h1>`;
    } else {
      // Center the section headers (Ingredients, Instructions, etc.)
      html += `<h2 class="text-2xl font-bold text-blue-400 mb-5 text-center">${title}</h2>`;
    }
    
    // Process content based on type
    if (content.includes('- ')) {
      // This is likely an ingredients list
      html += `<ul class="space-y-4">`;
      
      // Split by list items but preserve nested structure
      const listItems = content.split(/^- /m).filter(Boolean);
      
      // Check if this is the Ingredients section to apply borders
      const isIngredientsSection = title.toLowerCase().includes('ingredient');
      
      listItems.forEach(item => {
        const trimmedItem = item.trim();
        
        // Check if this is a subheading (ends with colon)
        if (trimmedItem.endsWith(':')) {
          // Make subsection headers (like "Cheese Filling:") with a distinct style
          // Use amber/gold color to distinguish from blue section headers and white main title
          html += `<li class="font-semibold text-lg mt-6 mb-3 text-amber-400">${trimmedItem}</li>`;
        } else {
          // Process nested lists
          if (trimmedItem.includes('\n  - ')) {
            const [mainItem, ...subItems] = trimmedItem.split('\n  - ');
            html += `<li class="font-semibold mt-4 mb-2">${mainItem.trim()}</li>`;
            html += `<ul class="pl-4 space-y-2 mb-4">`;
            subItems.forEach(subItem => {
              html += `<li class="py-1 mb-1">${subItem.trim()}</li>`;
            });
            html += `</ul>`;
          } else {
            // Only apply borders to ingredients section items
            const borderClass = isIngredientsSection ? "border-b border-gray-700 last:border-0" : "";
            html += `<li class="py-1 ${borderClass} mb-1">${trimmedItem}</li>`;
          }
        }
      });
      
      html += `</ul>`;
    } else if (content.match(/^\d+\./m)) {
      // This is likely an instructions list
      html += `<ol class="list-decimal pl-5 space-y-6">`;
      
      const listItems = content.split(/^\d+\. /m).filter(Boolean);
      
      listItems.forEach(item => {
        html += `<li class="pl-2 pb-3">${item.trim()}</li>`;
      });
      
      html += `</ol>`;
    } else {
      // Regular paragraph content
      const paragraphs = content.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          html += `<p class="text-gray-300 mb-3">${para.trim()}</p>`;
        }
      });
    }
    
    html += `</div>`;
  });
  
  // Apply additional formatting
  html = html
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return html;
}

// Add a login prompt modal
const LoginPrompt = () => (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
    <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 relative">
      <button 
        onClick={() => setShowLoginPrompt(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-white"
        aria-label="Close login prompt"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <h2 className="text-xl font-bold mb-4">Sign in to save recipes</h2>
      <p className="text-gray-300 mb-6">Create a free account to save this recipe to your collection and access it anytime.</p>
      
      <button
        onClick={async () => {
          try {
            const success = await signInWithGoogle();
            if (success) {
              setShowLoginPrompt(false);
              // Try to save again after successful login
              handleSaveRecipe();
            }
          } catch (error) {
            // Error is already logged in the signInWithGoogle function
          }
        }}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#ffffff" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  </div>
); 