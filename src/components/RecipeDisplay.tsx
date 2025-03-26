import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveRecipe, signInWithGoogle, checkIfRecipeSaved } from '@/lib/firebase/firebaseUtils';
import { END_MESSAGES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import GroceryList from './GroceryList';

interface RecipeDisplayProps {
  recipe: string | {
    title: string;
    ingredients: string[];
    ingredientCategories?: Record<string, string[]>;
    instructions: string[];
    markdown: string;
    content?: string;
    notes?: string[];
    cookingInfo?: string[];
    nutrition?: string[];
    storage?: string[];
    reheating?: string[];
    makeAhead?: string[];
    dietaryInfo?: string[];
    method: string;
    url?: string;
  }
  recipeImage?: string;
  url?: string;
}

// Define a more specific type for structured recipes
interface StructuredRecipe {
  title: string;
  ingredients: string[];
  ingredientCategories?: Record<string, string[]> | null;
  instructions: string[];
  notes?: string[] | null;
  cookingInfo?: string[] | null;
  nutrition?: string[] | null;
  storage?: string[] | null;
  makeAhead?: string[] | null;
  dietaryInfo?: string[] | null;
  markdown: string;
  original: string;
  method: string;
  url?: string;
  reheating?: string[] | null;
}

export default function RecipeDisplay({ recipe, recipeImage, url }: RecipeDisplayProps) {
  // Add state for showing/hiding the shopping list
  const [showShoppingList, setShowShoppingList] = useState(false);
  
  // Add state for recipe saving
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
   
  // Add state for grocery list view mode
  const [groceryListMode, setGroceryListMode] = useState<'all' | 'sections'>('all');
  
  // Add state for checked ingredients - this will sync between views
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  
  // Add state for processed content to ensure our CSS fixes are applied
  const [processedContent, setProcessedContent] = useState<string>('');
  
  const router = useRouter();
  
  // Add this state variable with the other state declarations
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  
  // Generate a unique storage key for this recipe
  const storageKey = useMemo(() => {
    if (typeof recipe === 'string') {
      // Extract title from markdown
      const titleMatch = recipe.match(/# (.+)$/m);
      const title = titleMatch ? titleMatch[1].replace(/[^a-zA-Z0-9]/g, '') : '';
      return `grocery-list-${title}-${Date.now()}`;
    }
    return `grocery-list-${Date.now()}`;
  }, [recipe]);
  
  // Load checked ingredients from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedItems = localStorage.getItem(storageKey);
        if (savedItems) {
          setCheckedIngredients(new Set(JSON.parse(savedItems)));
        }
      } catch (error) {
        console.error('Error loading saved grocery list:', error);
      }
    }
  }, [storageKey]);
  
  // Save checked ingredients to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && checkedIngredients.size > 0) {
      try {
        localStorage.setItem(
          storageKey, 
          JSON.stringify(Array.from(checkedIngredients))
        );
      } catch (error) {
        console.error('Error saving grocery list:', error);
      }
    }
  }, [checkedIngredients, storageKey]);
  
  // Handle ingredient checkbox changes
  const handleIngredientCheck = (ingredient: string, checked: boolean) => {
    setCheckedIngredients(prev => {
      const newChecked = new Set(prev);
      if (checked) {
        newChecked.add(ingredient);
      } else {
        newChecked.delete(ingredient);
      }
      return newChecked;
    });
  };
  
  // Clean up old grocery lists (older than 7 days)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        // Get all keys in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          // Check if it's a grocery list key
          if (key && key.startsWith('grocery-list-')) {
            // Extract timestamp from key
            const timestamp = parseInt(key.split('-').pop() || '0', 10);
            
            // If older than 7 days, remove it
            if (timestamp < sevenDaysAgo) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning up old grocery lists:', error);
      }
    }
  }, []);
  
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
  
  // Organize ingredients by section
  const organizeBySection = (ingredients: string[]) => {
    // If we have structured data with ingredient categories, use those instead
    if (typeof recipe !== 'string' && recipe.ingredientCategories) {
      return recipe.ingredientCategories as Record<string, string[]> || {};
    }
    
    // Otherwise use our automatic categorization
    const sections: Record<string, string[]> = {
      'Produce': [],
      'Meat & Seafood': [],
      'Dairy & Eggs': [],
      'Bakery': [],
      'Pantry': [],
      'Frozen': [],
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
      'Frozen': ['frozen', 'ice cream', 'popsicle', 'ice', 'freezer'],
      'Spices & Seasonings': ['salt', 'pepper', 'spice', 'seasoning', 'herb', 'cumin', 'paprika', 'cinnamon', 'nutmeg', 'oregano', 'basil', 'thyme', 'rosemary', 'sage', 'bay leaf', 'chili powder', 'curry', 'turmeric', 'ginger', 'garlic powder', 'onion powder']
    };
    
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      let assigned = false;
      
      // Check each category for matching keywords
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
          sections[category].push(ingredient);
          assigned = true;
          break;
        }
      }
      
      // If no category matched, put in "Other"
      if (!assigned) {
        sections['Other'].push(ingredient);
      }
    });
    
    // Remove empty sections
    return Object.fromEntries(
      Object.entries(sections).filter(([_, items]) => items.length > 0)
    );
  };
  
  // Handle different recipe formats
  const content = typeof recipe === 'string' ? recipe : recipe?.markdown || '';
  
  // Apply post-processing to the content to fix styling issues
  useEffect(() => {
    if (recipe && typeof recipe === 'object' && recipe.content) {
      const processedContent = recipe.content.replace(
        /(## Ingredients\n+)(For the [^:]+:)/g,
        (_: string, prefix: string, categoryName: string) => {
          const cleanCategoryName = categoryName.replace(/^For the\s+/i, '');
          return `${prefix}### ${cleanCategoryName}`;
        }
      );
      setProcessedContent(processedContent);
    } else if (typeof recipe === 'string') {
      // If recipe is a string, it's the content itself
      const processedContent = recipe.replace(
        /(## Ingredients\n+)(For the [^:]+:)/g,
        (_: string, prefix: string, categoryName: string) => {
          const cleanCategoryName = categoryName.replace(/^For the\s+/i, '');
          return `${prefix}### ${cleanCategoryName}`;
        }
      );
      setProcessedContent(processedContent);
    }
  }, [recipe]);
  
  // Add a client-side DOM fix for the ingredient headings
  useEffect(() => {
    // This code will run after the component mounts and the recipe is rendered
    if (typeof window !== 'undefined' && recipe) {
      // Use a short delay to ensure the DOM is fully rendered
      setTimeout(() => {
        // Look specifically for "For the Meat Sauce:" text
        const exactMeatSauceHeaders = document.querySelectorAll('h2');
        
        exactMeatSauceHeaders.forEach(header => {
          const text = header.textContent || '';
          
          // If this contains "For the Meat Sauce:" exactly
          if (text.includes('For the Meat Sauce:')) {
            console.log('Found Meat Sauce header:', header);
            
            // Create a new h3 element with the desired styling
            const newHeader = document.createElement('h3');
            newHeader.className = 'text-base font-medium text-teal-400 tracking-wider uppercase mb-2 border-b border-teal-900/30 pb-1';
            newHeader.textContent = 'Meat Sauce:';
            
            // Replace the original header with our new one
            if (header.parentNode) {
              header.parentNode.replaceChild(newHeader, header);
            }
          }
          // Also match any "For the X:" pattern
          else if (text.match(/^For the [^:]+:$/i)) {
            console.log('Found general category header:', header);
            
            // Get the category name without "For the" prefix
            const categoryName = text.replace(/^For the\s+/i, '');
            
            // Create a new h3 element with the desired styling
            const newHeader = document.createElement('h3');
            newHeader.className = 'text-base font-medium text-teal-400 tracking-wider uppercase mb-2 border-b border-teal-900/30 pb-1';
            newHeader.textContent = categoryName;
            
            // Replace the original header with our new one
            if (header.parentNode) {
              header.parentNode.replaceChild(newHeader, header);
            }
          }
        });
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [recipe]); // Re-run this effect when the recipe changes
  
  // Use processedContent instead of recipe for rendering if it's been set
  const contentToRender = processedContent || (typeof recipe === 'string' ? recipe : (recipe?.markdown || ''));
  
  // Add this effect to check if the recipe is already saved
  useEffect(() => {
    async function checkSavedStatus() {
      if (!user) return;
      
      try {
        let title = 'Untitled Recipe';
        
        if (typeof recipe === 'string') {
          // Extract title from markdown
          const titleMatch = recipe.match(/# (.+)$/m);
          title = titleMatch ? titleMatch[1] : 'Untitled Recipe';
        } else if (recipe && typeof recipe === 'object') {
          // Use title from object or extract from markdown/content
          title = recipe.title || 'Untitled Recipe';
        }
        
        const isSaved = await checkIfRecipeSaved(user.uid, title);
        setIsAlreadySaved(isSaved);
      } catch (error) {
        console.error('Error checking if recipe is saved:', error);
      }
    }
    
    checkSavedStatus();
  }, [user, recipe]);
  
  // If we have markdown content, render it
  if (typeof recipe === 'string') {
    // Extract metadata from markdown if possible
    const prepTimeMatch = contentToRender.match(/Prep Time:\s*(.+?)(?:\n|$)/i);
    const cookTimeMatch = contentToRender.match(/Cook Time:\s*(.+?)(?:\n|$)/i);
    const totalTimeMatch = contentToRender.match(/Total Time:\s*(.+?)(?:\n|$)/i);
    const servingsMatch = contentToRender.match(/Servings:\s*(.+?)(?:\n|$)/i);
    
    // Format markdown for display
    const formattedMarkdown = formatMarkdown(contentToRender);
    
    const handleSaveRecipe = async () => {
      if (!user) {
        // Show login prompt instead of saving
        setShowLoginPrompt(true);
        return;
      }
      
      if (isAlreadySaved) {
        return; // Already saved, do nothing
      }
      
      try {
        setIsSaving(true);
        
        // Prepare the recipe data - use the original recipe, not the processed content
        const recipeData: Record<string, unknown> = { 
            content: recipe, // Keep the original recipe content for storage
            title: typeof recipe === 'string' 
              ? (recipe.match(/# (.+?)(\n|$)/)?.[1] || 'Untitled Recipe')
              : ((recipe as any).title || 'Untitled Recipe'),
            type: 'markdown'
        };
        
        // Add the image if present
        if (recipeImage) {
          recipeData.imageUrl = recipeImage;
        }
        
        await saveRecipe(user.uid, recipeData);
        setIsAlreadySaved(true);
        setSaveSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Error saving recipe:', error);
      } finally {
        setIsSaving(false);
      }
    };
    
    // Extract title from the markdown
    const titleMatch = recipe.match(/# (.+?)(\n|$)/);
    const title = titleMatch ? titleMatch[1] : 'Recipe';
    
    // Get ingredients and organize them
    const allIngredients = extractIngredients();
    const ingredientsBySection = organizeBySection(allIngredients);
    
    return (
      <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
        {recipeImage && (
          <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
            <Image
              src={recipeImage}
              alt="Recipe"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              className="object-cover"
            />
          </div>
        )}
        
        {/* Action Buttons at the top */}
        <div className="p-4 bg-gray-700 flex justify-center gap-4">
          <button
            onClick={handleSaveRecipe}
            disabled={isSaving || isAlreadySaved}
            className={`flex items-center gap-2 ${
              isAlreadySaved 
                ? 'bg-green-600 hover:bg-green-600' 
                : 'bg-blue-600 hover:bg-blue-500'
            } text-white px-4 py-2 rounded-lg transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaving ? 'Saving...' : isAlreadySaved ? 'Saved' : 'Save Recipe'}
          </button>
          
          <button
            onClick={() => setShowShoppingList(true)}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Grocery List
          </button>
        </div>
        
        {/* Recipe Content */}
        <div className="mt-6 recipe-content" dangerouslySetInnerHTML={{ __html: formattedMarkdown }} />
        
        {url && (
  <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col items-center">        {/* End message */}

     <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-2"
    >
      View Original Recipe
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  </div>
)}
        
        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl w-full max-w-xl max-h-[95vh] overflow-auto">
              <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-2xl font-bold">Grocery List</h3>
                <button 
                  onClick={() => setShowShoppingList(false)}
                  className="text-gray-400 hover:text-white p-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Tabs - Made larger for better mobile usability */}
              <div className="flex border-b border-gray-700">
                <button
                  className={`flex-1 py-4 text-center text-xl font-medium ${
                    groceryListMode === 'all' 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setGroceryListMode('all')}
                >
                  All Items
                </button>
                <button
                  className={`flex-1 py-4 text-center text-xl font-medium ${
                    groceryListMode === 'sections' 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setGroceryListMode('sections')}
                >
                  By Section
                </button>
              </div>
              
              <div className="p-5">
                {groceryListMode === 'all' ? (
                  <ul className="space-y-4">
                    {allIngredients.map((ingredient: string, index: number) => (
                      <li key={index} className="flex items-start gap-4">
                        <input 
                          type="checkbox" 
                          id={`ingredient-${index}`}
                          className="mt-1 h-6 w-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          checked={checkedIngredients.has(ingredient)}
                          onChange={(e) => handleIngredientCheck(ingredient, e.target.checked)}
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
                    {Object.entries(ingredientsBySection).map(([section, items]) => (
                      <div key={section}>
                        <h4 className="text-xl font-medium text-blue-400 mb-3">{section}</h4>
                        <ul className="space-y-4 pl-2">
                          {items.map((ingredient, index) => (
                            <li key={index} className="flex items-start gap-4">
                              <input 
                                type="checkbox" 
                                id={`section-${section}-ingredient-${index}`}
                                className="mt-1 h-6 w-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                checked={checkedIngredients.has(ingredient)}
                                onChange={(e) => handleIngredientCheck(ingredient, e.target.checked)}
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
        )}
        
        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <LoginPrompt 
            onClose={() => setShowLoginPrompt(false)} 
            onSignIn={() => {
              setShowLoginPrompt(false);
              handleSaveRecipe();
            }} 
          />
        )}
      </div>
    );
  }
  
  // If we have a structured recipe object, render it
  return (
    <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
      {recipeImage && (
        <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
          <Image
            src={recipeImage}
            alt="Recipe"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            className="object-cover"
          />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="p-4 bg-gray-700 flex justify-center gap-4">
        <button
          onClick={async () => {
            if (!user) {
              setShowLoginPrompt(true);
              return;
            }
            
            if (isAlreadySaved) {
              return; // Already saved, do nothing
            }
            
            try {
              setIsSaving(true);
              
              // Prepare the recipe data
              const recipeData: Record<string, unknown> = { 
                ...recipe as Record<string, unknown>,
                type: 'structured'
              };
              
              // Add the image if present
              if (recipeImage) {
                recipeData.imageUrl = recipeImage;
              }
              
              await saveRecipe(user.uid, recipeData);
              setIsAlreadySaved(true);
              setSaveSuccess(true);
              
              // Reset success message after 3 seconds
              setTimeout(() => setSaveSuccess(false), 3000);
            } catch (error) {
              console.error('Error saving recipe:', error);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving || isAlreadySaved}
          className={`flex items-center gap-2 ${
            isAlreadySaved 
              ? 'bg-green-600 hover:bg-green-600' 
              : 'bg-blue-600 hover:bg-blue-500'
          } text-white px-4 py-2 rounded-lg transition-colors`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {isSaving ? 'Saving...' : isAlreadySaved ? 'Saved' : 'Save Recipe'}
        </button>
        
        <button
          onClick={() => setShowShoppingList(true)}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Grocery List
        </button>
      </div>
      
      <div className="mt-6 prose prose-invert max-w-none">
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-6 text-center">{recipe.title}</h1>
        
        {/* Ingredients */}
        <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Ingredients</h2>
        {recipe.ingredientCategories ? (
          <div className="mb-10">
            {Object.entries(recipe.ingredientCategories as Record<string, string[]>).map(([category, ingredients], index) => (
              <div key={index} className="mb-10">
                <h3 className="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">{category.replace(/^For the\s+/i, '')}</h3>
                <ul className="space-y-3 pl-2 mt-4">
                  {ingredients.map((ingredient: string, idx: number) => (
                    <li key={idx} className="py-1 mb-1">{ingredient}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          // Render flat ingredient list
          <ul className="space-y-3 mb-8">
            {recipe.ingredients.map((ingredient: string, index: number) => (
              <li key={index} className="py-1 mb-1">{ingredient}</li>
            ))}
          </ul>
        )}
        
        {/* Divider between sections */}
        <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
        
        {/* Instructions */}
        <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-6 mb-8">
          {recipe.instructions.map((instruction: string, index: number) => (
            <li key={index} className="pl-2 pb-3">{instruction}</li>
          ))}
        </ol>
        
        {/* Divider before Notes section */}
        <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
        
        {/* Notes */}
        {recipe.notes && (
          <>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Notes</h2>
            <div className="text-gray-300 mb-3">
              {Array.isArray(recipe.notes) ? (
                <ul className="space-y-3">
                  {recipe.notes.map((note: string, index: number) => (
                    <li key={index} className="py-1 mb-1">{note}</li>
                  ))}
                </ul>
              ) : (
                <p>{recipe.notes}</p>
              )}
            </div>
          </>
        )}
        
        {/* Optional Sections - only show if they exist */}
        {recipe.cookingInfo && (
          <>
            <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Cooking Time and Servings</h2>
            <ul className="space-y-3 mb-8">
              {recipe.cookingInfo.map((item: string, index: number) => (
                <li key={index} className="py-1 mb-1">{item}</li>
              ))}
            </ul>
          </>
        )}
        
        {recipe.nutrition && (
          <>
            <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Nutritional Information</h2>
            <ul className="space-y-3 mb-8">
              {recipe.nutrition.map((item: string, index: number) => (
                <li key={index} className="py-1 mb-1">{item}</li>
              ))}
            </ul>
          </>
        )}
        
        {recipe.storage && (
          <>
            <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Storage Instructions</h2>
            <ul className="space-y-3 mb-8">
              {recipe.storage.map((item: string, index: number) => (
                <li key={index} className="py-1 mb-1">{item}</li>
              ))}
            </ul>
          </>
        )}
        
        {recipe.reheating && (
          <>
            <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Reheating Instructions</h2>
            <ul className="space-y-3 mb-8">
              {recipe.reheating.map((item: string, index: number) => (
                <li key={index} className="py-1 mb-1">{item}</li>
              ))}
            </ul>
          </>
        )}
        
        {recipe.makeAhead && (
          <>
            <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Make Ahead Tips</h2>
            <ul className="space-y-3 mb-8">
              {recipe.makeAhead.map((item: string, index: number) => (
                <li key={index} className="py-1 mb-1">{item}</li>
              ))}
            </ul>
          </>
        )}
        
        {recipe.dietaryInfo && (
          <>
            <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
            <h2 className="text-2xl font-bold text-blue-400 mb-5 text-center">Dietary Information</h2>
            <ul className="space-y-3 mb-8">
              {recipe.dietaryInfo.map((item: string, index: number) => (
                <li key={index} className="py-1 mb-1">{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      
      {url && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View Original Recipe
          </a>
        </div>
      )}
      
      {/* Shopping List Modal */}
      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl w-full max-w-xl max-h-[95vh] overflow-auto">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-2xl font-bold">Grocery List</h3>
              <button 
                onClick={() => setShowShoppingList(false)}
                className="text-gray-400 hover:text-white p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Tabs - Made larger for better mobile usability */}
            <div className="flex border-b border-gray-700">
              <button
                className={`flex-1 py-4 text-center text-xl font-medium ${
                  groceryListMode === 'all' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setGroceryListMode('all')}
              >
                All Items
              </button>
              <button
                className={`flex-1 py-4 text-center text-xl font-medium ${
                  groceryListMode === 'sections' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setGroceryListMode('sections')}
              >
                By Section
              </button>
            </div>
            
            <div className="p-5">
              {groceryListMode === 'all' ? (
                <ul className="space-y-4">
                  {extractIngredients().map((ingredient: string, index: number) => (
                    <li key={index} className="flex items-start gap-4">
                      <input 
                        type="checkbox" 
                        id={`ingredient-${index}`}
                        className="mt-1 h-6 w-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        checked={checkedIngredients.has(ingredient)}
                        onChange={(e) => handleIngredientCheck(ingredient, e.target.checked)}
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
                  {Object.entries(organizeBySection(extractIngredients())).map(([section, items]: [string, string[]], idx: number) => (
                    <div key={`${section}-${idx}`}>
                      <h4 className="text-xl font-medium text-blue-400 mb-3">{section}</h4>
                      <ul className="space-y-4 pl-2">
                        {items.map((ingredient: string, index: number) => (
                          <li key={index} className="flex items-start gap-4">
                            <input 
                              type="checkbox" 
                              id={`section-${section}-ingredient-${index}`}
                              className="mt-1 h-6 w-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                              checked={checkedIngredients.has(ingredient)}
                              onChange={(e) => handleIngredientCheck(ingredient, e.target.checked)}
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
      )}
    </div>
  );
}

// Update the formatMarkdown function to add a line under the last ingredient

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
  
  // Pre-process the content to mark ingredient categories
  let processedText = cleanedText;
  
  // First, look for patterns like "For the Meat Sauce:" and convert them to a standardized format
  processedText = processedText.replace(
    /^(For the [^:\n]+:|[A-Z][A-Z\s]+:|[A-Za-z\s]+ Filling:|[A-Za-z\s]+ Sauce:|[A-Za-z\s]+ Mixture:)$/gm,
    '### $1'
  );
  
  // Now split the text into sections based on headers
  const sections = processedText.split(/^#+ /m);
  
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
    const headerMatch = processedText.match(new RegExp(`^(#+) ${title}`, 'm'));
    const headerLevel = headerMatch ? headerMatch[1].length : 1;
    
    // Add section header with more spacing and border for Notes section and other main sections
    const isNotesSection = title === 'Notes';
    const isIngredientsSection = title.toLowerCase().includes('ingredient');
    const isInstructionsSection = title.toLowerCase().includes('instruction');
    
    // Add divider for all main sections except the first one (title) 
    const needsDivider = headerLevel === 2 && index > 1;
    
    html += `<div class="recipe-section mb-14 ${needsDivider ? 'border-t border-gray-700 pt-8 mt-8' : ''}">`;
      
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
      
      // Check for ### subsection headers in ingredients section (categories)
      if (isIngredientsSection && content.includes('### ')) {
        // Split by category headers
        const categories = content.split(/(?=### )/);
        
        // Process each category
        categories.forEach((category, catIdx) => {
          const trimmedCategory = category.trim();
          if (!trimmedCategory) return;
          
          // Check if this is a category header
          const categoryMatch = trimmedCategory.match(/### (.*?):\s*([\s\S]*)/);
          
          if (categoryMatch) {
            // This is a category
            const categoryName = categoryMatch[1].trim();
            const categoryContent = categoryMatch[2].trim();
            
            // Add category header with distinctive styling
            html += `
              <li class="mt-10 mb-6">
                <h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">${categoryName.replace(/^For the\s+/i, '')}:</h3>
                <ul class="space-y-3 pl-2 mt-4">
            `;
            
            // Add individual ingredients in this category WITHOUT borders
            const categoryItems = categoryContent.split('\n');
            categoryItems.forEach(item => {
              const trimmedItem = item.trim();
              if (trimmedItem.startsWith('- ')) {
                const ingredient = trimmedItem.substring(2).trim();
                html += `<li class="py-1 mb-1">${ingredient}</li>`;
              }
            });
            
            html += `</ul></li>`;
          } else {
            // These are regular ingredients
            const itemLines = trimmedCategory.split('\n');
            itemLines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('- ')) {
                const ingredient = trimmedLine.substring(2).trim();
                html += `<li class="py-1 mb-1">${ingredient}</li>`;
              }
            });
          }
        });
      } else {
        // This is a regular ingredient list with no categories
        const listItems = content.split(/^- /m).filter(Boolean);
        
        listItems.forEach((item, idx) => {
          const trimmedItem = item.trim();
          
          if (trimmedItem.endsWith(':')) {
            // This is a subheading
            html += `<li class="mt-10 mb-6"><h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">${trimmedItem.replace(/^For the\s+/i, '')}</h3></li>`;
          } else {
            // This is a regular ingredient
            html += `<li class="py-1 mb-1">${trimmedItem}</li>`;
          }
        });
      }
      
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
  
  // Apply final fixes to the rendered HTML
  return postProcessHtml(html);
}

const postProcessHtml = (html: string): string => {
  // First target the full-width "Ingredients" blue header pattern we see in the screenshot
  let processedHtml = html;
  
  // ULTRA-specific replacement targeting the exact pattern seen in the screenshot
  processedHtml = processedHtml.replace(
    /<h2 class="[^"]*">For the Meat Sauce:<\/h2>/gi,
    `<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">Meat Sauce:</h3>`
  );
  
  // Target the EXACT pattern from the screenshot with the specific class combination
  processedHtml = processedHtml.replace(
    /<h2 class="text-2xl font-bold text-blue-400 mb-5 text-center">For the ([^<:]+):<\/h2>/g,
    (_: string, categoryName: string) => 
      `<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">${categoryName}:</h3>`
  );
  
  // Replace the "For the X Sauce:" pattern with proper teal styling - targeting the specific class pattern from screenshot
  processedHtml = processedHtml.replace(
    /<h2 class="[^"]*text-blue-\d+[^"]*">(For the\s+[^<:]+):<\/h2>/gi,
    (_: string, categoryName: string) => 
      `<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">${categoryName.replace(/^For the\s+/i, '')}:</h3>`
  );
  
  // Also catch any other patterns - like the one we had in our original regex
  processedHtml = processedHtml.replace(
    /<h2 class="text-lg font-semibold text-blue-600 mt-4">(For the [^:]+:)<\/h2>/g,
    (_: string, categoryName: string) => 
      `<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">${categoryName.replace(/^For the\s+/i, '')}:</h3>`
  );
  
  // Generic catch-all for any blue heading with a colon pattern
  processedHtml = processedHtml.replace(
    /<h2 class="[^"]*text-blue-\d+[^"]*">([^<:]+:)<\/h2>/g,
    (_: string, categoryName: string) => 
      `<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">${categoryName}</h3>`
  );
  
  // Also remove border-bottom and pb-1 from any existing h3 headings that might have them
  processedHtml = processedHtml.replace(
    /<h3 class="[^"]*border-b[^"]*pb-1[^"]*">/g,
    '<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">'
  );
  
  // Remove border-bottom from individual ingredient items
  return processedHtml.replace(/<li class="border-b[^"]*">/g, '<li class="">');
};

// Move the LoginPrompt component outside of the main component
// and update it to accept props
const LoginPrompt = ({ 
  onClose, 
  onSignIn 
}: { 
  onClose: () => void, 
  onSignIn: () => void 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
    <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 relative">
      <button 
        onClick={onClose}
        type="button"
        className="absolute top-3 right-3 text-gray-400 hover:text-white active:text-gray-200 touch-manipulation"
        aria-label="Close login prompt"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              onClose();
              // Try to save again after successful login
              onSignIn();
            }
          } catch (error) {
            // Error is already logged in the signInWithGoogle function
          }
        }}
        type="button"
        className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-3 px-4 rounded flex items-center justify-center touch-manipulation"
      >
        <svg className="w-5 h-5 mr-2 pointer-events-none" viewBox="0 0 24 24">
          <path fill="#ffffff" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
        </svg>
        <span className="pointer-events-none">Sign in with Google</span>
      </button>
    </div>
  </div>
); 