import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGroceryList } from '@/lib/contexts/GroceryListContext';
import { useIngredientChecklist } from '@/lib/hooks/useIngredientChecklist';
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
  const { addRecipeToGroceryList } = useGroceryList();
  const [recipeAddedToList, setRecipeAddedToList] = useState(false);
  
  // Add state for recipe saving
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Add state for unit system preference
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('imperial');
   
  // Add state for grocery list view mode
  const [groceryListMode, setGroceryListMode] = useState<'all' | 'sections'>('all');
  
  // Add state for checked ingredients - this will sync between views
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  
  // Add state for processed content to ensure our CSS fixes are applied
  const [processedContent, setProcessedContent] = useState<string>('');
  
  const router = useRouter();
  
  // Add this state variable with the other state declarations
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  
  // Generate a consistent ID for the recipe
  const recipeId = useMemo(() => {
    if (typeof recipe === 'string') {
      // Use title from markdown if available, or just hash of the content
      const title = (recipe as string).match(/# (.+)$/m)?.[1] || '';
      return `recipe-${title.replace(/\s+/g, '-').toLowerCase() || Math.random().toString(36).substring(2, 9)}`;
    } else {
      // Use title for structured recipes
      return `recipe-${recipe.title.replace(/\s+/g, '-').toLowerCase()}`;
    }
  }, [recipe]);
  
  // Use our ingredient checklist hook
  const { toggleIngredient, isIngredientChecked, resetChecklist } = useIngredientChecklist(recipeId);
  
  // Load checked ingredients from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedItems = localStorage.getItem(recipeId);
        if (savedItems) {
          setCheckedIngredients(new Set(JSON.parse(savedItems)));
        }
      } catch (error) {
        console.error('Error loading saved grocery list:', error);
      }
    }
  }, [recipeId]);
  
  // Save checked ingredients to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && checkedIngredients.size > 0) {
      try {
        localStorage.setItem(
          recipeId, 
          JSON.stringify(Array.from(checkedIngredients))
        );
      } catch (error) {
        console.error('Error saving grocery list:', error);
      }
    }
  }, [checkedIngredients, recipeId]);
  
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
  
  // Add this useEffect to listen for changes to localStorage
  useEffect(() => {
    // Function to check if recipe is in grocery list
    const checkIfRecipeInList = () => {
      try {
        const storedRecipes = localStorage.getItem('recipes');
        if (storedRecipes) {
          const recipes = JSON.parse(storedRecipes);
          const recipeName = typeof recipe === 'string' 
            ? ((recipe as string).match(/# (.+)$/m)?.[1] || 'Recipe')
            : (recipe as any).title || 'Recipe';
          
          // Update state based on whether the recipe exists in list
          const recipeExists = recipes.some((r: any) => r.name === recipeName);
          setRecipeAddedToList(recipeExists);
        } else {
          // If no recipes in storage, button should not be green
          setRecipeAddedToList(false);
        }
      } catch (error) {
        console.error('Error checking grocery list:', error);
        setRecipeAddedToList(false);
      }
    };

    // Check initially
    checkIfRecipeInList();
    
    // Set up event listener for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recipes' || e.key?.startsWith('temp-grocery-update-')) {
        checkIfRecipeInList();
      }
    };
    
    // Set up event listener for our custom event
    const handleGroceryListUpdate = () => {
      checkIfRecipeInList();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('groceryListUpdated', handleGroceryListUpdate);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('groceryListUpdated', handleGroceryListUpdate);
    };
  }, [recipe]);
  
  // Function to open grocery list with the current recipe's ingredients
  const handleOpenGroceryList = () => {
    const ingredients = extractIngredients();
    const recipeName = typeof recipe === 'string' 
      ? ((recipe as string).match(/# (.+)$/m)?.[1] || 'Recipe')
      : (recipe as any).title || 'Recipe';
    
    // Use addRecipeToGroceryList to pass the current recipe ingredients
    addRecipeToGroceryList(ingredients, recipeName);
    setRecipeAddedToList(true);
  };
  
  // Add effect to re-render content when unit system changes
  useEffect(() => {
    // Force re-render of recipe content when unit system changes
    if (recipe) {
      // For string content (markdown), we need to reprocess the content
      if (typeof recipe === 'string') {
        const processed = recipe.replace(
          /(## Ingredients\n+)(For the [^:]+:)/g,
          (_: string, prefix: string, categoryName: string) => {
            const cleanCategoryName = categoryName.replace(/^For the\s+/i, '');
            return `${prefix}### ${cleanCategoryName}`;
          }
        );
        // Force a re-render by adding a non-visible character that changes
        setProcessedContent(processed + (unitSystem === 'imperial' ? ' ' : ''));
      } else if (typeof recipe === 'object') {
        // For structured recipes, the conversions are applied directly in the render
        // Force a refresh by toggling a non-visible character in processedContent
        setProcessedContent(unitSystem === 'imperial' ? ' ' : '');
      }
    }
  }, [unitSystem, recipe]);
  
  // Unit conversion utility functions
  const convertToImperial = (ingredient: string): string => {
    // Special case for items like "1 lime, juiced" - don't convert these
    if (/\b(?:lime|lemon|orange|grapefruit),\s*(?:juiced|zested|sliced)/i.test(ingredient)) {
      return ingredient;
    }

    return ingredient
      // Convert grams to ounces
      .replace(/(\d+(?:\.\d+)?)\s*g(?!\w|\s*r)/g, (_, num) => `${(parseFloat(num) * 0.035274).toFixed(1)} oz`)
      // Convert kilograms to pounds
      .replace(/(\d+(?:\.\d+)?)\s*kg/g, (_, num) => `${(parseFloat(num) * 2.20462).toFixed(1)} lb`)
      // Convert milliliters to fluid ounces
      .replace(/(\d+(?:\.\d+)?)\s*ml/g, (_, num) => `${(parseFloat(num) * 0.033814).toFixed(1)} fl oz`)
      // Convert liters to cups
      .replace(/(\d+(?:\.\d+)?)\s*l(?!\w)/g, (_, num) => `${(parseFloat(num) * 4.22675).toFixed(1)} cups`)
      // Convert centimeters to inches
      .replace(/(\d+(?:\.\d+)?)\s*cm/g, (_, num) => `${(parseFloat(num) * 0.393701).toFixed(1)} in`)
      // Convert Celsius to Fahrenheit
      .replace(/(\d+(?:\.\d+)?)\s*°C/g, (_, num) => {
        // Round to nearest 5
        const fahrenheit = Math.round(parseFloat(num) * 9/5 + 32);
        const roundedFahrenheit = Math.round(fahrenheit / 5) * 5;
        return `${roundedFahrenheit}°F`;
      })
      .replace(/(\d+(?:\.\d+)?)\s*degrees C/gi, (_, num) => {
        // Round to nearest 5
        const fahrenheit = Math.round(parseFloat(num) * 9/5 + 32);
        const roundedFahrenheit = Math.round(fahrenheit / 5) * 5;
        return `${roundedFahrenheit} degrees F`;
      })
      // British measurements
      .replace(/(\d+(?:\.\d+)?)\s*stone/g, (_, num) => `${(parseFloat(num) * 14).toFixed(1)} lb`)
      .replace(/(\d+(?:\.\d+)?)\s*grammes/g, (_, num) => `${(parseFloat(num) * 0.035274).toFixed(1)} oz`);
  };

  const convertToMetric = (ingredient: string): string => {
    // Special case for items like "1 lime, juiced" - don't convert these
    if (/\b(?:lime|lemon|orange|grapefruit),\s*(?:juiced|zested|sliced)/i.test(ingredient)) {
      return ingredient;
    }

    return ingredient
      // Convert ounces to grams
      .replace(/(\d+(?:\.\d+)?)\s*oz(?!\w)/g, (_, num) => `${(parseFloat(num) * 28.3495).toFixed(0)} g`)
      // Convert pounds to kilograms
      .replace(/(\d+(?:\.\d+)?)\s*lb/g, (_, num) => `${(parseFloat(num) * 0.453592).toFixed(1)} kg`)
      .replace(/(\d+(?:\.\d+)?)\s*pound/g, (_, num) => `${(parseFloat(num) * 0.453592).toFixed(1)} kg`)
      // Convert fluid ounces to milliliters
      .replace(/(\d+(?:\.\d+)?)\s*fl\s*oz/g, (_, num) => `${(parseFloat(num) * 29.5735).toFixed(0)} ml`)
      // Convert cups to milliliters
      .replace(/(\d+(?:\.\d+)?)\s*cups?/g, (_, num) => `${(parseFloat(num) * 236.588).toFixed(0)} ml`)
      // Convert teaspoons to milliliters (approximate)
      .replace(/(\d+(?:\.\d+)?)\s*tsp/g, (_, num) => `${(parseFloat(num) * 5).toFixed(0)} ml`)
      // Convert tablespoons to milliliters (approximate)
      .replace(/(\d+(?:\.\d+)?)\s*tbsp/g, (_, num) => `${(parseFloat(num) * 15).toFixed(0)} ml`)
      // Convert inches to centimeters
      .replace(/(\d+(?:\.\d+)?)\s*in(?:ch)?(?:es)?/g, (_, num) => `${(parseFloat(num) * 2.54).toFixed(1)} cm`)
      // Convert Fahrenheit to Celsius
      .replace(/(\d+(?:\.\d+)?)\s*°F/g, (_, num) => `${((parseFloat(num) - 32) * 5/9).toFixed(0)}°C`)
      .replace(/(\d+(?:\.\d+)?)\s*degrees F/gi, (_, num) => `${((parseFloat(num) - 32) * 5/9).toFixed(0)} degrees C`)
      // Convert pints to milliliters (British pint = 568ml)
      .replace(/(\d+(?:\.\d+)?)\s*pints?/g, (_, num) => `${(parseFloat(num) * 568).toFixed(0)} ml`);
  };

  const convertUnits = (ingredient: string): string => {
    return unitSystem === 'imperial' ? 
      convertToImperial(ingredient) : 
      convertToMetric(ingredient);
  };

  // Function to share recipe
  const handleShareRecipe = async () => {
    const title = typeof recipe === 'string' 
      ? (recipe.match(/# (.+?)(\n|$)/)?.[1] || 'Recipe')
      : recipe.title;
      
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Check out this ${title} recipe!`,
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing recipe:', err);
        navigator.clipboard.writeText(window.location.href);
        alert('Recipe link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Recipe link copied to clipboard!');
    }
  };
  
  const handleSaveRecipe = async () => {
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
  };
  
  // If we have markdown content, render it
  if (typeof recipe === 'string') {
    // Extract metadata from markdown if possible
    const prepTimeMatch = contentToRender.match(/Prep Time:\s*(.+?)(?:\n|$)/i);
    const cookTimeMatch = contentToRender.match(/Cook Time:\s*(.+?)(?:\n|$)/i);
    const totalTimeMatch = contentToRender.match(/Total Time:\s*(.+?)(?:\n|$)/i);
    const servingsMatch = contentToRender.match(/Servings:\s*(.+?)(?:\n|$)/i);
    
    // Format markdown for display
    const formatMarkdown = (markdown: string) => {
      // Extract the title first
      const titleMatch = markdown.match(/^# (.*$)/m);
      let title = titleMatch ? titleMatch[1] : 'Recipe';
      
      // Start with the title
      let formattedContent = `<h1 class="text-3xl font-bold text-white mb-6 text-center">${title}</h1>`;
      
      // Add cooking time and servings directly under the title
      if (prepTimeMatch || cookTimeMatch || totalTimeMatch || servingsMatch) {
        formattedContent += '<div class="mb-8"><ul class="space-y-3 mb-4">';
        
        if (prepTimeMatch) {
          formattedContent += `<li class="py-1 mb-1 text-center">Prep Time: ${prepTimeMatch[1]}</li>`;
        }
        
        if (cookTimeMatch) {
          formattedContent += `<li class="py-1 mb-1 text-center">Cook Time: ${cookTimeMatch[1]}</li>`;
        }
        
        if (totalTimeMatch) {
          formattedContent += `<li class="py-1 mb-1 text-center">Total Time: ${totalTimeMatch[1]}</li>`;
        }
        
        if (servingsMatch) {
          formattedContent += `<li class="py-1 mb-1 text-center">Servings: ${servingsMatch[1]}</li>`;
        }
        
        formattedContent += '</ul><div class="border-t border-gray-700 mt-6"></div></div>';
      }
      
      // Remove the title from the markdown to avoid duplicating it
      let contentWithoutTitle = markdown.replace(/^# .*$\n*/m, '');

      // Split the content by section headers
      const sections = contentWithoutTitle.split(/^## /m);
      
      // Organize sections by type
      let mainSections = [];
      let storageSection = null;
      let reheatingSection = null;
      
      // Process each section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.trim()) continue;
        
        // Get the section title and content
        const sectionParts = section.split(/\n/, 2);
        const sectionTitle = sectionParts[0].trim();
        let sectionContent = sectionParts.length > 1 ? section.substring(sectionParts[0].length + 1) : '';
        
        // Check if it's a storage or reheating section
        const titleLower = sectionTitle.toLowerCase();
        if (titleLower.includes('storage') || titleLower.includes('storing') || titleLower.includes('store')) {
          storageSection = { title: sectionTitle, content: sectionContent };
          continue;
        } else if (titleLower.includes('reheat') || titleLower.includes('reheating')) {
          reheatingSection = { title: sectionTitle, content: sectionContent };
          continue;
        }
        
        // Add to main sections
        mainSections.push({ title: sectionTitle, content: sectionContent });
      }
      
      // Render main sections
      for (let i = 0; i < mainSections.length; i++) {
        const { title, content } = mainSections[i];
        
        // Add section header
        let headerClass = "text-2xl font-bold text-blue-400 mb-4 text-center";
        if (i === 0 && title.toLowerCase() === 'ingredients') {
          headerClass = "text-2xl font-bold text-blue-400 mb-4 text-center -mt-4";
        }
        formattedContent += `<h2 class="${headerClass}">${title}</h2>`;
        
        // Special handling for Ingredients section
        if (title.toLowerCase() === 'ingredients') {
          // Add checkbox helper text
          formattedContent += `<p class="text-sm text-gray-400 italic text-center mb-4">Check off ingredients as you go. Your progress will be saved.</p>`;
          formattedContent += processIngredientsSection(content, recipeId, isIngredientChecked);
        } 
        // Special handling for Instructions section
        else if (title.toLowerCase() === 'instructions') {
          // Add checkbox helper text for instructions
          formattedContent += `<p class="text-sm text-gray-400 italic text-center mb-4">Check off steps as you complete them.</p>`;
          formattedContent += processInstructionsSection(content);
        } 
        // Handle other sections
        else {
          formattedContent += processGenericSection(content);
        }
      }
      
      // Add storage section if available
      if (storageSection) {
        formattedContent += `<h2 class="text-2xl font-bold text-blue-400 mb-4 text-center">Storage Instructions</h2>`;
        formattedContent += processGenericSection(storageSection.content);
      }
      
      // Add reheating section if available
      if (reheatingSection) {
        formattedContent += `<h2 class="text-2xl font-bold text-blue-400 mb-4 text-center">Reheating Instructions</h2>`;
        formattedContent += processGenericSection(reheatingSection.content);
      }
      
      return formattedContent;
    };
    
    // Helper function to process the ingredients section
    const processIngredientsSection = (content: string, recipeId: string, isIngredientChecked: (ingredient: string) => boolean) => {
      let result = '<div class="mb-8 pl-1">';
      const lines = content.split('\n');
      let currentCategory = '';
      
      // Create a map to store ingredient measurements for use in instructions
      const ingredientMeasurements: Map<string, string> = new Map();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for category headers like "MEAT SAUCE:" or "For the sauce:" or "LASAGNA:"
        const categoryMatch = line.match(/^(?:###\s*)?([A-Z][A-Z\s]+:)|^(?:###\s*)?(For the [^:]+:)|^(?:###\s*)?([A-Z][A-Za-z]+:)/);
        if (categoryMatch) {
          // Get the matched category (whichever group matched)
          currentCategory = categoryMatch[1] || categoryMatch[2] || categoryMatch[3] || '';
          // Clean up the category name
          currentCategory = currentCategory.replace(/^For the\s+/i, '');
          result += `<h3 class="text-base font-medium text-teal-400 tracking-wider uppercase mb-2 mt-6">${currentCategory}</h3>`;
          continue;
        }
        
        // Check for ingredient lines
        if (line.startsWith('- ')) {
          let ingredient = line.substring(2).trim();
          
          // Apply unit conversion if needed
          if (unitSystem === 'imperial') {
            ingredient = convertToImperial(ingredient);
          }
          
          // Store ingredient measurement and name for use in instructions
          // Try to extract measurement and ingredient name
          const measurementMatch = ingredient.match(/^([\d\s\/\.\-]+\s*(?:tsp|tbsp|cup|oz|g|ml|lb|kg|pinch|dash|to taste)s?\.?)\s+(.+)$/i);
          if (measurementMatch) {
            const [_, measurement, ingredientName] = measurementMatch;
            // Store lowercase ingredient name for case-insensitive matching
            ingredientMeasurements.set(ingredientName.toLowerCase(), measurement.trim());
          }
          
          const ingredientId = `${recipeId}-${ingredient.replace(/\s+/g, '-').toLowerCase()}`;
          
          result += `
            <div class="flex items-start gap-4 mb-3 py-1 pl-2" data-ingredient="${ingredient}">
              <input 
                type="checkbox" 
                id="${ingredientId}" 
                class="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 ingredient-checkbox flex-shrink-0"
                ${isIngredientChecked(ingredient) ? 'checked' : ''}
              />
              <label 
                for="${ingredientId}" 
                class="text-lg cursor-pointer ${isIngredientChecked(ingredient) ? 'line-through text-gray-500' : 'text-gray-300'}"
              >
                ${ingredient}
              </label>
            </div>
          `;
        }
      }
      
      // Store the measurement map in window object for access in instructions
      if (typeof window !== 'undefined') {
        (window as any).ingredientMeasurements = ingredientMeasurements;
      }
      
      result += '</div>';
      return result;
    };
    
    // Helper function to process the instructions section
    const processInstructionsSection = (content: string) => {
      let result = '<div class="space-y-6 mb-8">';
      const lines = content.split('\n');
      
      // Get ingredient measurements saved from ingredients section
      const ingredientMeasurements = (typeof window !== 'undefined') 
        ? (window as any).ingredientMeasurements || new Map() 
        : new Map();
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Skip nutritional information within instructions
        if (line.toLowerCase().includes('nutritional information') || 
            line.toLowerCase().includes('nutrition information') ||
            line.toLowerCase().includes('nutrition facts') ||
            line.toLowerCase().includes('per serving')) {
          // Skip this line and the next few lines that likely contain nutrition data
          let skipCount = 0;
          while (i + 1 < lines.length && skipCount < 5) {
            i++;
            skipCount++;
            // Break if we hit a new numbered instruction
            if (lines[i].match(/^\d+\.\s/)) {
              i--;  // Go back one to process this as a normal instruction
              break;
            }
          }
          continue;
        }
        
        // Check for numbered list items
        const instructionMatch = line.match(/^\d+\.\s*(.+)$/);
        if (instructionMatch) {
          let instruction = instructionMatch[1];
          
          // Apply temperature conversion if needed
          if (unitSystem === 'imperial') {
            // Handle combined temperature formats like "200C/180C fan/gas 6"
            instruction = instruction.replace(/(\d+)[Cc]\s*\/\s*(\d+)[Cc]\s*fan\s*\/\s*gas\s*(\d+)/g, (match, temp1, temp2, gas) => {
              const fahrenheit1 = Math.round(parseFloat(temp1) * 9/5 + 32);
              const fahrenheit2 = Math.round(parseFloat(temp2) * 9/5 + 32);
              // Round to nearest 5
              const roundedF1 = Math.round(fahrenheit1 / 5) * 5;
              const roundedF2 = Math.round(fahrenheit2 / 5) * 5;
              return `${roundedF1}°F (${roundedF2}°F fan)`;
            });
            
            // Convert standard temperatures
            instruction = instruction.replace(/(\d+)(\s*)(°C|degrees C|deg C)/gi, (match, temp, space, unit) => {
              const fahrenheit = Math.round(parseFloat(temp) * 9/5 + 32);
              // Round to nearest 5
              const roundedFahrenheit = Math.round(fahrenheit / 5) * 5;
              return `${roundedFahrenheit}°F`;
            });
            
            // Handle special cases like "200°C (180°C fan)"
            instruction = instruction.replace(/(\d+)(\s*)(°C|degrees C|deg C)(\s*)\((\d+)(\s*)(°C|degrees C|deg C)(\s*)fan\)/gi, 
              (match, temp1, space1, unit1, space2, temp2, space3, unit2, space4) => {
                const fahrenheit1 = Math.round(parseFloat(temp1) * 9/5 + 32);
                const fahrenheit2 = Math.round(parseFloat(temp2) * 9/5 + 32);
                // Round to nearest 5
                const roundedF1 = Math.round(fahrenheit1 / 5) * 5;
                const roundedF2 = Math.round(fahrenheit2 / 5) * 5;
                return `${roundedF1}°F (${roundedF2}°F fan)`;
            });
            
            // Convert gas mark references
            instruction = instruction.replace(/gas\s*mark\s*(\d+)/gi, (match, gas) => {
              // Simple conversion from gas mark to Fahrenheit
              const gasToF: Record<string, string> = {
                '1': '275',
                '2': '300',
                '3': '325',
                '4': '350',
                '5': '375',
                '6': '400',
                '7': '425',
                '8': '450',
                '9': '475'
              };
              const gasNum = gas as string;
              return `${gasToF[gasNum] || (parseInt(gasNum) * 25 + 250)}°F`;
            });
            
            // Convert gas number references
            instruction = instruction.replace(/gas\s*(\d+)/gi, (match, gas) => {
              // Simple conversion from gas mark to Fahrenheit
              const gasToF: Record<string, string> = {
                '1': '275',
                '2': '300',
                '3': '325',
                '4': '350',
                '5': '375',
                '6': '400',
                '7': '425',
                '8': '450',
                '9': '475'
              };
              const gasNum = gas as string;
              return `${gasToF[gasNum] || (parseInt(gasNum) * 25 + 250)}°F`;
            });
          } else {
            // Convert temperatures from Fahrenheit to Celsius
            instruction = instruction.replace(/(\d+)(\s*)(°F|degrees F|deg F)/gi, (match, temp, space, unit) => {
              const celsius = Math.round((parseFloat(temp) - 32) * 5/9);
              return `${celsius}°C`;
            });
            
            // Handle special cases like "400°F (375°F fan)"
            instruction = instruction.replace(/(\d+)(\s*)(°F|degrees F|deg F)(\s*)\((\d+)(\s*)(°F|degrees F|deg F)(\s*)fan\)/gi, 
              (match, temp1, space1, unit1, space2, temp2, space3, unit2, space4) => {
                const celsius1 = Math.round((parseFloat(temp1) - 32) * 5/9);
                const celsius2 = Math.round((parseFloat(temp2) - 32) * 5/9);
                return `${celsius1}°C (${celsius2}°C fan)`;
            });
          }
          
          // Add measurements to instruction text if available
          if (ingredientMeasurements && ingredientMeasurements.size > 0) {
            // For each ingredient name in our measurements map
            ingredientMeasurements.forEach((measurement: string, ingredientName: string) => {
              // Skip adding measurements for main ingredients that don't need precise measurements
              const skipMeasurementIngredients = /\b(pork|chicken|beef|lamb|salmon|fish|turkey|tofu|eggplant|cauliflower|steak)\b/i;
              if (skipMeasurementIngredients.test(ingredientName)) {
                return;
              }
              
              // Only add measurements for specific ingredients that need precise measurements
              const needsMeasurement = /\b(salt|pepper|cumin|paprika|garlic powder|onion powder|oregano|basil|thyme|cayenne|sugar|honey|vinegar|oil|butter|flour|cornstarch|baking soda|baking powder|cream|milk|water|broth|stock|sauce|syrup)\b/i;
              
              if (!needsMeasurement.test(ingredientName)) {
                return;
              }
              
              // Convert measurement if needed
              const displayMeasurement = unitSystem === 'imperial' ? 
                convertToImperial(measurement) : measurement;
              
              // Look for the ingredient name in the instruction (case insensitive)
              const regex = new RegExp(
                // Avoid matching if measurement is already there
                `(?<!\\d\\s*(?:tsp|tbsp|cup|oz|g|ml|lb|kg|pinch|dash)s?\\s+)\\b${
                  // Escape special regex characters in ingredient name
                  ingredientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                }\\b`, 
                'gi'
              );
              
              // Replace with measurement + ingredient name
              instruction = instruction.replace(
                regex, 
                `${displayMeasurement} ${ingredientName}`
              );
            });
          }
          
          const instructionId = `${recipeId}-instruction-${i}`;
          
          result += `
            <div class="flex items-start gap-4 pl-2 pb-3 pr-2">
              <input 
                type="checkbox" 
                id="${instructionId}" 
                class="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 instruction-checkbox flex-shrink-0"
                ${isIngredientChecked(`instruction-${i}`) ? 'checked' : ''}
              />
              <label for="${instructionId}" class="flex-grow cursor-pointer">
                ${instruction}
              </label>
            </div>
          `;
        }
      }
      
      result += '</div>';
      return result;
    };
    
    // Helper function to process generic sections
    const processGenericSection = (content: string) => {
      let result = '<div class="mb-8 px-2">';
      const lines = content.split('\n');
      let inList = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (!line) {
          if (inList) {
            result += '</ul>';
            inList = false;
          }
          continue;
        }
        
        // Skip nutritional information section
        if (line.toLowerCase().includes('nutritional information') || 
            line.toLowerCase().includes('nutrition information') ||
            line.toLowerCase().includes('nutrition facts')) {
          // Skip this section until we find an empty line or a new section header
          while (i + 1 < lines.length && !lines[i + 1].match(/^##\s/)) {
            i++;
            // Break if we hit an empty line that might signal end of section
            if (!lines[i].trim()) {
              break;
            }
          }
          continue;
        }
        
        // Apply temperature conversion if needed
        if (unitSystem === 'imperial') {
          // Handle combined temperature formats like "200C/180C fan/gas 6"
          line = line.replace(/(\d+)[Cc]\s*\/\s*(\d+)[Cc]\s*fan\s*\/\s*gas\s*(\d+)/g, (match, temp1, temp2, gas) => {
            const fahrenheit1 = Math.round(parseFloat(temp1) * 9/5 + 32);
            const fahrenheit2 = Math.round(parseFloat(temp2) * 9/5 + 32);
            // Round to nearest 5
            const roundedF1 = Math.round(fahrenheit1 / 5) * 5;
            const roundedF2 = Math.round(fahrenheit2 / 5) * 5;
            return `${roundedF1}°F (${roundedF2}°F fan)`;
          });
          
          // Convert standard temperatures
          line = line.replace(/(\d+)(\s*)(°C|degrees C|deg C)/gi, (match, temp, space, unit) => {
            const fahrenheit = Math.round(parseFloat(temp) * 9/5 + 32);
            // Round to nearest 5
            const roundedFahrenheit = Math.round(fahrenheit / 5) * 5;
            return `${roundedFahrenheit}°F`;
          });
          
          // Handle special cases like "200°C (180°C fan)"
          line = line.replace(/(\d+)(\s*)(°C|degrees C|deg C)(\s*)\((\d+)(\s*)(°C|degrees C|deg C)(\s*)fan\)/gi, 
            (match, temp1, space1, unit1, space2, temp2, space3, unit2, space4) => {
              const fahrenheit1 = Math.round(parseFloat(temp1) * 9/5 + 32);
              const fahrenheit2 = Math.round(parseFloat(temp2) * 9/5 + 32);
              // Round to nearest 5
              const roundedF1 = Math.round(fahrenheit1 / 5) * 5;
              const roundedF2 = Math.round(fahrenheit2 / 5) * 5;
              return `${roundedF1}°F (${roundedF2}°F fan)`;
          });
          
          // Convert gas mark references
          line = line.replace(/gas\s*mark\s*(\d+)/gi, (match, gas) => {
            // Simple conversion from gas mark to Fahrenheit
            const gasToF: Record<string, string> = {
              '1': '275',
              '2': '300',
              '3': '325',
              '4': '350',
              '5': '375',
              '6': '400',
              '7': '425',
              '8': '450',
              '9': '475'
            };
            const gasNum = gas as string;
            return `${gasToF[gasNum] || (parseInt(gasNum) * 25 + 250)}°F`;
          });
          
          // Convert gas number references
          line = line.replace(/gas\s*(\d+)/gi, (match, gas) => {
            // Simple conversion from gas mark to Fahrenheit
            const gasToF: Record<string, string> = {
              '1': '275',
              '2': '300',
              '3': '325',
              '4': '350',
              '5': '375',
              '6': '400',
              '7': '425',
              '8': '450',
              '9': '475'
            };
            const gasNum = gas as string;
            return `${gasToF[gasNum] || (parseInt(gasNum) * 25 + 250)}°F`;
          });
        } else {
          // Convert temperatures from Fahrenheit to Celsius
          line = line.replace(/(\d+)(\s*)(°F|degrees F|deg F)/gi, (match, temp, space, unit) => {
            const celsius = Math.round((parseFloat(temp) - 32) * 5/9);
            return `${celsius}°C`;
          });
          
          // Handle special cases like "400°F (375°F fan)"
          line = line.replace(/(\d+)(\s*)(°F|degrees F|deg F)(\s*)\((\d+)(\s*)(°F|degrees F|deg F)(\s*)fan\)/gi, 
            (match, temp1, space1, unit1, space2, temp2, space3, unit2, space4) => {
              const celsius1 = Math.round((parseFloat(temp1) - 32) * 5/9);
              const celsius2 = Math.round((parseFloat(temp2) - 32) * 5/9);
              return `${celsius1}°C (${celsius2}°C fan)`;
          });
        }
        
        // Check for list items
        if (line.startsWith('- ')) {
          if (!inList) {
            result += '<ul class="space-y-3 mb-4 pl-4">';
            inList = true;
          }
          result += `<li class="py-1 mb-1">${line.substring(2).trim()}</li>`;
        } else {
          if (inList) {
            result += '</ul>';
            inList = false;
          }
          
          // Regular paragraph
          result += `<p class="text-gray-300 mb-3">${line}</p>`;
        }
      }
      
      if (inList) {
        result += '</ul>';
      }
      
      result += '</div>';
      return result;
    };

    const formattedMarkdown = formatMarkdown(contentToRender);
    
    // Add event listener for ingredient checkboxes after the content is rendered
    useEffect(() => {
      const checkboxes = document.querySelectorAll('.ingredient-checkbox, .instruction-checkbox');
      
      const handleCheckboxChange = (e: Event) => {
        const checkbox = e.target as HTMLInputElement;
        
        if (checkbox.classList.contains('ingredient-checkbox')) {
          const ingredientDiv = checkbox.closest('[data-ingredient]');
          if (ingredientDiv) {
            const ingredient = ingredientDiv.getAttribute('data-ingredient') || '';
            toggleIngredient(ingredient);
            
            // Update the label styling
            const label = ingredientDiv.querySelector('label');
            if (label) {
              if (checkbox.checked) {
                label.classList.add('line-through', 'text-gray-500');
                label.classList.remove('text-gray-300');
              } else {
                label.classList.remove('line-through', 'text-gray-500');
                label.classList.add('text-gray-300');
              }
            }
          }
        } else if (checkbox.classList.contains('instruction-checkbox')) {
          // Get the instruction step number from the ID
          const instructionId = checkbox.id;
          const instructionKey = instructionId.split('-').slice(-2).join('-'); // Get "instruction-X" part
          toggleIngredient(instructionKey);
        }
      };
      
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
      });
      
      return () => {
        checkboxes.forEach(checkbox => {
          checkbox.removeEventListener('change', handleCheckboxChange);
        });
      };
    }, [toggleIngredient]);
    
    // Extract title from the markdown
    const titleMatch = recipe.match(/# (.+?)(\n|$)/);
    const title = titleMatch ? titleMatch[1] : 'Recipe';
    
    // Get ingredients and organize them
    const allIngredients = extractIngredients();
    const ingredientsBySection = organizeBySection(allIngredients);
    
    return (
      <div className="recipe-display bg-gray-800 rounded-xl overflow-hidden shadow-xl max-w-4xl mx-auto">
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
        <div className="p-4 bg-gray-700">
          {/* Button container with grid layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            {/* Save Recipe button */}
            <button
              onClick={handleSaveRecipe}
              disabled={isSaving || isAlreadySaved}
              className={`flex items-center justify-center gap-2 ${
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
            
            {/* Add to Groceries button */}
            <button
              onClick={handleOpenGroceryList}
              className={`flex items-center justify-center gap-2 ${
                recipeAddedToList 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-600 hover:bg-gray-500'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {recipeAddedToList ? 'Added to List' : 'Add to Groceries'}
            </button>
            
            {/* Reset Checkboxes button */}
            <button
              onClick={resetChecklist}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Checkboxes
            </button>
            
            {/* Unit toggle button */}
            <button
              onClick={() => setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric')}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
              title={unitSystem === 'metric' ? 'Switch to Freedom Units (oz, lb)' : 'Switch to UK Units (g, kg)'}
            >
              <div className="flex items-center justify-center w-6 relative">
                {/* American Flag (Imperial/Freedom) */}
                <div className={`absolute transition-all duration-300 ${unitSystem === 'imperial' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-6">
                    <path fill="#f0f0f0" d="M0 85.33h512v341.33H0z"/>
                    <g fill="#d80027">
                      <path d="M0 85.33h512v42.67H0zM0 170.67h512v42.67H0zM0 256h512v42.67H0zM0 341.33h512V384H0z"/>
                    </g>
                    <path fill="#2e52b2" d="M0 85.33h256v198.67H0z"/>
                    <path fill="#f0f0f0" d="m99.82 160.624-23.137 11.063 12.222 22.568-24.809-6.748-4.075 25.355-16.892-19.479-16.89 19.479-4.076-25.355-24.81 6.749 12.223-22.569L0 160.624l23.137-11.063-12.222-22.568 24.809 6.748 4.075-25.355 16.892 19.479 16.89-19.479 4.076 25.355 24.81-6.749-12.223 22.569zm93.887 0-23.137 11.063 12.222 22.568-24.809-6.748-4.075 25.355-16.892-19.479-16.89 19.479-4.076-25.355-24.81 6.749 12.223-22.569-23.136-11.064 23.137-11.063-12.222-22.568 24.809 6.748 4.075-25.355 16.892 19.479 16.89-19.479 4.076 25.355 24.81-6.749-12.223 22.569z"/>
                  </svg>
                </div>
                
                {/* British Flag (Metric/UK) */}
                <div className={`absolute transition-all duration-300 ${unitSystem === 'metric' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-6">
                    <path fill="#f0f0f0" d="M0 85.33h512v341.33H0z"/>
                    <path fill="#0052b4" d="M0 85.33h512v341.33H0z"/>
                    <path fill="#f0f0f0" d="M512 85.33v42.663L341.331 256l170.667 128v42.667H426.67L256 298.667 85.333 426.666H0v-42.666L170.667 256 0 128V85.333h85.333L256 213.334l170.667-128z"/>
                    <path d="M288 85.33h-64v138.67H0v64h224v138.67h64V288h224v-64H288z" fill="#f0f0f0"/>
                    <g fill="#d80027">
                      <path d="M0 85.33v30.933L151.467 256 0 395.737v30.93h30.933L213.333 256 30.933 85.333zM481.067 85.33H512v30.933L360.533 256 512 395.737v30.93h-30.933L298.667 256 481.067 85.333zM256 85.33v47.186L139.638 85.33H256zM256 426.67V379.48l116.364 47.19z"/>
                    </g>
                  </svg>
                </div>
              </div>
              <span>{unitSystem === 'metric' ? 'UK' : 'Freedom'}</span>
            </button>
            
            {/* Share button */}
            <button
              onClick={handleShareRecipe}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
        
        {/* Recipe Content with proper padding */}
        <div className="px-6 md:px-8 pb-6 mt-4">
          <div className="recipe-content" dangerouslySetInnerHTML={{ __html: formattedMarkdown }} />
        </div>
        
        {url && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col items-center px-6 pb-6">
            {/* End message */}
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
          <GroceryList 
            ingredients={extractIngredients()} 
            recipeName={typeof recipe === 'string' 
              ? ((recipe as string).match(/# (.+)$/m)?.[1] || 'Recipe')
              : (recipe as any).title || 'Recipe'} 
            onClose={() => setShowShoppingList(false)} 
          />
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
    <div className="recipe-display bg-gray-800 rounded-xl overflow-hidden shadow-xl max-w-4xl mx-auto">
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
      <div className="p-4 bg-gray-700">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Scrollable button container */}
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
          <button
            onClick={handleSaveRecipe}
            disabled={isSaving || isAlreadySaved}
            className={`flex items-center gap-2 flex-shrink-0 ${
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
            onClick={handleOpenGroceryList}
            className={`flex items-center gap-2 flex-shrink-0 ${
              recipeAddedToList 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            } text-white px-4 py-2 rounded-lg transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {recipeAddedToList ? 'Added to List' : 'Add to Groceries'}
          </button>
          
          {/* Reset Checkboxes button */}
          <button
            onClick={resetChecklist}
            className="flex items-center gap-2 flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Checkboxes
          </button>
          
          {/* Unit toggle button */}
          <button
            onClick={() => setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric')}
            className="flex items-center gap-2 flex-shrink-0 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            title={unitSystem === 'metric' ? 'Switch to Freedom Units (oz, lb)' : 'Switch to UK Units (g, kg)'}
          >
            <div className="flex items-center justify-center w-6 relative">
              {/* American Flag (Imperial/Freedom) */}
              <div className={`absolute transition-all duration-300 ${unitSystem === 'imperial' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-6">
                  <path fill="#f0f0f0" d="M0 85.33h512v341.33H0z"/>
                  <g fill="#d80027">
                    <path d="M0 85.33h512v42.67H0zM0 170.67h512v42.67H0zM0 256h512v42.67H0zM0 341.33h512V384H0z"/>
                  </g>
                  <path fill="#2e52b2" d="M0 85.33h256v198.67H0z"/>
                  <path fill="#f0f0f0" d="m99.82 160.624-23.137 11.063 12.222 22.568-24.809-6.748-4.075 25.355-16.892-19.479-16.89 19.479-4.076-25.355-24.81 6.749 12.223-22.569L0 160.624l23.137-11.063-12.222-22.568 24.809 6.748 4.075-25.355 16.892 19.479 16.89-19.479 4.076 25.355 24.81-6.749-12.223 22.569zm93.887 0-23.137 11.063 12.222 22.568-24.809-6.748-4.075 25.355-16.892-19.479-16.89 19.479-4.076-25.355-24.81 6.749 12.223-22.569-23.136-11.064 23.137-11.063-12.222-22.568 24.809 6.748 4.075-25.355 16.892 19.479 16.89-19.479 4.076 25.355 24.81-6.749-12.223 22.569z"/>
                </svg>
              </div>
              
              {/* British Flag (Metric/UK) */}
              <div className={`absolute transition-all duration-300 ${unitSystem === 'metric' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-6">
                  <path fill="#f0f0f0" d="M0 85.33h512v341.33H0z"/>
                  <path fill="#0052b4" d="M0 85.33h512v341.33H0z"/>
                  <path fill="#f0f0f0" d="M512 85.33v42.663L341.331 256l170.667 128v42.667H426.67L256 298.667 85.333 426.666H0v-42.666L170.667 256 0 128V85.333h85.333L256 213.334l170.667-128z"/>
                  <path d="M288 85.33h-64v138.67H0v64h224v138.67h64V288h224v-64H288z" fill="#f0f0f0"/>
                  <g fill="#d80027">
                    <path d="M0 85.33v30.933L151.467 256 0 395.737v30.93h30.933L213.333 256 30.933 85.333zM481.067 85.33H512v30.933L360.533 256 512 395.737v30.93h-30.933L298.667 256 481.067 85.333zM256 85.33v47.186L139.638 85.33H256zM256 426.67V379.48l116.364 47.19z"/>
                  </g>
                </svg>
              </div>
            </div>
            <span>{unitSystem === 'metric' ? 'UK' : 'Freedom'}</span>
          </button>
          
          {/* Share button */}
          <button
            onClick={handleShareRecipe}
            className="flex items-center gap-2 flex-shrink-0 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>
      </div>
      
      {/* Recipe Content with proper padding */}
      <div className="px-6 md:px-8 pb-6 mt-4">
        <div className="recipe-content" dangerouslySetInnerHTML={{ __html: contentToRender }} />
      </div>
      
      {url && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col items-center px-6 pb-6">
          {/* End message */}
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
        <GroceryList 
          ingredients={extractIngredients()} 
          recipeName={typeof recipe === 'string' 
            ? ((recipe as string).match(/# (.+)$/m)?.[1] || 'Recipe')
            : (recipe as any).title || 'Recipe'} 
          onClose={() => setShowShoppingList(false)} 
        />
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