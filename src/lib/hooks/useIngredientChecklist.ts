import { useState, useEffect } from 'react';

type ChecklistItems = Record<string, boolean>;

export function useIngredientChecklist(recipeId: string) {
  // We use localStorage to persist the checklist state
  const [checkedIngredients, setCheckedIngredients] = useState<ChecklistItems>({});
  
  // Load checklist from localStorage on mount
  useEffect(() => {
    const savedChecklist = localStorage.getItem(`recipe-checklist-${recipeId}`);
    if (savedChecklist) {
      try {
        setCheckedIngredients(JSON.parse(savedChecklist));
      } catch (e) {
        console.error("Error loading ingredient checklist:", e);
        // If there's an error, start with empty checklist
        setCheckedIngredients({});
      }
    }
  }, [recipeId]);
  
  // Save checklist to localStorage when it changes
  useEffect(() => {
    if (Object.keys(checkedIngredients).length > 0) {
      localStorage.setItem(`recipe-checklist-${recipeId}`, JSON.stringify(checkedIngredients));
    }
  }, [checkedIngredients, recipeId]);
  
  // Toggle an ingredient's checked state
  const toggleIngredient = (ingredient: string) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [ingredient]: !prev[ingredient]
    }));
  };
  
  // Check if an ingredient is checked
  const isIngredientChecked = (ingredient: string) => {
    return !!checkedIngredients[ingredient];
  };
  
  // Reset all checklist items
  const resetChecklist = () => {
    setCheckedIngredients({});
    localStorage.removeItem(`recipe-checklist-${recipeId}`);
  };
  
  return {
    toggleIngredient,
    isIngredientChecked,
    resetChecklist
  };
} 