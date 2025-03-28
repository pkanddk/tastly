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

  return (
    <div className="container mx-auto px-4">
      <GroceryList
        ingredients={currentIngredients}
        recipeName={currentRecipeName}
        isPage={true}
      />
    </div>
  );
} 