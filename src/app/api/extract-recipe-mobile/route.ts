import { NextRequest, NextResponse } from 'next/server';

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
    
    // Return a simple message with the URL in the structured format
    return NextResponse.json({
      markdown: `# Recipe from: ${validatedUrl}\n\nWe're currently optimizing our mobile recipe extraction.\nPlease try using our desktop version for full recipe details,\nor visit the original website directly.`,
      original: null
    });
    
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