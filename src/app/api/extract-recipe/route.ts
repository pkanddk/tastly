import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeWithAI } from '@/app/lib/server/recipeExtractor';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate the URL
    let validatedUrl;
    try {
      validatedUrl = new URL(url).toString();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    try {
      // Use the AI extraction with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);
      
      try {
        const recipeContent = await extractRecipeWithAI(validatedUrl, false);
        clearTimeout(timeoutId);
        
        // Clean markdown formatting tags
        const cleanedContent = typeof recipeContent === 'string' 
          ? recipeContent
              .replace(/^```markdown\s*/i, '')
              .replace(/```$/m, '')
              .replace(/'''/g, '')
          : recipeContent;
        
        // Return a structured JSON response
        return NextResponse.json({ 
          markdown: cleanedContent,
          original: recipeContent
        });
      } catch (abortError: any) {
        if (abortError.name === 'AbortError') {
          console.error("Extraction timed out");
          // Return a timeout-specific message
          return NextResponse.json(
            { 
              error: 'Recipe extraction timed out',
              markdown: `# Recipe from: ${validatedUrl}\n\nThe recipe extraction is taking longer than expected.\nPlease try again or visit the original website for the recipe.`
            },
            { status: 408 }
          );
        }
        throw abortError; // Re-throw other errors
      }
    } catch (error) {
      console.error("Extraction error:", error);
      
      // Provide a fallback for failed extractions
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to extract recipe',
          markdown: `# Recipe from: ${validatedUrl}\n\nWe couldn't extract the full recipe details automatically.\nPlease visit the original website for the complete recipe.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in extract-recipe API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 