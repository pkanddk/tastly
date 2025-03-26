export interface Recipe {
  title?: string;
  ingredients?: string[];
  instructions?: string[];
  markdown: string;
  original?: string;
  method?: string;
  url?: string;
  ingredientCategories?: Record<string, string[]> | null;
  cookingInfo?: string[] | null;
  notes?: string[] | null;
  nutrition?: string[] | null;
  storage?: string[] | null;
  reheating?: string[] | null;
  makeAhead?: string[] | null;
  dietaryInfo?: string[] | null;
} 