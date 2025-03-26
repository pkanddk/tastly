import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
    
    // Create a simple prompt for recipe extraction
    const prompt = `Extract the recipe from this URL: ${url}. Format as markdown with:
# Title
## Ingredients
- ingredient 1
- ingredient 2
## Instructions
1. step 1
2. step 2`;
    
    // Set up a timeout for the API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });
      
      // Make the API call with the timeout
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You extract recipes from URLs into a clean, formatted markdown."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        stream: false
      });
      
      clearTimeout(timeoutId);
      
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
      
      return NextResponse.json({
        title,
        ingredients,
        instructions,
        markdown: content,
        original: content,
        method: 'openai-gpt4o-mini-mobile',
        url
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('OpenAI recipe extraction error:', error);
    
    // Get the URL from the request if possible, otherwise use a placeholder
    let requestUrl = '#'; // Default placeholder
    try {
      if (req.body) {
        const body = await req.json().catch(() => ({}));
        if (body.url) requestUrl = body.url;
      }
    } catch (e) {
      console.error('Error extracting URL from request:', e);
    }
    
    return NextResponse.json({
      title: "Recipe Extraction Failed",
      ingredients: ["Could not extract ingredients"],
      instructions: ["Please try again later or manually copy the recipe"],
      markdown: `# Recipe Extraction Failed\n\nWe couldn't extract the recipe automatically. Please try again later, or [View the original recipe here](${requestUrl}).`,
      method: 'error-fallback',
      url: requestUrl
    }, { status: 200 });
  }
} 