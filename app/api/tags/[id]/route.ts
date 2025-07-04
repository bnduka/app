
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').optional(),
  description: z.string().optional(),
});

// GET /api/tags/[id] - Get individual tag
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tagId = params.id;
    const organizationId = session.user.organizationId;

    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        OR: [
          { isSystemTag: true }, // System tags available to all
          { organizationId: organizationId }, // Organization tags
        ],
      },
      include: {
        findingTags: {
          include: {
            finding: {
              select: {
                id: true,
                threatScenario: true,
                severity: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            findingTags: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tags/[id] - Update tag (only for custom organization tags)
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tagId = params.id;
    const organizationId = session.user.organizationId;
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateTagSchema.parse(body);

    // Verify user can update this tag (only custom organization tags)
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        organizationId: organizationId,
        isSystemTag: false, // Only custom tags can be updated
      },
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found or cannot be updated' }, { status: 404 });
    }

    // Check for name conflicts if name is being changed
    if (validatedData.name && validatedData.name !== existingTag.name) {
      const nameConflict = await prisma.tag.findFirst({
        where: {
          name: validatedData.name,
          organizationId: organizationId,
          id: { not: tagId },
        },
      });

      if (nameConflict) {
        return NextResponse.json({ error: 'Tag name already exists in your organization' }, { status: 409 });
      }
    }

    // Update the tag
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: validatedData,
      include: {
        _count: {
          select: {
            findingTags: true,
          },
        },
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] - Delete tag (only for custom organization tags)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tagId = params.id;
    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization required' }, { status: 400 });
    }

    // Verify user can delete this tag (only custom organization tags)
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        organizationId: organizationId,
        isSystemTag: false, // Only custom tags can be deleted
      },
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found or cannot be deleted' }, { status: 404 });
    }

    // Delete the tag (cascade will handle findingTags)
    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
