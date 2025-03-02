"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { signOut, signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useEffect, useState } from 'react';
import MobileSignIn from './MobileSignIn';

export default function WelcomeBar() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // This ensures the component is only rendered client-side
  useEffect(() => {
    setMounted(true);
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    
    // Add resize listener to update mobile state
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Don't render anything during SSR or loading
  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        {/* Logo/Title - Smaller on mobile */}
        <Link href="/" className="text-lg sm:text-xl font-bold text-white hover:text-blue-400 transition-colors">
          {isMobile ? 'Tastly' : 'Welcome to Tastly'}
        </Link>
        
        {/* Mobile Menu Button */}
        {isMobile && user && (
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white p-2 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        )}
        
        {/* Desktop Navigation */}
        {!isMobile && (
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
              <span></span>
            )}
          </div>
        )}

        {/* Sign In/Out Button */}
        <div>
          {user ? (
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
            >
              Sign Out
            </button>
          ) : (
            isMobile ? (
              <MobileSignIn />
            ) : (
              <button
                onClick={() => {
                  console.log("Desktop sign in button clicked");
                  signInWithGoogle()
                    .then(success => console.log("Sign in result:", success))
                    .catch(error => console.error("Sign in error:", error));
                }}
                type="button"
                className="text-sm text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded transition-colors flex items-center gap-2 touch-manipulation"
              >
                <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                <span className="pointer-events-none">Sign In</span>
              </button>
            )
          )}
        </div>
      </div>
      
      {/* Mobile Menu - Slide down when open */}
      {isMobile && user && (
        <div className={`bg-gray-800 overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-60' : 'max-h-0'}`}>
          <div className="px-4 py-3 space-y-3">
            <div className="text-white text-sm">
              <span>Welcome back, </span>
              <span className="font-bold text-blue-400">{user.displayName?.split(' ')[0] || 'there'}</span>
            </div>
            
            <Link href="/recipe-extractor" 
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-2"
              onClick={() => setMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Extract Recipe
            </Link>
            
            <Link href="/my-recipes" 
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-2"
              onClick={() => setMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              My Recipes
            </Link>
          </div>
        </div>
      )}
    </header>
  );
} 