import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  console.log("1. extract-recipe-anthropic called"); // LOG
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validatedUrl = new URL(url).toString(); // Validate URL
    console.log("2. URL validated:", validatedUrl); // LOG

    // Extremely concise prompt
    const prompt = `Extract recipe from ${validatedUrl}: Title, ingredients (list), instructions (numbered).`;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }

    console.log("3. Making Anthropic API call"); // LOG
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "x-api-key": apiKey,
        },
        body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620", // Or another Claude 3 model
            messages: [
              { role: 'system', content: 'Extract recipe: title, ingredients (list), instructions (numbered). Ignore everything else.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300, // Very short
            stream: false
        })
    });
    console.log("4. Anthropic API call completed"); // LOG

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API error:", response.status, errorText);
        return NextResponse.json({error: `Anthropic API Error: ${response.status}`}, {status: 500});
    }
    const data = await response.json();
    console.log("5. Parsed Anthropic response:", data); // LOG
    const recipeText = data.content[0].text;

    return NextResponse.json({markdown: recipeText});

  } catch (error) {
    console.error('Anthropic recipe extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract recipe' },
      { status: 500 }
    );
  }
} 