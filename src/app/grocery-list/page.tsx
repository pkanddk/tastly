"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GroceryList from '@/components/GroceryList';
import { useGroceryList } from '@/lib/contexts/GroceryListContext';

export default function GroceryListPage() {
  const router = useRouter();
  const { currentIngredients, currentRecipeName } = useGroceryList();

  // Redirect to home if accessed on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      router.push('/');
    }
  }, [router]);

  const handleClose = () => {
    router.back();
  };

  return (
    <GroceryList
      ingredients={currentIngredients}
      recipeName={currentRecipeName}
      onClose={handleClose}
    />
  );
} 