import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    message: "Test endpoint reached successfully",
    url: req.url,
    headers: Object.fromEntries([...req.headers.entries()])
  });
} 