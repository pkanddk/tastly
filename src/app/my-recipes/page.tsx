"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getRecipesByUser, deleteRecipe, signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import Link from 'next/link';
import Image from 'next/image';

export default function MyRecipesPage() {
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  const handleDeleteRecipe = async (recipeId) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      try {
        await deleteRecipe(recipeId);
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };
  
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Recipes</h1>
            <Link 
              href="/recipe-extractor" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Extract New Recipe
            </Link>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Recipes</h1>
            <Link 
              href="/recipe-extractor" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Extract New Recipe
            </Link>
          </div>
          <div className="text-center py-12">
            <p className="mb-4">Please sign in to view your saved recipes</p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded"
              onClick={() => signInWithGoogle()}
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Recipes</h1>
          <Link 
            href="/recipe-extractor" 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Extract New Recipe
          </Link>
        </div>
        
        {recipes.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl">
            <p className="text-gray-400 mb-4">You don&apos;t have any recipes yet</p>
            <Link href="/recipe-extractor" className="text-blue-400 hover:text-blue-300">
              Extract a recipe now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => (
              <div key={recipe.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                {recipe.imageUrl && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">{recipe.title}</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Saved on {new Date(recipe.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex justify-between">
                    <Link 
                      href={`/recipes/${recipe.id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Recipe
                    </Link>
                    <button
                      onClick={() => handleDeleteRecipe(recipe.id)}
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
    </div>
  );
} 