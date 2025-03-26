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
      
      // Process each section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.trim()) continue;
        
        // Get the section title and content
        const sectionParts = section.split(/\n/, 2);
        const sectionTitle = sectionParts[0].trim();
        let sectionContent = sectionParts.length > 1 ? section.substring(sectionParts[0].length + 1) : '';
        
        // Add section header - use negative margin for the first section to pull it closer to the line
        let headerClass = "text-2xl font-bold text-blue-400 mb-4 text-center";
        if (i === 0 && sectionTitle.toLowerCase() === 'ingredients') {
          headerClass = "text-2xl font-bold text-blue-400 mb-4 text-center -mt-4";
        }
        formattedContent += `<h2 class="${headerClass}">${sectionTitle}</h2>`;
        
        // Special handling for Ingredients section
        if (sectionTitle.toLowerCase() === 'ingredients') {
          // Remove decorative divider
          
          // Add checkbox helper text
          formattedContent += `<p class="text-sm text-gray-400 italic text-center mb-4">Check off ingredients as you go. Your progress will be saved.</p>`;
          formattedContent += processIngredientsSection(sectionContent, recipeId, isIngredientChecked);
        } 
        // Special handling for Instructions section
        else if (sectionTitle.toLowerCase() === 'instructions') {
          // Remove decorative divider
          
          // Add checkbox helper text for instructions
          formattedContent += `<p class="text-sm text-gray-400 italic text-center mb-4">Check off steps as you complete them.</p>`;
          formattedContent += processInstructionsSection(sectionContent);
        } 
        // Handle other sections
        else {
          formattedContent += processGenericSection(sectionContent);
        }
      }
      
      return formattedContent;
    };
    
    // Helper function to process the ingredients section
    const processIngredientsSection = (content: string, recipeId: string, isIngredientChecked: (ingredient: string) => boolean) => {
      let result = '<div class="mb-8 pl-1">';
      const lines = content.split('\n');
      let currentCategory = '';
      
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
          const ingredient = line.substring(2).trim();
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
      
      result += '</div>';
      return result;
    };
    
    // Helper function to process the instructions section
    const processInstructionsSection = (content: string) => {
      let result = '<div class="space-y-6 mb-8">';
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check for numbered list items
        const instructionMatch = line.match(/^\d+\.\s*(.+)$/);
        if (instructionMatch) {
          const instruction = instructionMatch[1];
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
        const line = lines[i].trim();
        
        if (!line) {
          if (inList) {
            result += '</ul>';
            inList = false;
          }
          continue;
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
            onClick={handleOpenGroceryList}
            className={`flex items-center gap-2 ${
              recipeAddedToList 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            } text-white px-4 py-2 rounded-lg transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {recipeAddedToList ? 'Added to List' : 'Add to Grocery List'}
          </button>
          
          <button
            onClick={resetChecklist}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Checkboxes
          </button>
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
          onClick={handleOpenGroceryList}
          className={`flex items-center gap-2 ${
            recipeAddedToList 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-600 hover:bg-gray-500'
          } text-white px-4 py-2 rounded-lg transition-colors`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {recipeAddedToList ? 'Added to List' : 'Add to Grocery List'}
        </button>
        
        <button
          onClick={resetChecklist}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Checkboxes
        </button>
      </div>
      
      {/* Content with proper padding */}
      <div className="px-6 md:px-8 pb-6 mt-4">
        <div className="mt-4 prose prose-invert max-w-none">
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-6 text-center">{recipe.title}</h1>
          
          {/* Cooking Time and Servings - MOVED DIRECTLY UNDER TITLE */}
          {recipe.cookingInfo && (
            <div className="mb-0">
              <ul className="space-y-3 mb-4">
                {recipe.cookingInfo.map((item: string, index: number) => (
                  <li key={index} className="py-1 mb-1 text-center">{item}</li>
                ))}
              </ul>
              <div className="border-t border-gray-700 pt-4 mt-6 mb-0"></div>
            </div>
          )}
          
          {/* Ingredients with checkboxes - use negative margin to reduce space */}
          <h2 className="text-2xl font-bold text-blue-400 mb-4 text-center -mt-4">Ingredients</h2>
          
          {/* Remove decorative divider */}
          
          <p className="text-sm text-gray-400 italic text-center mb-4">Check off ingredients as you go. Your progress will be saved.</p>
          {recipe.ingredientCategories ? (
            <div className="mb-10">
              {Object.entries(recipe.ingredientCategories as Record<string, string[]>).map(([category, ingredients], index) => (
                <div key={index} className="mb-10">
                  <h3 className="text-base font-medium text-teal-400 tracking-wider uppercase mb-2">{category.replace(/^For the\s+/i, '')}</h3>
                  <ul className="space-y-3 pl-2 mt-4">
                    {ingredients.map((ingredient: string, idx: number) => (
                      <li key={idx} className="py-1 mb-1 flex items-start gap-4 pl-2">
                        <input
                          type="checkbox"
                          id={`${recipeId}-${category}-${idx}`}
                          checked={isIngredientChecked(ingredient)}
                          onChange={() => toggleIngredient(ingredient)}
                          className="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <label 
                          htmlFor={`${recipeId}-${category}-${idx}`}
                          className={`cursor-pointer ${isIngredientChecked(ingredient) ? 'line-through text-gray-500' : ''}`}
                        >
                          {ingredient}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            // Render flat ingredient list with checkboxes
            <ul className="space-y-3 mb-8 pl-2">
              {recipe.ingredients.map((ingredient: string, index: number) => (
                <li key={index} className="py-1 mb-1 flex items-start gap-4 pl-2">
                  <input
                    type="checkbox"
                    id={`${recipeId}-ingredient-${index}`}
                    checked={isIngredientChecked(ingredient)}
                    onChange={() => toggleIngredient(ingredient)}
                    className="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label 
                    htmlFor={`${recipeId}-ingredient-${index}`}
                    className={`cursor-pointer ${isIngredientChecked(ingredient) ? 'line-through text-gray-500' : ''}`}
                  >
                    {ingredient}
                  </label>
                </li>
              ))}
            </ul>
          )}
          
          {/* Divider between sections */}
          <div className="border-t border-gray-700 pt-8 mt-8 mb-8"></div>
          
          {/* Instructions with checkboxes */}
          <h2 className="text-2xl font-bold text-blue-400 mb-4 text-center">Instructions</h2>
          
          {/* Remove decorative divider */}
          
          <p className="text-sm text-gray-400 italic text-center mb-4">Check off steps as you complete them.</p>
          <ul className="space-y-6 mb-10 pl-2">
            {recipe.instructions.map((instruction: string, index: number) => (
              <li key={index} className="py-1 mb-3 flex items-start gap-4">
                <input 
                  type="checkbox" 
                  id={`${recipeId}-instruction-${index}`}
                  checked={isIngredientChecked(`instruction-${index}`)}
                  onChange={() => toggleIngredient(`instruction-${index}`)}
                  className="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <label 
                  htmlFor={`${recipeId}-instruction-${index}`}
                  className="flex-grow cursor-pointer"
                >
                  {instruction}
                </label>
              </li>
            ))}
          </ul>
          
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
          
          {/* Other optional sections */}
          
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
          <GroceryList 
            ingredients={extractIngredients()} 
            recipeName={typeof recipe === 'string' 
              ? ((recipe as string).match(/# (.+)$/m)?.[1] || 'Recipe')
              : (recipe as any).title || 'Recipe'} 
            onClose={() => setShowShoppingList(false)} 
          />
        )}
      </div>
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