import { NextRequest, NextResponse } from 'next/server';
import { extractRecipe } from '@/app/lib/server/recipeExtractor';

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
    
    // Use only the simplified extraction method
    console.log("Using simplified extraction method for:", url);
    const recipe = await extractRecipe(url, isMobile);
    
    // Check if the request is using HTTPS
    if (req.headers.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
      // Redirect to HTTPS
      return NextResponse.redirect(
        `https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`,
        301
      );
    }
    
    return NextResponse.json({ 
      ...recipe,
      method: 'simple'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
  } catch (error: any) {
    console.error('Recipe extraction error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Recipe extraction timed out' }, { status: 408 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to extract recipe' }, { status: 500 });
  }
} 