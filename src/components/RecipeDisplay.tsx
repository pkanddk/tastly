import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveRecipe, signInWithGoogle, checkIfRecipeSaved } from '@/lib/firebase/firebaseUtils';
import { END_MESSAGES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import GroceryList from './GroceryList';

export default function RecipeDisplay({ recipe, recipeImage, url }: { recipe: string, recipeImage: string, url?: string }) {
  // Add state for showing/hiding the shopping list
  const [showShoppingList, setShowShoppingList] = useState(false);
  
  // Add state for recipe saving
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Add state for the end message
  const [endMessage, setEndMessage] = useState('');
  
  // Add state for grocery list view mode
  const [groceryListMode, setGroceryListMode] = useState<'all' | 'sections'>('all');
  
  // Add state for checked ingredients - this will sync between views
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  
  const router = useRouter();
  
  // Add this state variable with the other state declarations
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  
  // Add this state at the top of the component
  const [isSaved, setIsSaved] = useState(false);
  
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
  
  // Select a random message when the component mounts or recipe changes
  useEffect(() => {
    if (recipe) {
      const randomIndex = Math.floor(Math.random() * END_MESSAGES.length);
      setEndMessage(END_MESSAGES[randomIndex]);
    }
  }, [recipe]);
  
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
  
  // Organize ingredients by store section
  const organizeBySection = (ingredients: string[]) => {
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
  
  // Don't try to parse as JSON - handle as markdown or object
  const parsedRecipe = typeof recipe === 'object' ? recipe : { 
    title: 'Recipe',
    markdown: recipe 
  };
  
  // Add this effect to check if the recipe is already saved
  useEffect(() => {
    async function checkSavedStatus() {
      if (user && typeof recipe === 'string') {
        try {
          // Extract title from markdown
          const titleMatch = recipe.match(/# (.+)$/m);
          const title = titleMatch ? titleMatch[1] : 'Untitled Recipe';
          
          const isSaved = await checkIfRecipeSaved(user.uid, title);
          setIsAlreadySaved(isSaved);
        } catch (error) {
          console.error('Error checking if recipe is saved:', error);
        }
      }
    }
    
    checkSavedStatus();
  }, [user, recipe]);
  
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
        setIsSaved(true);
        
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
      <div className="custom-recipe-container bg-gray-900 rounded-xl shadow-lg mb-8">
        <div className="recipe-image-container rounded-t-xl overflow-hidden relative h-64 w-full">
          <Image 
            src={recipeImage}
            alt="Recipe image"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
        
        {/* Action Buttons - NEW SECTION */}
        <div className="p-4 bg-gray-700 flex justify-center gap-4">
          <button
            onClick={handleSaveRecipe}
            disabled={isSaving || isSaved}
            className={`flex items-center gap-2 ${
              isSaved 
                ? 'bg-green-600 hover:bg-green-600' 
                : 'bg-blue-600 hover:bg-blue-500'
            } text-white px-4 py-2 rounded-lg transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save Recipe'}
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
        <div className="p-6">
          <div dangerouslySetInnerHTML={{ __html: formattedMarkdown }} />
          
          {/* End message - Updated with yellow text and better centering */}
          <div className="mt-8 p-5 bg-gray-700 rounded-lg text-center">
            <p className="text-yellow-300 text-base italic">
              {endMessage}
            </p>
          </div>
        </div>
        
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
                    {allIngredients.map((ingredient, index) => (
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
    <div className="custom-recipe-container bg-gray-900 rounded-xl shadow-lg mb-8">
      <div className="recipe-image-container rounded-t-xl overflow-hidden relative h-64 w-full">
        <Image 
          src={recipeImage}
          alt="Recipe image"
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>
      {/* ... rest of the component ... */}
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
      
      listItems.forEach((item, idx) => {
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
            // Apply borders to all items in ingredients section, including the last one
            const borderClass = isIngredientsSection ? "border-b border-gray-700" : "";
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