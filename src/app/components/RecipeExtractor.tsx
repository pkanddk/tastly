'use client';

import { useState } from 'react';
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

export default function RecipeExtractor() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const extractedRecipe = await extractRecipeFromUrl(url);
      setRecipe(extractedRecipe);
    } catch (err) {
      setError('Failed to extract recipe. Please try a different URL.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatRecipe = (recipe: any) => {
    if (!recipe) return null;

    try {
      // Try to parse if it's a string
      let parsedRecipe = typeof recipe === 'string' ? JSON.parse(recipe) : recipe;
      
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
      // If parsing fails, display as formatted text
      return (
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
          <pre className="whitespace-pre-wrap text-gray-200">{recipe}</pre>
        </div>
      );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Recipe Extractor</h1>
        <RecipeUrlInput 
          url={url} 
          setUrl={setUrl} 
          onExtract={handleExtract} 
          loading={loading}
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