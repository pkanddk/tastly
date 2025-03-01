"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const handleMyRecipesClick = async () => {
    if (user) {
      // User is logged in, navigate to my-recipes
      router.push('/my-recipes');
    } else {
      // User is not logged in, prompt for login
      try {
        const success = await signInWithGoogle();
        if (success) {
          // Successfully logged in, navigate to my-recipes
          router.push('/my-recipes');
        }
      } catch (error) {
        console.error('Error signing in:', error);
      }
    }
  };
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] justify-center gap-8 py-8">
      {/* Top section with welcome text - moved closer to the image */}
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white animate-fade-in">
          Welcome to Tastly
        </h1>
        <p className="text-2xl text-blue-400 font-medium">
          Only the Recipe.
        </p>
      </div>
      
      {/* Middle section with banner image */}
      <div className="flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          <div className="relative w-full h-72 md:h-96 rounded-xl overflow-hidden shadow-2xl transform transition-transform hover:scale-[1.01] duration-300">
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
          
          {/* Text below the image */}
          <p className="text-white text-xl md:text-2xl font-bold text-center mt-6">
          No ads or life stories, ever.
          </p>
        </div>
      </div>
      
      {/* Bottom section with buttons - moved closer to the text */}
      <div className="flex flex-col items-center">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link
            href="/recipe-extractor"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-xl transition-colors text-lg shadow-lg"
          >
            Recipe Extractor
          </Link>
          
          <button
            onClick={handleMyRecipesClick}
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-4 px-8 rounded-xl transition-colors text-lg shadow-lg"
          >
            My Recipes
          </button>
        </div>
        
        <p className="text-gray-400 text-sm">
          {user ? `Signed in as ${user.displayName}` : 'Sign in to save your recipes'}
        </p>
      </div>
    </div>
  );
}
