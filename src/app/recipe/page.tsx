'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import RecipeDisplay from '@/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';

export default function RecipePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const [recipe, setRecipe] = useState<any>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const extractRecipe = async () => {
      if (!url) {
        router.push('/');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/extract-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) throw new Error('Failed to extract recipe');

        const recipeData = await response.json();
        setRecipe(recipeData);
        
        // Fetch image after recipe
        try {
          const imageResponse = await fetch('/api/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            setRecipeImage(imageData.imageUrl);
          }
        } catch (imageError) {
          console.error('Error fetching image:', imageError);
          // Don't set an error - just use default image
        }
      } catch (error) {
        console.error('Error extracting recipe:', error);
        setError('Failed to extract recipe. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    extractRecipe();
  }, [url, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Extracting recipe...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {recipe && (
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <RecipeDisplay
            recipe={recipe.markdown || recipe}
            recipeImage={recipeImage || DEFAULT_RECIPE_IMAGE}
            url={url || undefined}
          />
        </div>
      )}
    </div>
  );
} 