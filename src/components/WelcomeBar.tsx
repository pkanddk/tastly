"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { signOut, signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function WelcomeBar() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  // Check if we're not on the home page to show back button
  const showBackButton = pathname !== '/';
  
  // Handle sign out with redirect
  const handleSignOut = () => {
    signOut(() => {
      router.push('/');
    });
  };
  
  return (
    <nav className="bg-gray-900 border-b border-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button 
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white p-1"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
            Tastly
          </Link>
        </div>
        
        {/* Center area - only for signed in users */}
        <div className="flex-1 flex justify-center">
          {user && !loading && (
            <div className="flex items-center gap-4">
              <div className="text-white hidden sm:block">
                <span className="font-medium">Welcome back, </span>
                <span className="font-bold text-blue-400">{user.displayName?.split(' ')[0] || 'there'}</span>
              </div>
              
              <div className="h-6 border-l border-gray-600 hidden sm:block"></div>
              
              <Link href="/recipe-extractor" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Extract Recipe</span>
              </Link>
              
              <Link href="/my-recipes" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="hidden sm:inline">My Recipes</span>
              </Link>
            </div>
          )}
        </div>
        
        {/* Right side - sign in/out */}
        <div>
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="text-sm text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
} 