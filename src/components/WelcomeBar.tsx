"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { signInWithGoogle, signOut } from '@/lib/firebase/firebaseUtils';

export default function WelcomeBar() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
          Welcome to Tastly
        </Link>
        
        <div>
          {loading ? (
            <span className="text-gray-400">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="text-white">
                <span className="font-medium">Welcome back, </span>
                <span className="font-bold text-blue-400">{user.displayName?.split(' ')[0] || 'there'}</span>
              </div>
              <div className="h-6 border-l border-gray-600"></div>
              
              <Link href="/recipe-extractor" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Extract Recipe
              </Link>
              
              <Link href="/my-recipes" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                My Recipes
              </Link>
            </div>
          ) : (
            <span className="text-gray-400">
              Not signed in
            </span>
          )}
        </div>

        <div>
          {user ? (
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  const success = await signInWithGoogle();
                  // No need to do anything on success, AuthContext will update
                } catch (error) {
                  // Error is already logged in the signInWithGoogle function
                }
              }}
              type="button"
              className="text-sm text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded transition-colors flex items-center gap-2 touch-manipulation"
            >
              <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              <span className="pointer-events-none">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
} 