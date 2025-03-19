import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// This is the correct way to set the runtime in Next.js App Router
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  let requestUrl = ''; // Declare at top level to fix linter error
  
  try {
    const { url } = await req.json();
    requestUrl = url; // Store for error handling
    
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
    
    // Set up a timeout for the API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds for desktop
    
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
            content: `You are a recipe extraction expert. Extract recipes and format them in a consistent markdown structure.
Always include these sections in this exact order:

1. Title with a single # (main heading)
2. Ingredients section with bullet points
3. Instructions section with numbered steps
4. Cooking Time and Servings section
5. Notes section for tips and variations

Use this exact format:

# [Recipe Name]

## Ingredients
- [ingredient with amount]
- [ingredient with amount]

## Instructions
1. [detailed step]
2. [detailed step]

## Cooking Time and Servings
- Preparation Time: [time] minutes
- Cooking Time: [time] minutes
- Total Time: [time] minutes
- Servings: [number]

## Notes
- [important tips]
- [variations]
- [storage instructions]`
          },
          {
            role: "user",
            content: `Extract and format the recipe from this URL: ${url}. Follow the format exactly as specified. Ensure all sections are present and properly formatted.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
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
        method: 'openai-gpt4o-mini',
        url: requestUrl
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('OpenAI recipe extraction error:', error);
    
    return NextResponse.json({
      title: "Recipe Extraction Failed",
      ingredients: ["Could not extract ingredients"],
      instructions: ["Please try again later or manually copy the recipe"],
      markdown: "# Recipe Extraction Failed\n\nWe couldn't extract the recipe automatically. Please try again later or manually copy the recipe from the original website.",
      method: 'error-fallback',
      url: requestUrl // Use the stored URL
    }, { status: 200 });
  }
} 