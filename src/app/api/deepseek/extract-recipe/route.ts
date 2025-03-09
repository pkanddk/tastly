import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeFromUrl } from '@/app/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    console.log("Extracting recipe from URL:", url);
    const recipeMarkdown = await extractRecipeFromUrl(url);
    console.log("Recipe extraction result type:", typeof recipeMarkdown);
    console.log("Recipe extraction result preview:", 
      typeof recipeMarkdown === 'string' 
        ? recipeMarkdown.substring(0, 100) 
        : JSON.stringify(recipeMarkdown).substring(0, 100));
    
    // If returning JSON
    if (typeof recipeMarkdown === 'object') {
      return NextResponse.json(recipeMarkdown);
    }

    // If returning plain text
    return new NextResponse(recipeMarkdown, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    console.error('Error in extract-recipe API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 