"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getRecipeById } from '@/lib/firebase/firebaseUtils';
import RecipeDisplay from '@/components/RecipeDisplay';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';

export default function RecipePage() {
  const params = useParams();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const recipeData = await getRecipeById(recipeId);
        
        // Check if user has permission to view this recipe
        if (recipeData.userId !== user?.uid) {
          setError('You do not have permission to view this recipe');
          setLoading(false);
          return;
        }
        
        setRecipe(recipeData);
      } catch (error) {
        console.error('Error fetching recipe:', error);
        setError('Recipe not found or error loading recipe');
      } finally {
        setLoading(false);
      }
    };

    if (recipeId && user) {
      fetchRecipe();
    } else if (!user) {
      setError('Please sign in to view this recipe');
      setLoading(false);
    }
  }, [recipeId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="mb-6">{error}</p>
          <Link href="/my-recipes" className="text-blue-400 hover:underline">
            Return to My Recipes
          </Link>
        </div>
      </div>
    );
  }

  // Determine if we're dealing with markdown or structured recipe
  const recipeContent = recipe.type === 'markdown' ? recipe.content : recipe;
  const recipeImage = recipe.imageUrl || null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/my-recipes" className="text-blue-400 hover:underline flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to My Recipes
          </Link>
        </div>
        
        <RecipeDisplay recipe={recipeContent} recipeImage={recipeImage} />
      </div>
    </div>
  );
} 