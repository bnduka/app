
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createErrorResponse, createSuccessResponse } from '@/lib/validation/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch public organizations (limited data for signup form)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 100, // Limit to prevent abuse
    });

    return createSuccessResponse({
      organizations,
    }, 'Organizations fetched successfully');
    
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return createErrorResponse('Failed to fetch organizations', 500);
  }
}
