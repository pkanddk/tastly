"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function WelcomeBar() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-50 h-[52px]">
        <div className="bg-[#10131a] border-b border-gray-800 shadow-md h-full">
          <div className="h-full flex justify-between items-center px-4">
            {/* Menu button and welcome message or logo */}
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar}
                className="mr-3 hover:bg-gray-800 p-1 rounded-lg"
                aria-label="Toggle menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {user && !loading ? (
                <div className="font-medium text-white">
                  Welcome back, <span className="font-bold text-blue-400">{user.displayName?.split(' ')[0] || 'there'}</span>
                </div>
              ) : (
                <div className="text-xl font-bold text-white">
                  Tastly
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Empty space to push content below fixed header */}
      <div className="h-[52px]"></div>
    </>
  );
} 