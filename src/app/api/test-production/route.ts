import { NextResponse } from 'next/server';

export async function GET() {
  // Return the same format as production would
  return new NextResponse("Sample production response", {
    headers: {
      'Content-Type': 'text/plain'
    }
  });
} 