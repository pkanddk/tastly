import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeFromUrl } from '@/app/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { url, isMobile, debug } = await request.json();
    const userAgent = request.headers.get('user-agent') || '';
    const isMobileHeader = request.headers.get('X-Is-Mobile');
    
    console.log("Request info:", { 
      url, 
      isMobile, 
      isMobileHeader,
      debug,
      userAgent: userAgent.substring(0, 100) 
    });
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // If debug mode is enabled, return detailed information
    if (debug) {
      return NextResponse.json({
        message: "Debug mode enabled",
        requestInfo: {
          url,
          isMobile,
          userAgent: userAgent.substring(0, 100),
          headers: Object.fromEntries(request.headers.entries()),
        }
      });
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