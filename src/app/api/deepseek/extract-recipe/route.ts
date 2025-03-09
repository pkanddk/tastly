import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeWithAI, extractRecipeSimple } from '@/app/lib/server/recipeExtractor';

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
    
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));
    console.log("Request body:", { url, isMobile, debug });
    
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
      console.log("Validated URL:", validatedUrl);
      console.log("URL validation result:", {
        original: url,
        validated: validatedUrl,
        protocol: new URL(validatedUrl).protocol,
        hostname: new URL(validatedUrl).hostname,
        pathname: new URL(validatedUrl).pathname
      });
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // If debug mode is enabled, return detailed information
    if (debug) {
      return NextResponse.json({
        message: "Debug mode enabled",
        requestInfo: {
          url: validatedUrl,
          isMobile,
          userAgent: userAgent.substring(0, 100),
          headers: Object.fromEntries(request.headers.entries()),
        }
      });
    }
    
    try {
      // For mobile, use the simple extraction to avoid timeouts
      if (isMobile) {
        try {
          console.log("Using simple extraction for mobile");
          const simpleRecipe = await extractRecipeSimple(validatedUrl);
          
          return new NextResponse(simpleRecipe, {
            headers: { 'Content-Type': 'text/plain' }
          });
        } catch (simpleError) {
          console.error("Simple extraction failed:", simpleError);
          
          // Fall back to the timeout message
          return new NextResponse(`
Recipe from: ${validatedUrl}

We couldn't extract the full recipe details automatically.
Please visit the original website for the complete recipe.

Error: ${simpleError instanceof Error ? simpleError.message : 'Unknown error'}
          `, {
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }
      
      // For desktop, use the AI extraction with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);
      
      try {
        const recipeData = await extractRecipeWithAI(validatedUrl, false);
        clearTimeout(timeoutId);
        
        // Return JSON if it's an object, otherwise plain text
        if (typeof recipeData === 'object') {
          return NextResponse.json(recipeData);
        } else {
          return new NextResponse(recipeData, {
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      } catch (abortError) {
        if (abortError.name === 'AbortError') {
          console.error("Extraction timed out");
          // Return a timeout-specific message
          if (isMobile) {
            return new NextResponse(`
Recipe from: ${validatedUrl}

The recipe extraction is taking longer than expected.
Please try again or visit the original website for the recipe.
            `, {
              headers: { 'Content-Type': 'text/plain' }
            });
          }
        }
        throw abortError; // Re-throw other errors
      }
    } catch (error) {
      console.error("Extraction error:", error);
      
      // Provide a fallback for failed extractions
      if (isMobile) {
        return new NextResponse(`
Recipe from: ${validatedUrl}

We couldn't extract the full recipe details automatically.
Please visit the original website for the complete recipe.

Error: ${error instanceof Error ? error.message : 'Unknown error'}
        `, {
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          url: validatedUrl
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