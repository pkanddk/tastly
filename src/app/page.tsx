"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TAGLINES } from '@/lib/constants';
import TaglineIcon from '@/components/TaglineIcon';
import RecipeDisplay from '@/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/firebase/firebaseUtils';
import { useGroceryList } from '@/lib/contexts/GroceryListContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { openGroceryList } = useGroceryList();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<any>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
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
  
  const handleExtractRecipe = async () => {
    if (!url) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Store the URL in localStorage so we can access it on the recipe page
      localStorage.setItem('recipeUrl', url);
      
      // Navigate to the recipe page with the URL as a query parameter
      router.push(`/recipe?url=${encodeURIComponent(url)}`);
    } catch (error) {
      console.error('Error extracting recipe:', error);
      setError('Failed to extract recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Welcome to Tastly</h1>
          <p className="text-xl text-blue-400 max-w-3xl mx-auto">
            Because 'Jump to the Recipe' buttons shouldn't exist.
          </p>
        </div>
        
        {/* Hero Image Section */}
        <div className="mb-12">
          <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden shadow-2xl">
            <Image
              src="/images/tastly-banner.jpg"
              alt="Banner"
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover"
              priority
            />
            
            {/* Overlay with subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60"></div>
          </div>
        </div>
        
        {/* Tagline as a fixed "No ads ever" message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-xl md:text-2xl font-bold">
              No ads ever
            </p>
          </div>
        </div>
        
        {/* Main Actions Container */}
        <div className="space-y-4">
          {/* URL Input Section */}
          <div className="w-full max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleExtractRecipe(); }} className="w-full max-w-3xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste recipe URL here"
                  className="flex-grow px-6 py-4 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  required
                />
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Reading...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Reader
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Action Buttons - Show for all users */}
          <div className="flex flex-col items-center">
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 w-full max-w-3xl">
              <button 
                onClick={openGroceryList}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Grocery List
              </button>
              
              {user ? (
                <Link 
                  href="/my-recipes" 
                  className="w-full sm:flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  My Recipes
                </Link>
              ) : (
                <button 
                  onClick={() => {
                    // Set a flag to redirect to My Recipes after auth
                    localStorage.setItem('auth_return_url', '/my-recipes');
                    signInWithGoogle();
                  }}
                  className="w-full sm:flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  My Recipes
                </button>
              )}
              
              <Link 
                href="/replication-station" 
                className="w-full sm:flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Replication Station
              </Link>
            </div>
          </div>
        </div>
        
        {/* Recipe Display */}
        <div
          id="recipe-panel"
          className={`transition-all duration-300 ease-in-out ${
            isPanelOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="bg-gray-800 rounded-xl mt-4 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Extracted Recipe</h2>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
            {recipe && (
              <RecipeDisplay 
                recipe={recipe?.markdown || recipe}
                recipeImage={recipeImage || DEFAULT_RECIPE_IMAGE}
                url={url}
              />
            )}
          </div>
        </div>
        
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Reader</h2>
            <p className="text-gray-300">
              Easily read recipes from any website with our powerful AI-powered tool.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Organize Your Collection</h2>
            <p className="text-gray-300">
              Keep all your favorite recipes in one place, organized and easy to find.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Access Anywhere</h2>
            <p className="text-gray-300">
              Access your recipes from any device, anytime, anywhere.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Replication Station</h2>
            <p className="text-gray-300">
              Recreate your favorite recipes with AI-guided assistance and personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
