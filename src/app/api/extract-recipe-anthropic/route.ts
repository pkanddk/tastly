import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
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
      // Use the AI SDK to call Anthropic
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.content[0].text;
      
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
        method: 'anthropic-mobile',
        url
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('Anthropic recipe extraction error:', error);
    
    return NextResponse.json({
      title: "Recipe Extraction Failed",
      ingredients: ["Could not extract ingredients"],
      instructions: ["Please try again later or manually copy the recipe"],
      markdown: "# Recipe Extraction Failed\n\nWe couldn't extract the recipe automatically. Please try again later or manually copy the recipe from the original website.",
      method: 'error-fallback',
      url
    }, { status: 200 });
  }
} 