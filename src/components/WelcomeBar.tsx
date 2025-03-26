"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import { useGroceryList } from '@/lib/contexts/GroceryListContext';
import Link from 'next/link';
import { signOut, signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function WelcomeBar() {
  const { user, loading } = useAuth();
  const { openGroceryList } = useGroceryList();
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
    <header className="fixed top-0 left-0 right-0 w-full z-50">
      {/* Top tier - Welcome and sign out */}
      <div className="bg-gray-900 border-b border-gray-800 shadow-md backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center">
          {/* Left side - Back button and dynamic text */}
          <div className="flex items-center gap-2">
            {user && !loading ? (
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Welcome back, <span className="font-bold text-blue-400">{user.displayName?.split(' ')[0] || 'there'}</span></span>
              </button>
            ) : (
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 hover:text-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
                  Tastly
                </span>
              </button>
            )}
          </div>
          
          {/* Right side - sign in/out */}
          <div>
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="text-sm text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom tier - Navigation links */}
      {user && !loading && (
        <nav className="bg-gray-800 border-b border-gray-700 shadow-sm backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-2">
            <div className="flex items-center justify-between sm:justify-center overflow-x-auto py-1 gap-1 sm:gap-4">
              <Link href="/" className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </Link>
              
              <button 
                onClick={openGroceryList}
                className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Grocery List</span>
              </button>
              
              <Link href="/recipe-extractor" className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Reader</span>
              </Link>
              
              <Link href="/my-recipes" className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>My Recipes</span>
              </Link>
              
              <Link href="/replication-station" className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span>Replication</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
} 