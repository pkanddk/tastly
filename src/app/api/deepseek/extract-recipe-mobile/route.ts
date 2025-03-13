import { NextRequest, NextResponse } from 'next/server';
import { extractRecipeWithDeepSeekMobile } from '@/app/lib/server/recipeExtractor';

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
    
    // Perform actual mobile extraction
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    try {
      const recipeContent = await extractRecipeWithDeepSeekMobile(validatedUrl);
      clearTimeout(timeoutId);
      
      return NextResponse.json({ 
        markdown: recipeContent.markdown,
        original: recipeContent.original
      });
      
    } catch (error) {
      console.error("Mobile extraction error:", error);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Mobile extraction timed out',
            markdown: `# Recipe from: ${validatedUrl}\n\nWe're having trouble with mobile extraction.\nPlease try the desktop version or visit the original site.`
          },
          { status: 408 }
        );
      }
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Mobile extraction failed',
          markdown: `# Recipe from: ${validatedUrl}\n\nWe're having trouble with mobile extraction.\nPlease try the desktop version or visit the original site.`
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in mobile recipe extraction:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        markdown: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
} 