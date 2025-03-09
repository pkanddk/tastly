import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(req: NextRequest) {
  try {
    // Initialize OpenAI client with the DeepSeek API
    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: 'https://api.deepseek.com/v1',
    });
    
    // Simple test call to DeepSeek API
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, this is a test message."
        }
      ],
      temperature: 0,
      max_tokens: 100,
      stream: false,
    });
    
    return NextResponse.json({ 
      success: true,
      message: completion.choices[0].message.content
    });
    
  } catch (error: any) {
    console.error('DeepSeek API test error:', error);
    return NextResponse.json({ error: error.message || 'Failed to test DeepSeek API' }, { status: 500 });
  }
} 