"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getRecipeById } from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';
import RecipeDisplay from '@/components/RecipeDisplay';
import Image from 'next/image';

export default function RecipePage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    async function loadRecipe() {
      if (loading) return; // Wait until auth state is determined
      
      try {
        // Only proceed with fetching if we have a user or have determined there's no user
        const recipeData = await getRecipeById(params.id);
        
        if (!recipeData) {
          setError('Recipe not found');
        } else {
          // Check if the recipe belongs to the current user
          if (user && user.uid === recipeData.userId) {
            setRecipe(recipeData);
          } else {
            setError('Please sign in to view this recipe');
          }
        }
      } catch (err) {
        console.error('Error loading recipe:', err);
        setError('Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadRecipe();
  }, [params.id, user, loading]);
  
  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          
          {error === 'Please sign in to view this recipe' && !user && (
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Go to Sign In
            </button>
          )}
          
          <button
            onClick={() => router.push('/my-recipes')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Back to My Recipes
          </button>
        </div>
      </div>
    );
  }
  
  // Show recipe
  if (recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <RecipeDisplay 
          recipe={recipe.content} 
          recipeImage={recipe.imageUrl} 
          url={recipe.url}
        />
      </div>
    );
  }
  
  return null;
} 