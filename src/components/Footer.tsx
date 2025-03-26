'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useGroceryList } from '@/lib/contexts/GroceryListContext';

export default function Footer() {
  const pathname = usePathname();
  const { openGroceryList } = useGroceryList();
  
  return (
    <footer className="w-full py-6 px-4 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex items-center space-x-6 mb-4">
          <Link 
            href="/" 
            className={`text-sm transition-colors ${pathname === '/' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            home
          </Link>
          
          <button
            onClick={openGroceryList}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            grocery list
          </button>
          
          <Link 
            href="/recipe-extractor" 
            className={`text-sm transition-colors ${pathname === '/recipe-extractor' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            reader
          </Link>
          
          <Link 
            href="/my-recipes" 
            className={`text-sm transition-colors ${pathname === '/my-recipes' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            my recipes
          </Link>
          
          <Link 
            href="/replication-station" 
            className={`text-sm transition-colors ${pathname === '/replication-station' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            replication station
          </Link>
        </div>
        
        <p className="text-gray-500 text-xs font-light tracking-wide">
          a pk and dk app.
        </p>
      </div>
    </footer>
  );
} 