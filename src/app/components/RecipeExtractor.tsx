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

// Mobile detection
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
      const isMobileDevice = isMobile();
      console.log("Device info:", { isMobile: isMobileDevice, userAgent: navigator.userAgent });
      console.log("Extracting recipe from URL:", cleanUrl);
      
      // Use a fresh object for the request body
      const requestBody = { 
        url: cleanUrl, 
        isMobile: isMobileDevice,
        timestamp: new Date().toISOString()
      };
      
      // Use different endpoints for mobile and desktop
      const endpoint = isMobileDevice 
        ? '/api/deepseek/extract-recipe-mobile' 
        : '/api/deepseek/extract-recipe';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Is-Mobile': isMobileDevice ? 'true' : 'false'
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`Failed to extract recipe: ${response.status}`);
      }
      
      // Check the content type to determine how to handle the response
      const contentType = response.headers.get('Content-Type');
      
      if (contentType && contentType.includes('application/json')) {
        // It's JSON, parse it
        const jsonData = await response.json();
        setRecipe(jsonData);
      } else {
        // It's not JSON, treat it as text
        const textData = await response.text();
        setRecipe(textData);
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

    console.log("Raw recipe data:", typeof recipe, 
      typeof recipe === 'string' ? recipe.substring(0, 100) : JSON.stringify(recipe).substring(0, 100));

    // For mobile, use a simpler display format
    if (isMobile()) {
      return (
        <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Extracted Recipe</h2>
          <div className="mb-4">
            <button 
              onClick={() => alert(typeof recipe === 'string' ? recipe : JSON.stringify(recipe, null, 2))}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Show Raw Data
            </button>
          </div>
          {typeof recipe === 'string' ? (
            <div className="whitespace-pre-wrap text-gray-200 text-sm">
              {recipe.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
          ) : (
            // Handle object format
            <div className="text-gray-200 text-sm">
              <h3 className="text-lg font-semibold mb-2">{recipe.title || 'Recipe'}</h3>
              {recipe.description && <p className="italic mb-4">{recipe.description}</p>}
              
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Ingredients:</h4>
                  <ul className="list-disc pl-5">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {recipe.instructions && recipe.instructions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Instructions:</h4>
                  <ol className="list-decimal pl-5">
                    {recipe.instructions.map((step, i) => (
                      <li key={i} className="mb-2">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // For desktop, use the more complex format
    try {
      // Try to parse if it's a string that looks like JSON
      let parsedRecipe;
      if (typeof recipe === 'string') {
        // First, try to handle any potential BOM or invisible characters
        const cleanedRecipe = recipe.trim().replace(/^\uFEFF/, '');
        
        // Check if it starts with { or [ which would indicate JSON
        if ((cleanedRecipe.startsWith('{') && cleanedRecipe.endsWith('}')) || 
            (cleanedRecipe.startsWith('[') && cleanedRecipe.endsWith(']'))) {
          try {
            parsedRecipe = JSON.parse(cleanedRecipe);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            // Create a simple object with the raw text
            parsedRecipe = {
              title: "Extracted Recipe",
              description: "Recipe extracted from URL",
              instructions: [cleanedRecipe]
            };
          }
        } else {
          // It's markdown or plain text, create a simple object
          parsedRecipe = {
            title: "Extracted Recipe",
            description: "Recipe extracted from URL",
            instructions: cleanedRecipe.split('\n').filter(line => line.trim() !== '')
          };
        }
      } else {
        parsedRecipe = recipe;
      }
      
      // Add this simple message at the beginning
      return (
        <div className="space-y-6">
          <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
            This is a test message to verify the component is updating.
          </div>
          
          <div className="recipe-container bg-gray-900 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col" style={{ gap: '12px' }}>
              <h1 className="text-3xl font-bold text-white">{parsedRecipe.title || 'Recipe'}</h1>
              
              <button 
                onClick={() => alert(JSON.stringify(parsedRecipe, null, 2))}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Show Raw Data
              </button>
              
              {parsedRecipe.description && (
                <p className="italic text-gray-300">{parsedRecipe.description}</p>
              )}
              
              <div className="flex flex-wrap gap-6 text-gray-300">
                {parsedRecipe.prepTime && (
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-blue-400" />
                    <span>Prep: {parsedRecipe.prepTime}</span>
                  </div>
                )}
                {parsedRecipe.cookTime && (
                  <div className="flex items-center gap-2">
                    <FireIcon className="w-5 h-5 text-orange-400" />
                    <span>Cook: {parsedRecipe.cookTime}</span>
                  </div>
                )}
                {parsedRecipe.servings && (
                  <div className="flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-green-400" />
                    <span>Serves: {parsedRecipe.servings}</span>
                  </div>
                )}
              </div>
              
              {parsedRecipe.ingredients && parsedRecipe.ingredients.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Ingredients</h2>
                  <div className="flex flex-col" style={{ gap: '4px' }}>
                    {Array.isArray(parsedRecipe.ingredients) ? 
                      parsedRecipe.ingredients.map((ingredient: any, index: number) => {
                        if (typeof ingredient === 'string' && 
                            (ingredient.endsWith(':') || ingredient.toUpperCase() === ingredient)) {
                          return (
                            <div key={index} className="font-semibold text-white pt-1">
                              {ingredient}
                            </div>
                          );
                        }
                        return (
                          <div key={index} className="flex items-start pl-4">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2"></span>
                            <span>{ingredient}</span>
                          </div>
                        );
                      }) : 
                      <div>{parsedRecipe.ingredients}</div>
                    }
                  </div>
                </div>
              )}
              
              {parsedRecipe.instructions && parsedRecipe.instructions.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Instructions</h2>
                  <div className="flex flex-col" style={{ gap: '8px' }}>
                    {Array.isArray(parsedRecipe.instructions) ?
                      parsedRecipe.instructions.map((instruction: any, index: number) => {
                        if (typeof instruction === 'string' && 
                            (instruction.endsWith(':') || instruction.toUpperCase() === instruction)) {
                          return (
                            <div key={index} className="font-semibold text-white pt-1">
                              {instruction}
                            </div>
                          );
                        }
                        return (
                          <div key={index} className="flex ml-4">
                            <span className="font-bold text-blue-400 mr-3 min-w-[20px]">{index + 1}.</span>
                            <span>{instruction}</span>
                          </div>
                        );
                      }) :
                      <div>{parsedRecipe.instructions}</div>
                    }
                  </div>
                </div>
              )}
              
              {parsedRecipe.notes && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Notes</h2>
                  <p className="text-gray-300">{parsedRecipe.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg mt-8">
            <h3 className="text-lg font-semibold text-white mb-2">Raw Recipe Data (for debugging):</h3>
            <pre className="text-xs text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(parsedRecipe, null, 2)}
            </pre>
          </div>
        </div>
      );
    } catch (error) {
      console.error("Error formatting recipe:", error);
      // Fallback to displaying as text
      return (
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Extracted Recipe</h2>
          <pre className="whitespace-pre-wrap text-gray-200">{recipe}</pre>
        </div>
      );
    }
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
        <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Extracted Recipe</h2>
          {typeof recipe === 'string' ? (
            // Handle string recipes (plain text or markdown)
            <div className="whitespace-pre-wrap text-gray-200 text-sm">
              {recipe.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
          ) : (
            // Handle object recipes (JSON)
            <div className="text-gray-200 text-sm">
              <h3 className="text-lg font-semibold mb-2">{recipe.title || 'Recipe'}</h3>
              {recipe.description && <p className="italic mb-4">{recipe.description}</p>}
              
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Ingredients:</h4>
                  <ul className="list-disc pl-5">
                    {recipe.ingredients.map((ing: any, i: number) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {recipe.instructions && recipe.instructions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Instructions:</h4>
                  <ol className="list-decimal pl-5">
                    {recipe.instructions.map((step: any, i: number) => (
                      <li key={i} className="mb-2">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
} 