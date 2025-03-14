import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  console.log("1. extract-recipe-anthropic called");
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validatedUrl = new URL(url).toString();
    console.log("2. URL validated:", validatedUrl);

    const prompt = `Extract recipe from ${validatedUrl}: Title, ingredients (list), instructions (numbered).`;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log("3. Anthropic API Key:", apiKey);

    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }

    console.log("4. Making Anthropic API call");

    const result = await anthropic("claude-3-5-sonnet-20240620", { apiKey }).messages.create({
        messages: [
          { role: 'system', content: 'Extract recipe: title, ingredients (list), instructions (numbered). Ignore everything else.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
    });

    console.log("5. Anthropic API call completed", result);

    // Check if the response has the expected structure
    if (result && result.content && typeof result.content === 'string') {
      return NextResponse.json({ markdown: result.content });
    } else if (result && Array.isArray(result.content) && result.content.length > 0 && result.content[0].type === "text" && typeof result.content[0].text === 'string') {
        // Handle the case where content is an array (as expected)
        return NextResponse.json({ markdown: result.content[0].text });
    }
    else {
      console.error("Unexpected Anthropic response format:", result);
      return NextResponse.json(
        { error: 'Failed to extract recipe: Unexpected response format' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Anthropic recipe extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract recipe' },
      { status: 500 }
    );
  }
} 