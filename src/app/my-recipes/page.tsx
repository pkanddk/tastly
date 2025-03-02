"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getRecipesByUser, deleteRecipe, signInWithGoogle, DEFAULT_RECIPE_IMAGE } from '@/lib/firebase/firebaseUtils';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function MyRecipesPage() {
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    async function loadRecipes() {
      if (user) {
        try {
          const userRecipes = await getRecipesByUser(user.uid);
          setRecipes(userRecipes);
        } catch (error) {
          console.error('Error loading recipes:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (!loading) {
        setIsLoading(false);
      }
    }
    
    loadRecipes();
  }, [user, loading]);
  
  const handleDeleteRecipe = async (recipeId: string, e: React.MouseEvent) => {
    // Stop event propagation to prevent navigation when clicking delete
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this recipe?')) {
      try {
        await deleteRecipe(recipeId);
        // Update the recipes list after deletion
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
      } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('Failed to delete recipe. Please try again.');
      }
    }
  };
  
  const navigateToRecipe = (recipeId: string) => {
    router.push(`/recipes/${recipeId}`);
  };
  
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
  
  // Show sign in prompt if not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">My Recipes</h1>
          <p className="text-gray-300 mb-6">Please sign in to view your saved recipes.</p>
          <button
            onClick={signInWithGoogle}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Recipes</h1>
      
      {recipes.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-300 mb-4">You haven't saved any recipes yet.</p>
          <Link 
            href="/recipe-extractor"
            className="text-blue-400 hover:text-blue-300"
          >
            Extract a recipe to get started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigateToRecipe(recipe.id)}
            >
              <div className="relative h-48 w-full">
                <Image
                  src={recipe.imageUrl || DEFAULT_RECIPE_IMAGE}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold mb-2">{recipe.title}</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Saved on {new Date(recipe.createdAt).toLocaleDateString()}
                </p>
                <div className="flex justify-between">
                  <button 
                    className="text-blue-400 hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      navigateToRecipe(recipe.id);
                    }}
                  >
                    View Recipe
                  </button>
                  <button
                    onClick={(e) => handleDeleteRecipe(recipe.id, e)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 