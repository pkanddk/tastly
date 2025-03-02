"use client";

import { useEffect, useState } from 'react';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';

export default function MobileSignIn() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      console.log("Mobile sign-in button clicked");
      
      // Store the current URL so we can return to it after auth
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_return_url', window.location.pathname);
      }
      
      await signInWithGoogle();
      // The page will redirect, so code after this won't execute on mobile
    } catch (error) {
      console.error("Mobile sign-in error:", error);
      setIsSigningIn(false);
    }
  };
  
  // Check if we need to redirect after auth
  useEffect(() => {
    const returnUrl = localStorage.getItem('auth_return_url');
    if (returnUrl) {
      localStorage.removeItem('auth_return_url');
      // Only redirect if we're not already on that page
      if (window.location.pathname !== returnUrl) {
        router.push(returnUrl);
      }
    }
  }, [router]);
  
  return (
    <button
      onClick={handleSignIn}
      disabled={isSigningIn}
      type="button"
      className="text-sm text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded transition-colors flex items-center gap-2 touch-manipulation"
    >
      <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
      </svg>
      <span className="pointer-events-none">
        {isSigningIn ? "Signing in..." : "Sign In"}
      </span>
    </button>
  );
} 