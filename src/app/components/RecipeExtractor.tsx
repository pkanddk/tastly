'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { extractRecipeFromUrl } from '../lib/deepseek';

const RecipeUrlInput = dynamic(() => import('@/components/RecipeUrlInput'), { 
  ssr: false 
});

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={props.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={props.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const FireIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={props.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
  </svg>
);

// Improved mobile detection
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileRegex.test(navigator.userAgent);
  
  // Also check screen width as a fallback
  const isMobileScreen = window.innerWidth < 768;
  
  console.log("Mobile detection:", { 
    userAgent: navigator.userAgent,
    isMobileUserAgent,
    screenWidth: window.innerWidth,
    isMobileScreen
  });
  
  return isMobileUserAgent || isMobileScreen;
};

export default function RecipeExtractor() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset URL and recipe when component mounts
    setUrl('');
    setRecipe(null);
    setError(null);

    // Clear service worker caches
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log("Service worker registrations:", registrations);
        
        // Unregister all service workers
        registrations.forEach(registration => {
          registration.unregister();
          console.log("Service worker unregistered");
        });
        
        // Clear all caches
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
              console.log("Cache deleted:", cacheName);
            });
          });
        }
      });
    }
  }, []);

  const handleExtract = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    // Clean and validate the URL
    let cleanUrl = url.trim();
    
    // Check if it's a valid URL
    try {
      new URL(cleanUrl); // This will throw if the URL is invalid
    } catch (e) {
      setError('Please enter a valid URL');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Log device info for debugging
      console.log("Extracting recipe from URL:", cleanUrl);
      
      // Use a fresh object for the request body
      const requestBody = { 
        url: cleanUrl,
        timestamp: new Date().toISOString()
      };
      
      // Always use the same endpoint regardless of device
      const endpoint = '/api/extract-recipe';
      
      console.log("About to fetch from endpoint:", endpoint);
      
      // And modify the fetch call to log the exact request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Info': 'RecipeExtractor-component'
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("Response status:", response.status);
      
      // Handle non-OK responses
      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Recipe extraction timed out. Please try again later.');
        }
        
        // Try to get the error text
        const errorText = await response.text();
        throw new Error(`Failed to extract recipe: ${errorText.substring(0, 100)}`);
      }
      
      // Get the response as text first
      const responseText = await response.text();
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(responseText);
        console.log("API response:", jsonData);
        
        if (jsonData.error) {
          throw new Error(jsonData.error);
        }
        
        // Use the entire JSON object for display
        setRecipe(jsonData);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        // If JSON parsing fails, just use the text directly
        setRecipe(responseText);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError(`Failed to extract recipe. ${err instanceof Error ? err.message : 'Please try a different URL.'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatRecipe = (recipe: any) => {
    if (!recipe) return null;

    console.log("Raw recipe data:", recipe);

    // Ensure we're working with an object
    let recipeObj;
    if (typeof recipe === 'string') {
      try {
        // Try to parse as JSON first
        recipeObj = JSON.parse(recipe);
      } catch (e) {
        // If it's not JSON, create an object from the markdown
        const titleMatch = recipe.match(/# (.*)/);
        const title = titleMatch ? titleMatch[1] : 'Recipe';
        
        const ingredientsMatch = recipe.match(/## Ingredients\s*([\s\S]*?)(?=##|$)/);
        const ingredients = ingredientsMatch 
          ? ingredientsMatch[1].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i && !i.includes('Log In') && !i.includes('Search'))
          : [];
        
        const instructionsMatch = recipe.match(/## Instructions\s*([\s\S]*?)(?=##|$)/);
        const instructions = instructionsMatch
          ? instructionsMatch[1].trim().split('\n').map(i => i.replace(/^\d+\.\s*/, '').trim()).filter(i => i && !i.includes('Log In') && !i.includes('Search'))
          : [];
        
        recipeObj = {
          title,
          ingredients,
          instructions,
          markdown: recipe
        };
      }
    } else {
      recipeObj = recipe;
    }
    
    // Filter out any navigation elements that might have slipped through
    if (recipeObj.ingredients) {
      recipeObj.ingredients = recipeObj.ingredients.filter((ing: string) => 
        ing && 
        !ing.includes('Log In') && 
        !ing.includes('Search') && 
        !ing.includes('Menu') &&
        !ing.includes('Home')
      );
    }
    
    // Now render the recipe with the filtered data
    return (
      <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">{recipeObj.title || 'Extracted Recipe'}</h2>
        
        {recipeObj.ingredients && recipeObj.ingredients.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-1 text-white">Ingredients:</h4>
            <ul className="list-disc pl-5 text-gray-200">
              {recipeObj.ingredients.map((ing: string, i: number) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          </div>
        )}
        
        {recipeObj.instructions && recipeObj.instructions.length > 0 && (
          <div>
            <h4 className="font-medium mb-1 text-white">Instructions:</h4>
            <ol className="list-decimal pl-5 text-gray-200">
              {recipeObj.instructions.map((step: string, i: number) => (
                <li key={i} className="mb-2">{step}</li>
              ))}
            </ol>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">Extraction method: {recipeObj.method || 'unknown'}</p>
        </div>
      </div>
    );
  };

  const clearError = () => {
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Recipe Extractor</h1>
        <RecipeUrlInput 
          url={url} 
          setUrl={(newUrl) => {
            setUrl(newUrl);
            clearError();
          }} 
          onExtract={handleExtract} 
          loading={loading}
          error={error}
          setError={setError}
        />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-300">Extracting recipe...</p>
        </div>
      ) : recipe ? (
        formatRecipe(recipe)
      ) : null}
    </div>
  );
} 