import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Fetch the HTML content from the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 500 });
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try to find an image in the following order:
    // 1. Open Graph image
    // 2. Twitter image
    // 3. Schema.org Recipe image
    // 4. First large image in the content
    
    // Check for Open Graph image
    let imageUrl = $('meta[property="og:image"]').attr('content');
    
    // Check for Twitter image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content');
    }
    
    // Check for Schema.org Recipe image
    if (!imageUrl) {
      const schemaScript = $('script[type="application/ld+json"]').text();
      if (schemaScript) {
        try {
          const schemas = JSON.parse(schemaScript);
          const findRecipeImage = (obj: any): string | null => {
            if (!obj) return null;
            
            if (Array.isArray(obj)) {
              for (const item of obj) {
                const found = findRecipeImage(item);
                if (found) return found;
              }
            } else if (typeof obj === 'object') {
              if (obj['@type'] === 'Recipe' && obj.image) {
                return typeof obj.image === 'string' ? obj.image : 
                       Array.isArray(obj.image) ? obj.image[0] : 
                       obj.image.url || null;
              }
              
              for (const key in obj) {
                const found = findRecipeImage(obj[key]);
                if (found) return found;
              }
            }
            
            return null;
          };
          
          imageUrl = findRecipeImage(schemas);
        } catch (e) {
          console.error('Error parsing schema.org data:', e);
        }
      }
    }
    
    // Find first large image in content as fallback
    if (!imageUrl) {
      $('img').each((i, img) => {
        const src = $(img).attr('src');
        const width = parseInt($(img).attr('width') || '0', 10);
        const height = parseInt($(img).attr('height') || '0', 10);
        
        if (src && (width > 300 || height > 300)) {
          imageUrl = src;
          return false; // break the loop
        }
      });
    }
    
    // Make sure the image URL is absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = new URL(imageUrl, url).toString();
    }
    
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error extracting image:', error);
    return NextResponse.json({ error: 'Failed to extract image' }, { status: 500 });
  }
} 