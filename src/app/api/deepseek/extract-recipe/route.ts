import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeFromUrl, extractRecipeFromUrlMobile } from '@/app/lib/deepseek';

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
    
    if (isMobile) {
      console.log("Processing mobile request differently");
      
      try {
        // Try the mobile-specific extraction first
        try {
          const recipeText = await extractRecipeFromUrlMobile(validatedUrl);
          
          return new NextResponse(recipeText, {
            headers: {
              'Content-Type': 'text/plain'
            }
          });
        } catch (mobileError) {
          console.error("Mobile extraction failed, trying fallback:", mobileError);
          
          // Fallback to a simpler approach
          const fallbackRecipe = `
Recipe from: ${validatedUrl}

We couldn't extract the full recipe details automatically.
Please visit the original website for the complete recipe.

You can try again with a different URL or check our other features.
          `;
          
          return new NextResponse(fallbackRecipe, {
            headers: {
              'Content-Type': 'text/plain'
            }
          });
        }
      } catch (error) {
        console.error("All mobile extraction attempts failed:", error);
        
        // Return a more detailed error for debugging
        return NextResponse.json(
          { 
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            stack: error instanceof Error ? error.stack : undefined,
            url: validatedUrl
          },
          { status: 500 }
        );
      }
    }
    
    // Regular processing for desktop
    console.log("Extracting recipe from URL:", validatedUrl);
    const recipeMarkdown = await extractRecipeFromUrl(validatedUrl);
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