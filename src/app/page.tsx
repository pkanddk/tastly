"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TAGLINES } from '@/lib/constants';
import TaglineIcon from '@/components/TaglineIcon';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  const handleExtractRecipe = async () => {
    if (!url) return;
    
    try {
      setIsLoading(true);
      router.push(`/recipe-extractor?url=${encodeURIComponent(url)}`);
    } catch (error) {
      console.error('Error navigating to recipe extractor:', error);
      setIsLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              alt="Tastly Banner"
              fill
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
        
        {/* Action Buttons - Show for all users */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex flex-row flex-wrap justify-center gap-4 w-full max-w-lg">
            <Link 
              href="/recipe-extractor" 
              className="flex-1 min-w-[150px] bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Extract New Recipe
            </Link>
            
            {user ? (
              <Link 
                href="/my-recipes" 
                className="flex-1 min-w-[150px] bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                My Recipes
              </Link>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex-1 min-w-[150px] bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                My Recipes
              </button>
            )}
          </div>
        </div>
        
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Extract Recipes</h2>
            <p className="text-gray-300">
              Easily extract recipes from any website with our powerful AI-powered tool.
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
        </div>
      </div>
    </main>
  );
}
