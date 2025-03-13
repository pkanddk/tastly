'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RecipeDisplay from '@/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE, getRecipeFromCache, cacheRecipeUrl } from '@/lib/firebase/firebaseUtils';

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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
            fetchImage(url);
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
            fetchImage(url);
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

  // Add this function to directly handle the specific pattern we're seeing
  const handleRecipeMarkdown = (recipe: string) => {
    // Check if the recipe starts with ```markdown
    if (recipe.startsWith('```markdown')) {
      // Remove the ```markdown at the beginning
      return recipe.replace(/^```markdown\s*/i, '');
    }
    return recipe;
  };

  // Update the formatRecipe function to use this direct handler
  const formatRecipe = (recipe: any) => {
    if (!recipe) return null;

    // First, directly handle the markdown pattern
    if (typeof recipe === 'string') {
      recipe = handleRecipeMarkdown(recipe);
    }

    try {
      return <RecipeDisplay recipe={recipe} recipeImage={recipeImage || DEFAULT_RECIPE_IMAGE} />;
    } catch (error) {
      // If parsing fails, display as formatted text
      let recipeText = typeof recipe === 'string' ? recipe : JSON.stringify(recipe, null, 2);
      
      // Convert markdown to HTML for better display
      const formattedText = formatMarkdown(recipeText);
      
      return (
        <div className="custom-recipe-container bg-gray-900 rounded-xl shadow-lg mb-8">
          <div className="recipe-image-container rounded-t-xl overflow-hidden relative h-64 w-full">
            <Image 
              src={recipeImage || DEFAULT_RECIPE_IMAGE}
              alt="Recipe image"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          <div className="p-5 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formattedText }} />
        </div>
      );
    }
  };
  
  // Simple markdown formatter with additional cleanup
  const formatMarkdown = (text: string) => {
    // First, clean up any markdown formatting tags that might be visible in the output
    let cleanedText = text;
    
    // Remove '''markdown at the beginning of the text
    cleanedText = cleanedText.replace(/^'''markdown\s*/i, '');
    
    // Remove ```markdown at the beginning of the text
    cleanedText = cleanedText.replace(/^```markdown\s*/i, '');
    
    // Remove ''' at the end of the text
    cleanedText = cleanedText.replace(/'''\s*$/i, '');
    
    // Replace headers
    let formatted = cleanedText
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
    
    // Final cleanup - remove any remaining markdown tags that might be visible
    formatted = formatted
      .replace(/```markdown/g, '')
      .replace(/```/g, '')
      .replace(/'''/g, '');
    
    return formatted;
  };

  // Add this specific fix for the exact pattern you're seeing
  const fixSpecificMarkdownPattern = (text: string) => {
    // Check for the specific pattern: ```markdown at start and ''' at end
    const specificPattern = /^```markdown\s*([\s\S]*?)'''\s*$/;
    const match = text.match(specificPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return text;
  };

  // Update the cleanMarkdownFormatting function to include this specific fix
  const cleanMarkdownFormatting = (text: string) => {
    if (!text) return '';
    
    // First try the specific pattern fix
    const specificFix = fixSpecificMarkdownPattern(text);
    if (specificFix !== text) {
      return specificFix;
    }
    
    // Then try the other patterns...
    // First check if the text starts with ```markdown and ends with ```
    const fullMarkdownBlockRegex = /^```markdown\s*([\s\S]*?)\s*```$/;
    const match = text.match(fullMarkdownBlockRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Check for other code block patterns
    const codeBlockRegex = /^```(?:[\w]*\s*)?\n?([\s\S]*?)\n?```$/;
    const codeMatch = text.match(codeBlockRegex);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim();
    }
    
    // Check for triple quote pattern
    const tripleQuoteRegex = /^'''(?:[\w]*\s*)?\n?([\s\S]*?)\n?'''$/;
    const quoteMatch = text.match(tripleQuoteRegex);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    
    // If no full block matches, clean up any markdown tags
    return text
      .replace(/```markdown\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/'''\s*/g, '')
      .replace(/^markdown\s*/g, '')
      .trim();
  };

  // Add a direct pattern match for the specific issue we're seeing
  const fixTripleQuotePattern = (text: string) => {
    // Check for text that starts with ```markdown and contains ''' anywhere
    if (text.startsWith('```markdown') && text.includes("'''")) {
      // Remove the ```markdown at the beginning
      let fixed = text.replace(/^```markdown\s*/i, '');
      
      // Remove the ''' at the end or anywhere in the text
      fixed = fixed.replace(/'''/g, '');
      
      return fixed.trim();
    }
    
    // Also check for just '''markdown at the beginning
    if (text.startsWith("'''markdown")) {
      let fixed = text.replace(/^'''markdown\s*/i, '');
      return fixed.trim();
    }
    
    return text;
  };

  // Update the processRecipeResponse function to use this direct fix first
  const processRecipeResponse = (response: string) => {
    if (!response) return '';
    
    // First try the direct pattern match
    let cleaned = fixTripleQuotePattern(response);
    
    // If that didn't change anything, try the other cleaning methods
    if (cleaned === response) {
      cleaned = cleanMarkdownFormatting(response);
    }
    
    return cleaned;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
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