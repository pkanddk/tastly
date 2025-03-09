import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

// Initialize OpenAI client with the Deepseek API
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
});

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
    
    // Set a reasonable timeout for the fetch operation (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Fetch the page content with timeout protection
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        // Pretend to be a regular browser to avoid anti-scraping measures
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use Cheerio to parse the HTML
    const $ = cheerio.load(html);
    
    // Remove script tags, style tags, and comments to clean up the HTML
    $('script, style, comment').remove();
    
    // Get the page title
    const title = $('title').text() || $('h1').first().text() || 'Recipe';
    
    // Extract the main content
    const bodyContent = $('body').text();
    
    // Prepare the prompt for Deepseek
    const prompt = `
    You are a helpful assistant that extracts recipes from web pages. I'll provide you with the HTML content of a recipe page, and I need you to extract the recipe in a clean, structured markdown format.

    Please include:
    - Recipe title as a level 1 heading
    - Ingredients as a bulleted list under a level 2 "Ingredients" heading
    - Instructions as a numbered list under a level 2 "Instructions" heading
    - Cooking time and servings information under a level 2 "Cooking Time and Servings" heading
    - Any notes or tips under a level 2 "Notes" heading

    Format the recipe in clean markdown. Don't include any explanations or commentary outside the recipe itself.

    Here's the content from the page with title "${title}":

    ${bodyContent.substring(0, 15000)} // Limit content to avoid token limits
    `;
    
    // Fix the scope issue with the completion variable
    let completion;
    try {
      console.log("About to call DeepSeek API with prompt length:", prompt.length);
      completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that extracts recipes from web pages and formats them in clean markdown. DO NOT wrap your response in markdown code blocks (```). DO NOT use triple backticks or triple quotes at all. Just provide the clean markdown content directly."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 4000,
        stream: false,
      });
      console.log("DeepSeek API response status:", "Success");
      console.log("DeepSeek API response length:", completion.choices[0].message.content?.length || 0);
    } catch (apiError) {
      console.error("DeepSeek API call failed:", apiError.message);
      console.error("DeepSeek API error details:", apiError);
      
      // Return a properly formatted JSON response for API errors
      return NextResponse.json({ 
        error: `DeepSeek API error: ${apiError.message || 'Unknown error'}` 
      }, { status: 500 });
    }
    
    // Now completion is accessible here
    const recipeContent = completion?.choices[0]?.message?.content || '';

    // Direct fix for the specific pattern
    const cleanedContent = recipeContent.replace(/^```markdown\s*/i, '').replace(/```$/m, '').replace(/'''/g, '');

    // Check if the request is using HTTPS
    if (req.headers.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
      // Redirect to HTTPS
      return NextResponse.redirect(
        `https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`,
        301
      );
    }

    return NextResponse.json({ 
      markdown: cleanedContent,
      original: recipeContent
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