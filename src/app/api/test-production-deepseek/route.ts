import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    // Simulate production behavior
    // Return plain text that's not valid JSON
    return new NextResponse("# Extracted Recipe\n\nThis is a sample recipe extraction that mimics production behavior.", {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
} 