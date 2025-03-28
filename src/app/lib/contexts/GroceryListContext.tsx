"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import GroceryList from '@/components/GroceryList';
import { usePathname, useRouter } from 'next/navigation';

interface GroceryListContextType {
  isOpen: boolean;
  openGroceryList: () => void;
  closeGroceryList: () => void;
  addRecipeToGroceryList: (ingredients: string[], recipeName: string) => void;
  currentIngredients: string[];
  currentRecipeName: string;
}

// Create the context with a default value
const GroceryListContext = createContext<GroceryListContextType>({
  isOpen: false,
  openGroceryList: () => {},
  closeGroceryList: () => {},
  addRecipeToGroceryList: () => {},
  currentIngredients: [],
  currentRecipeName: '',
});

// Create a provider component
export const GroceryListProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentIngredients, setCurrentIngredients] = useState<string[]>([]);
  const [currentRecipeName, setCurrentRecipeName] = useState<string>('');
  const pathname = usePathname();
  const router = useRouter();

  // Close grocery list when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const openGroceryList = () => {
    // On mobile, use URL state to handle the grocery list
    if (window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      router.push('/grocery-list');
    } else {
      setIsOpen(true);
    }
  };

  const closeGroceryList = () => {
    document.body.style.overflow = '';
    if (window.innerWidth < 768) {
      router.back();
    } else {
      setIsOpen(false);
    }
  };
  
  const addRecipeToGroceryList = (ingredients: string[], recipeName: string) => {
    setCurrentIngredients(ingredients);
    setCurrentRecipeName(recipeName);
    openGroceryList();
  };

  return (
    <GroceryListContext.Provider 
      value={{ 
        isOpen, 
        openGroceryList, 
        closeGroceryList, 
        addRecipeToGroceryList,
        currentIngredients,
        currentRecipeName
      }}
    >
      {children}
      {isOpen && (
        <GroceryList 
          ingredients={currentIngredients} 
          recipeName={currentRecipeName}
          onClose={closeGroceryList} 
        />
      )}
    </GroceryListContext.Provider>
  );
};

// Create a hook to use the grocery list context
export const useGroceryList = () => useContext(GroceryListContext); 