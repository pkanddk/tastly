'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import RecipeDisplay from '@/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import { TAGLINES } from '@/lib/constants';
import TaglineIcon from '@/components/TaglineIcon';
import { Icon } from '@heroicons/react/24/outline';

// Create a loading component
function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-black/20 backdrop-blur-sm">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-primary/30 border-t-transparent rounded-full animate-spin-slow"></div>
        </div>
        <div className="text-center">
          <p className="text-white text-lg mb-2">Extracting recipe...</p>
          <div className="flex items-center gap-2 text-primary animate-fade-in">
            <span className="w-5 h-5">
              <TaglineIcon icon={TAGLINES[currentTaglineIndex].icon} />
            </span>
            <p>{TAGLINES[currentTaglineIndex].text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create a component for the recipe content
function RecipeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const [recipe, setRecipe] = useState<any>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);

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

  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setCurrentTaglineIndex(current => (current + 1) % TAGLINES.length);
    }, 3000); // Rotate every 3 seconds
    
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-black/20 backdrop-blur-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-primary/30 border-t-transparent rounded-full animate-spin-slow"></div>
          </div>
          <div className="text-center">
            <p className="text-foreground text-lg mb-4">Extracting recipe...</p>
            <div className="inline-flex items-center justify-center gap-2 text-primary animate-fade-in transition-all duration-500 ease-in-out hover:scale-105">
              <span className="w-5 h-5 flex-shrink-0">
                <TaglineIcon icon={TAGLINES[currentTaglineIndex].icon} />
              </span>
              <p className="text-lg">{TAGLINES[currentTaglineIndex].text}</p>
            </div>
          </div>
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

// Main page component with Suspense
export default function RecipePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RecipeContent />
    </Suspense>
  );
} 