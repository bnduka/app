
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const addTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
  justification: z.string().optional(),
});

const removeTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
});

// GET /api/findings/[id]/tags - Get tags for a finding
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findingId = params.id;

    // Verify user has access to the finding
    const finding = await prisma.finding.findFirst({
      where: {
        id: findingId,
        userId: session.user.id,
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found or access denied' }, { status: 404 });
    }

    // Get finding tags
    const findingTags = await prisma.findingTag.findMany({
      where: {
        findingId: findingId,
      },
      include: {
        tag: true,
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ findingTags });
  } catch (error) {
    console.error('Error fetching finding tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/findings/[id]/tags - Add tag to finding
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findingId = params.id;
    const body = await request.json();
    const validatedData = addTagSchema.parse(body);

    // Verify user has access to the finding
    const finding = await prisma.finding.findFirst({
      where: {
        id: findingId,
        userId: session.user.id,
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found or access denied' }, { status: 404 });
    }

    // Verify tag exists and user has access to it
    const organizationId = session.user.organizationId;
    const tag = await prisma.tag.findFirst({
      where: {
        id: validatedData.tagId,
        OR: [
          { isSystemTag: true }, // System tags available to all
          { organizationId: organizationId }, // Organization tags
        ],
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found or access denied' }, { status: 404 });
    }

    // Check if tag is already applied to this finding
    const existingFindingTag = await prisma.findingTag.findFirst({
      where: {
        findingId: findingId,
        tagId: validatedData.tagId,
      },
    });

    if (existingFindingTag) {
      return NextResponse.json({ error: 'Tag already applied to this finding' }, { status: 409 });
    }

    // Validate justification for special tags
    const requiresJustification = ['False Positive', 'Not Applicable'].includes(tag.name);
    if (requiresJustification && !validatedData.justification?.trim()) {
      return NextResponse.json({ 
        error: `Justification is required for "${tag.name}" tag` 
      }, { status: 400 });
    }

    // Create the finding tag relationship
    const findingTag = await prisma.findingTag.create({
      data: {
        findingId: findingId,
        tagId: validatedData.tagId,
        justification: validatedData.justification,
        createdBy: session.user.id,
      },
      include: {
        tag: true,
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ findingTag }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error adding tag to finding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/findings/[id]/tags - Remove tag from finding
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findingId = params.id;
    const body = await request.json();
    const validatedData = removeTagSchema.parse(body);

    // Verify user has access to the finding
    const finding = await prisma.finding.findFirst({
      where: {
        id: findingId,
        userId: session.user.id,
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found or access denied' }, { status: 404 });
    }

    // Find and delete the finding tag relationship
    const findingTag = await prisma.findingTag.findFirst({
      where: {
        findingId: findingId,
        tagId: validatedData.tagId,
      },
    });

    if (!findingTag) {
      return NextResponse.json({ error: 'Tag not found on this finding' }, { status: 404 });
    }

    await prisma.findingTag.delete({
      where: { id: findingTag.id },
    });

    return NextResponse.json({ message: 'Tag removed from finding successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error removing tag from finding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
