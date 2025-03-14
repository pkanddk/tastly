import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeWithDeepSeekOptimized } from '@/app/lib/server/recipeExtractor';

// This is the correct way to set the runtime in Next.js App Router
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    console.log("extract-recipe API route called");
    
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Set a shorter timeout for the extraction
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      console.log("Starting recipe extraction for:", url);
      const extractPromise = extractRecipeWithDeepSeekOptimized(url, false);

      // Race the extraction against the timeout
      const recipe = await Promise.race([
        extractPromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Extraction timed out')), 15000);
        })
      ]);

      clearTimeout(timeoutId);
      console.log("Recipe extraction successful");
      
      return NextResponse.json(recipe);
    } catch (extractionError) {
      clearTimeout(timeoutId);
      console.error("Extraction error:", extractionError);
      
      // Return a basic fallback result
      return NextResponse.json({
        title: "Recipe Extraction Failed",
        ingredients: ["Could not extract ingredients due to timeout"],
        instructions: ["Please try again later or manually copy the recipe"],
        markdown: "# Recipe Extraction Failed\n\nThe recipe extraction timed out. Please try again later or manually copy the recipe.",
        original: "Extraction failed",
        method: 'error-fallback',
        url: url
      }, { status: 200 });
    }
    
  } catch (error: any) {
    console.error('Recipe extraction error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        title: "Recipe Extraction Timed Out",
        ingredients: ["Could not extract ingredients due to timeout"],
        instructions: ["Please try again later or manually copy the recipe"],
        markdown: "# Recipe Extraction Timed Out\n\nThe recipe extraction timed out. Please try again later or manually copy the recipe.",
        method: 'timeout-fallback',
        url: url
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      title: "Recipe Extraction Failed",
      ingredients: ["Could not extract ingredients due to an error"],
      instructions: ["Please try again later or manually copy the recipe"],
      markdown: "# Recipe Extraction Failed\n\nThe recipe extraction failed. Please try again later or manually copy the recipe.",
      method: 'error-fallback',
      url: url
    }, { status: 200 });
  }
} 