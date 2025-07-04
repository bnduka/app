
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Email verification is no longer supported
  return NextResponse.json(
    { 
      success: false, 
      message: 'Email verification is no longer required. Please sign in with your credentials.' 
    },
    { status: 410 } // Gone
  );
}

export async function POST(request: NextRequest) {
  // Email verification is no longer supported
  return NextResponse.json(
    { 
      success: false, 
      message: 'Email verification is no longer required. Please sign in with your credentials.' 
    },
    { status: 410 } // Gone
  );
}
