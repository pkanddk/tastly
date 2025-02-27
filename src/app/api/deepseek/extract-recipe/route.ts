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
    
    const recipeMarkdown = await extractRecipeFromUrl(url);
    
    // Return the markdown content directly as text
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