import { NextRequest, NextResponse } from 'next/server';
import { extractRecipe, extractRecipeWithDeepSeekOptimized } from '@/app/lib/server/recipeExtractor';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    console.log("extract-recipe API route called with URL:", req.url);
    
    // Log user agent and mobile header
    const userAgent = req.headers.get('user-agent') || '';
    const isMobileHeader = req.headers.get('X-Is-Mobile') || 'false';
    console.log("Request user agent:", userAgent);
    console.log("Is mobile header:", isMobileHeader);
    
    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || 
                     isMobileHeader === 'true';
    console.log("Detected as mobile:", isMobile);
    
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Set a timeout for the entire operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    try {
      // Use the optimized extraction with timeout
      console.log("Using optimized extraction with timeout");
      const extractPromise = extractRecipeWithDeepSeekOptimized(url, isMobile);
      
      // Race the extraction against the timeout
      const recipe = await Promise.race([
        extractPromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Extraction timed out')), 25000);
        })
      ]);
      
      clearTimeout(timeoutId);
      
      // Check if the request is using HTTPS
      if (req.headers.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
        // Redirect to HTTPS
        return NextResponse.redirect(
          `https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`,
          301
        );
      }
      
      return NextResponse.json(recipe, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
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
        url
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
        url
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      title: "Recipe Extraction Failed",
      ingredients: ["Could not extract ingredients due to an error"],
      instructions: ["Please try again later or manually copy the recipe"],
      markdown: "# Recipe Extraction Failed\n\nThe recipe extraction failed. Please try again later or manually copy the recipe.",
      method: 'error-fallback',
      url
    }, { status: 200 });
  }
} 