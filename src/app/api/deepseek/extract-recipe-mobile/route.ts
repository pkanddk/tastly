import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return new NextResponse("URL is required", { status: 400 });
    }
    
    // Validate the URL
    let validatedUrl;
    try {
      validatedUrl = new URL(url).toString();
    } catch (e) {
      return new NextResponse("Invalid URL format", { status: 400 });
    }
    
    // Return a simple fallback message
    return new NextResponse(`
# Recipe from: ${validatedUrl}

We're currently experiencing high demand.
Please try again later or visit the original website for the recipe.
    `, {
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    console.error('Error in mobile recipe extraction:', error);
    return new NextResponse(
      `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 