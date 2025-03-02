'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RecipeDisplay from '@/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE, getRecipeFromCache, cacheRecipeUrl } from '@/lib/firebase/firebaseUtils';

export default function RecipeExtractorClient() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);

  // Extract image from the recipe URL
  useEffect(() => {
    if (url && !loading) {
      // Try to fetch an image from the URL's metadata
      const fetchImage = async () => {
        try {
          const response = await fetch('/api/extract-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.imageUrl) {
              setRecipeImage(data.imageUrl);
            }
          }
        } catch (err) {
          console.error('Failed to extract image:', err);
          // Don't show error to user, just fail silently
        }
      };
      
      fetchImage();
    }
  }, [url, loading]);

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
          // Check cache first
          const cachedRecipe = await getRecipeFromCache(url);
          
          if (cachedRecipe) {
            // Use cached recipe
            setRecipe(cachedRecipe);
            
            // Still try to get the image in the background
            fetchImage(url);
            resolve(cachedRecipe);
          } else {
            // Fetch fresh recipe
            const response = await fetch('/api/extract-recipe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url }),
            });

            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.error || 'Failed to extract recipe');
            }

            // Extract the markdown content from the response
            let extractedRecipe = data.markdown || data.content || data;
            
            // Cache the recipe for future use
            cacheRecipeUrl(url, extractedRecipe);
            
            // Process the recipe data
            if (typeof extractedRecipe === 'string') {
              extractedRecipe = extractedRecipe.replace(/^```markdown\s*/i, '');
              extractedRecipe = extractedRecipe.replace(/\s*```\s*$/i, '');
              extractedRecipe = extractedRecipe.replace(/^markdown\s*/i, '');
            }
            
            setRecipe(extractedRecipe);
            
            // Fetch image
            fetchImage(url);
            resolve(extractedRecipe);
          }
        } catch (error) {
          reject(error);
        }
      });
      
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Recipe extraction timed out')), 30000);
      });
      
      // Race the extraction against the timeout
      await Promise.race([extractionPromise, timeoutPromise]);
      
    } catch (err) {
      console.error('Extraction error:', err);
      setError(`Failed to extract recipe: ${err.message || 'Please try a different URL'}`);
    } finally {
      setLoading(false);
    }
  };

  // Separate function to fetch image
  const fetchImage = async (url: string) => {
    try {
      const response = await fetch('/api/extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          setRecipeImage(data.imageUrl);
        }
      }
    } catch (err) {
      console.error('Failed to extract image:', err);
      // Don't show error to user, just fail silently
    }
  };

  const formatRecipe = (recipe: any) => {
    if (!recipe) return null;

    try {
      return <RecipeDisplay recipe={recipe} recipeImage={recipeImage || DEFAULT_RECIPE_IMAGE} />;
    } catch (error) {
      // If parsing fails, display as formatted text
      // Remove any markdown delimiters
      let recipeText = typeof recipe === 'string' ? recipe : JSON.stringify(recipe, null, 2);
      
      // Remove ```markdown at the beginning
      recipeText = recipeText.replace(/^```markdown\s*/i, '');
      // Remove ``` at the end
      recipeText = recipeText.replace(/\s*```\s*$/i, '');
      // Remove any "markdown" text at the beginning
      recipeText = recipeText.replace(/^markdown\s*/i, '');
      
      // Convert markdown to HTML for better display
      const formattedText = formatMarkdown(recipeText);
      
      return (
        <div className="custom-recipe-container bg-gray-900 rounded-xl shadow-lg mb-8">
          <div className="recipe-image-container rounded-t-xl overflow-hidden relative h-64 w-full">
            <Image 
              src={recipeImage || DEFAULT_RECIPE_IMAGE} 
              alt="Recipe image" 
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          <div className="p-5 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formattedText }} />
        </div>
      );
    }
  };
  
  // Simple markdown formatter
  const formatMarkdown = (text: string) => {
    // Replace headers
    let formatted = text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold my-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold my-3 text-blue-400">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium my-2">$1</h3>')
      // Replace lists
      .replace(/^\* (.*$)/gim, '<ul class="list-disc pl-5 my-2"><li>$1</li></ul>')
      .replace(/^\d\. (.*$)/gim, '<ol class="list-decimal pl-5 my-2"><li>$1</li></ol>')
      // Replace bold and italic
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Replace line breaks
      .replace(/\n/gim, '<br>');
    
    // Combine adjacent list items
    formatted = formatted
      .replace(/<\/ul>\s*<ul class="list-disc pl-5 my-2">/g, '')
      .replace(/<\/ol>\s*<ol class="list-decimal pl-5 my-2">/g, '');
    
    return formatted;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <style jsx>{`
        .custom-recipe-container {
          display: grid;
          grid-gap: 16px;
        }
        
        .custom-recipe-container h1 {
          margin: 0 0 8px 0;
        }
        
        .custom-recipe-container .recipe-meta {
          margin: 0 0 16px 0;
        }
        
        .ingredient-section, .instruction-section {
          display: grid;
          grid-gap: 8px;
        }
        
        .ingredient-list {
          display: grid;
          grid-gap: 4px;
        }
        
        .instruction-list {
          display: grid;
          grid-gap: 8px;
        }
        
        .section-header {
          margin: 16px 0 4px 0;
        }
        
        .subsection-header {
          margin: 8px 0 2px 0;
        }
      `}</style>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Recipe Extractor</h1>
        
        <form onSubmit={(e) => { e.preventDefault(); handleExtract(); }} className="w-full">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste recipe URL here"
              className="flex-grow px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Extracting...' : 'Extract Recipe'}
            </button>
          </div>
        </form>
        
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Extracting recipe...</p>
        </div>
      ) : recipe ? (
        formatRecipe(recipe)
      ) : null}
    </div>
  );
} 