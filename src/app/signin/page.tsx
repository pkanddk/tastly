"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import Image from 'next/image';

export default function SignIn() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Redirect if user is already signed in
    if (mounted && !loading && user) {
      router.push('/');
    }
  }, [user, loading, mounted, router]);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
      // Redirect will happen automatically via the useEffect above
    } catch (error) {
      console.error('Sign in error:', error);
      setSigningIn(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 max-w-md mx-auto">
      <div className="w-full bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Tastly</h1>
          <p className="text-gray-400">Sign in to access your recipes</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center bg-white text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors relative"
          >
            {signingIn ? (
              <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
                width={20}
                height={20}
                className="mr-2"
                unoptimized={true}
              />
            )}
            <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          <div className="flex items-center justify-center pt-4 text-sm">
            <span className="text-gray-400">Don't have an account?</span>
            <Link href="/signup" className="ml-1 text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 