import { getRecipeFromCache, cacheRecipeUrl, saveRecipe as firebaseSaveRecipe } from "@/lib/firebase/firebaseUtils";
import { Recipe } from "@/app/lib/types";

// Simple in-memory cache for recipes
const recipeCache = new Map<string, any>();

export function getCachedRecipeByUrl(url: string) {
  // Try memory cache first
  if (recipeCache.has(url)) {
    return recipeCache.get(url);
  }
  
  // Try localStorage
  try {
    const cached = localStorage.getItem(`recipe_${url}`);
    if (cached) {
      const recipe = JSON.parse(cached);
      recipeCache.set(url, recipe); // Update memory cache
      return recipe;
    }
  } catch (e) {
    console.error('Failed to retrieve recipe from localStorage:', e);
  }
  
  return null;
}

export async function saveRecipe(userId: string, recipe: Recipe) {
  // Save to Firebase
  return await firebaseSaveRecipe(userId, recipe);
} 