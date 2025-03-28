"use client";

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const WelcomeBar = () => {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't show welcome bar on auth pages
  if (pathname === '/auth') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 z-[9999] h-[52px] flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
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
  );
};

export default WelcomeBar; 