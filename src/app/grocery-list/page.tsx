"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GroceryList from '@/components/GroceryList';
import { useGroceryList } from '@/app/lib/contexts/GroceryListContext';

export default function GroceryListPage() {
  const router = useRouter();
  const { currentIngredients, currentRecipeName } = useGroceryList();

  // Redirect to home if accessed on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      router.push('/');
    }
  }, [router]);

  // Prevent body scrolling on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900">
      <GroceryList
        ingredients={currentIngredients}
        recipeName={currentRecipeName}
        isPage={true}
      />
    </div>
  );
} 