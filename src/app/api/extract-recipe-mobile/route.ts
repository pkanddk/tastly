import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

// Initialize OpenAI client with the Deepseek API
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
});

export async function POST(request: NextRequest) {
  try {
    console.log("extract-recipe-mobile API route called");
    
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Validate the URL
    let validatedUrl;
    try {
      validatedUrl = new URL(url).toString();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    // Set a reasonable timeout for the fetch operation (8 seconds for mobile)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // Fetch the page content with timeout protection
    const response = await fetch(validatedUrl, { 
      signal: controller.signal,
      headers: {
        // Pretend to be a mobile browser
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`
      }, { status: 500 });
    }
    
    const html = await response.text();
    
    // Use Cheerio to parse the HTML
    const $ = cheerio.load(html);
    
    // Remove script tags, style tags, and comments to clean up the HTML
    $('script, style, comment').remove();
    
    // Get the page title
    const title = $('title').text() || $('h1').first().text() || 'Recipe';
    
    // Extract the main content - use a more focused approach for mobile
    const bodyContent = $('body').text();
    
    // Prepare a simpler prompt for mobile to reduce token usage
    const prompt = `
    Extract the recipe from this webpage with title "${title}". Format as markdown with:
    - Recipe title as a level 1 heading
    - Ingredients as a bulleted list
    - Instructions as a numbered list
    - Keep it concise for mobile viewing

    Content: ${bodyContent.substring(0, 10000)}
    `;
    
    // Call the DeepSeek API
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that extracts recipes from web pages and formats them in clean, concise markdown for mobile viewing. DO NOT use markdown code blocks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 2000, // Reduced for mobile
        stream: false,
      });
    } catch (apiError) {
      console.error("DeepSeek API call failed for mobile:", apiError.message);
      
      return NextResponse.json({ 
        error: `DeepSeek API error: ${apiError.message || 'Unknown error'}`
      }, { status: 500 });
    }
    
    const recipeContent = completion?.choices[0]?.message?.content || '';
    const cleanedContent = recipeContent.replace(/^```markdown\s*/i, '').replace(/```$/m, '').replace(/'''/g, '');
    
    return NextResponse.json({ 
      markdown: cleanedContent,
      original: recipeContent
    });
    
  } catch (error) {
    console.error('Error in mobile recipe extraction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 