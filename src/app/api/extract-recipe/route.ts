import { NextRequest, NextResponse } from 'next/server';
import { extractRecipe, extractRecipeWithDeepSeekMobile } from '@/app/lib/server/recipeExtractor';
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
    
    let recipe;
    
    try {
      if (isMobile) {
        // Use the optimized mobile implementation for mobile devices
        console.log("Using mobile-optimized DeepSeek extraction");
        recipe = await extractRecipeWithDeepSeekMobile(url);
      } else {
        // Use the regular DeepSeek implementation for desktop
        console.log("Using regular DeepSeek extraction");
        
        // Initialize DeepSeek client
        const openai = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY || '',
          baseURL: 'https://api.deepseek.com',
        });
        
        const completion = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "Extract recipes from URLs. Format as markdown with # Title, ## Ingredients as a list, and ## Instructions as numbered steps."
            },
            {
              role: "user",
              content: `Extract the complete recipe from this URL: ${url}`
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          stream: false
        });
        
        const content = completion.choices[0].message.content || '';
        
        // Parse the markdown content
        const titleMatch = content.match(/# (.*)/);
        const title = titleMatch ? titleMatch[1] : url.split('/').pop() || 'Recipe';
        
        const ingredientsMatch = content.match(/## Ingredients\s*([\s\S]*?)(?=##|$)/);
        const ingredients = ingredientsMatch 
          ? ingredientsMatch[1].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
          : [];
        
        const instructionsMatch = content.match(/## Instructions\s*([\s\S]*?)(?=##|$)/);
        const instructions = instructionsMatch
          ? instructionsMatch[1].trim().split('\n').map(i => i.replace(/^\d+\.\s*/, '').trim()).filter(i => i)
          : [];
        
        recipe = {
          title,
          ingredients,
          instructions,
          markdown: content,
          original: content,
          method: 'deepseek',
          url
        };
      }
    } catch (deepseekError) {
      console.error("DeepSeek extraction failed:", deepseekError);
      
      // Fall back to the simple extraction method
      console.log("Falling back to simple extraction");
      recipe = await extractRecipe(url, isMobile);
    }
    
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
    
  } catch (error: any) {
    console.error('Recipe extraction error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Recipe extraction timed out' }, { status: 408 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to extract recipe' }, { status: 500 });
  }
} 