import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { experimental_StreamData, streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validatedUrl = new URL(url).toString(); // Validate URL

    const prompt = `Extract the recipe from this URL: ${validatedUrl}. Return ONLY the title, ingredients (as a list), and instructions (as steps). Be extremely concise.`;

    // Get the Anthropic API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }
    const result = await streamText({
        // Use the apiKey directly with the model
        model: anthropic("claude-3-5-sonnet-20240620", {apiKey: apiKey}),
        messages: [
            { role: 'system', content: 'You are a recipe extraction assistant. Focus on ingredients and instructions. Ignore all website navigation, ads, and comments.' },
            { role: 'user', content: prompt },
        ],
        max_tokens: 500, // Keep it short
    });

    const data = new experimental_StreamData();
    return result.toDataStreamResponse(data);

  } catch (error) {
    console.error('Anthropic recipe extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract recipe' },
      { status: 500 }
    );
  }
} 