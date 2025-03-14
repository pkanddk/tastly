'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RecipeDisplay from '@/app/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE, getRecipeFromCache, cacheRecipeUrl } from '@/app/lib/firebase/firebaseUtils';
import { Recipe } from '@/app/lib/types';
import { processRecipeResponse } from '@/app/lib/utils';
import { extractRecipe, extractRecipeWithDeepSeekOptimized } from '@/app/lib/server/recipeExtractor';
import { useAuth } from '@/app/lib/hooks/useAuth';
import { saveRecipe, getCachedRecipeByUrl } from '@/app/lib/client/recipeUtils';

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function RecipeExtractorClient() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const { user } = useAuth();

  // Function to fetch and set the recipe image
  const fetchImage = async (recipeUrl: string) => {
    try {
      const response = await fetch('/api/extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: recipeUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const data = await response.json();
      setRecipeImage(data.imageUrl);
    } catch (err) {
      console.error('Error fetching image:', err);
      // Do not set a global error for image fetching failures
    }
  };

  useEffect(() => {
    // Check if there's a cached recipe for the current URL
    const cachedRecipe = getCachedRecipeByUrl(url);
    if (cachedRecipe) {
      setRecipe(cachedRecipe);
      // Fetch the image if not already cached
      if (!recipeImage) {
        fetchImage(url);
      }
    }
  }, [url, recipeImage]); // Depend on recipeImage to re-run if image fetch fails

  const handleExtract = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setRecipeImage(null);
      
      // Add a timeout to prevent hanging indefinitely
      const extractionPromise = new Promise(async (resolve, reject) => {
        try {
          // Fetch fresh recipe
          const endpoint = isMobileDevice()
            ? '/api/extract-recipe-anthropic'  // Use Anthropic for mobile
            : '/api/extract-recipe';          // Use DeepSeek for desktop

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to extract recipe');
          }

          // Check if the response is a stream or JSON
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('text/event-stream')) {
            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('Failed to get reader from response');
            }
            
            let extractedRecipe = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Convert the chunk to text and append to the recipe
              const chunk = new TextDecoder().decode(value);
              extractedRecipe += chunk;
            }
            
            // Cache the recipe for future use
            cacheRecipeUrl(url, extractedRecipe);
            
            setRecipe(extractedRecipe);
            // TEMPORARILY DISABLE IMAGE EXTRACTION
            // fetchImage(url);
            resolve(extractedRecipe);
          } else {
            // Handle JSON response
            const data = await response.json();
            
            // Extract the markdown content from the response
            let extractedRecipe = data.markdown || data.content || data;
            
            // If we still have markdown tags, try processing the original
            if (typeof extractedRecipe === 'string' && 
                (extractedRecipe.includes('```') || extractedRecipe.includes("'''"))) {
              if (data.original) {
                extractedRecipe = processRecipeResponse(data.original);
              }
            }
            
            // Cache the recipe for future use
            cacheRecipeUrl(url, extractedRecipe);
            
            // Process the recipe data
            if (typeof extractedRecipe === 'string') {
              extractedRecipe = processRecipeResponse(extractedRecipe);
            }
            
            setRecipe(extractedRecipe);
            // TEMPORARILY DISABLE IMAGE EXTRACTION
            // fetchImage(url);
            resolve(extractedRecipe);
          }
        } catch (error) {
          reject(error);
        }
      });
      
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Recipe extraction timed out')), 60000); // 60 seconds
      });
      
      // Race the extraction against the timeout
      await Promise.race([extractionPromise, timeoutPromise]);
      
    } catch (err: unknown) {
      console.error('Extraction error:', err);
      setError(`Failed to extract recipe: ${err instanceof Error ? err.message : 'Please try a different URL'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save recipes.');
      return;
    }

    if (recipe) {
      try {
        await saveRecipe(user.uid, recipe);
        alert('Recipe saved successfully!');
      } catch (error) {
        console.error('Error saving recipe:', error);
        setError('Failed to save recipe.');
      }
    } else {
      setError('No recipe to save.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Recipe Extractor</h1>
      <div className="flex mb-4">
        <input
          type="url"
          className="flex-grow p-2 border rounded mr-2"
          placeholder="Enter recipe URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleExtract}
          disabled={loading}
        >
          {loading ? 'Extracting...' : 'Extract Recipe'}
        </button>
        {user && recipe && (
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-2"
            onClick={handleSave}
          >
            Save Recipe
          </button>
        )}
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {recipe && (
        <>
          {recipeImage && (
            <img src={recipeImage} alt={recipe.title || 'Recipe Image'} className="mb-4 rounded" />
          )}
          <div className="prose" dangerouslySetInnerHTML={{ __html: recipe.markdown }} />
        </>
      )}
    </div>
  );
}