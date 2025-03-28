"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { HomeIcon, DocumentTextIcon, BookOpenIcon, BeakerIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useGroceryList } from '@/lib/contexts/GroceryListContext';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';

// Navigation items definition
const NAV_ITEMS = [
  { href: '/', icon: HomeIcon, label: 'Home' },
  { href: '/my-recipes', icon: BookOpenIcon, label: 'My Recipes' },
  { href: '/replication-station', icon: BeakerIcon, label: 'Replication Station' }
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, loading, signOut } = useAuth();
  const { openGroceryList } = useGroceryList();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      // Redirect to the homepage after sign out
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error("Error signing in:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop - appears when menu is open (on all devices) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar panel */}
      <div 
        className={`fixed z-40 top-0 left-0 h-full bg-[#10131a] border-r border-gray-800 pt-16 pb-20 transform transition-transform duration-300 ease-in-out shadow-lg
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          w-[280px]`}
      >
        <div className="px-4 py-2 h-full flex flex-col overflow-y-auto">
          {user ? (
            <>
              {/* Logged in content */}
              <div className="mb-6 flex items-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mr-3">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-white">
                    {user.displayName || "User"}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-[180px]">
                    {user.email}
                  </div>
                </div>
              </div>

              <nav className="space-y-1 flex-grow">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      pathname === item.href
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`}
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                <button 
                  onClick={() => {
                    openGroceryList();
                    onClose();
                  }}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-3" />
                  <span>Grocery List</span>
                </button>
              </nav>

              {/* Empty flex-grow div to push sign out to bottom */}
              <div className="flex-grow"></div>

              {/* Sign out button placed at the bottom */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors border-t border-gray-800 pt-4 mt-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Logged out content */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center flex items-center justify-center"
                >
                  {isSigningIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In with Google</span>
                  )}
                </button>
                
                <div className="pt-6 mt-2 border-t border-gray-800">
                  <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                          pathname === item.href
                            ? "bg-blue-600 text-white"
                            : "text-gray-300 hover:text-white hover:bg-gray-800"
                        }`}
                        onClick={onClose}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
} 