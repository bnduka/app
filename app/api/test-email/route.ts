
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Email testing is no longer supported since verification is disabled
  return NextResponse.json(
    { 
      success: false, 
      message: 'Email verification system has been disabled.' 
    },
    { status: 410 } // Gone
  );
}

export async function POST(request: NextRequest) {
  // Email testing is no longer supported since verification is disabled
  return NextResponse.json(
    { 
      success: false, 
      message: 'Email verification system has been disabled.' 
    },
    { status: 410 } // Gone
  );
}
