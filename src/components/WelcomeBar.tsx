"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const WelcomeBar = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't show welcome bar on auth pages
  if (pathname === '/auth') {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 z-[9999] h-[52px] flex items-center px-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="hover:bg-gray-800 p-1 rounded-lg"
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="text-2xl font-bold text-white">
              Tastly
            </Link>
          </div>
          {user && (
            <div className="text-white">
              Welcome back, <span className="text-blue-400">{user.displayName?.split(' ')[0] || 'User'}</span>
            </div>
          )}
        </div>
      </div>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
};

export default WelcomeBar; 