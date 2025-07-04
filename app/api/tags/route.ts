
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').optional(),
  description: z.string().optional(),
});

// GET /api/tags - List tags (system + organization-specific)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeSystem = searchParams.get('includeSystem') !== 'false';
    const organizationId = session.user.organizationId;

    // Build where clause
    const whereClause: any = {
      OR: []
    };

    // Include system tags if requested
    if (includeSystem) {
      whereClause.OR.push({ isSystemTag: true });
    }

    // Include organization-specific tags if user has an organization
    if (organizationId) {
      whereClause.OR.push({ 
        organizationId: organizationId,
        isSystemTag: false 
      });
    }

    // If no conditions match, return empty array
    if (whereClause.OR.length === 0) {
      return NextResponse.json({ tags: [] });
    }

    const tags = await prisma.tag.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            findingTags: true,
          },
        },
      },
      orderBy: [
        { isSystemTag: 'desc' }, // System tags first
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tags - Create new custom tag (organization-specific)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization required to create custom tags' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createTagSchema.parse(body);

    // Check if tag name already exists in this organization
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: validatedData.name,
        organizationId: organizationId,
      },
    });

    if (existingTag) {
      return NextResponse.json({ error: 'Tag name already exists in your organization' }, { status: 409 });
    }

    // Create the tag
    const tag = await prisma.tag.create({
      data: {
        name: validatedData.name,
        color: validatedData.color || '#6b7280', // Default gray color
        description: validatedData.description,
        isSystemTag: false,
        organizationId: organizationId,
      },
      include: {
        _count: {
          select: {
            findingTags: true,
          },
        },
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
