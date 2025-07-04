
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const addAssetSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  impact: z.enum(['DIRECT', 'INDIRECT', 'CASCADING']).optional(),
});

const removeAssetSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
});

const updateAssetImpactSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  impact: z.enum(['DIRECT', 'INDIRECT', 'CASCADING']),
});

// GET /api/findings/[id]/assets - Get assets linked to a finding
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

    // Get finding assets
    const findingAssets = await prisma.findingAsset.findMany({
      where: {
        findingId: findingId,
      },
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ findingAssets });
  } catch (error) {
    console.error('Error fetching finding assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/findings/[id]/assets - Link asset to finding
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findingId = params.id;
    const body = await request.json();
    const validatedData = addAssetSchema.parse(body);

    // Verify user has access to the finding
    const finding = await prisma.finding.findFirst({
      where: {
        id: findingId,
        userId: session.user.id,
      },
      include: {
        threatModel: true,
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found or access denied' }, { status: 404 });
    }

    // Verify asset exists and belongs to the same threat model
    const asset = await prisma.asset.findFirst({
      where: {
        id: validatedData.assetId,
        threatModelId: finding.threatModel.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found or not in same threat model' }, { status: 404 });
    }

    // Check if asset is already linked to this finding
    const existingFindingAsset = await prisma.findingAsset.findFirst({
      where: {
        findingId: findingId,
        assetId: validatedData.assetId,
      },
    });

    if (existingFindingAsset) {
      return NextResponse.json({ error: 'Asset already linked to this finding' }, { status: 409 });
    }

    // Create the finding asset relationship
    const findingAsset = await prisma.findingAsset.create({
      data: {
        findingId: findingId,
        assetId: validatedData.assetId,
        impact: validatedData.impact || 'DIRECT',
      },
      include: {
        asset: true,
      },
    });

    return NextResponse.json({ findingAsset }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error linking asset to finding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/findings/[id]/assets - Update asset impact on finding
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findingId = params.id;
    const body = await request.json();
    const validatedData = updateAssetImpactSchema.parse(body);

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

    // Find and update the finding asset relationship
    const findingAsset = await prisma.findingAsset.findFirst({
      where: {
        findingId: findingId,
        assetId: validatedData.assetId,
      },
    });

    if (!findingAsset) {
      return NextResponse.json({ error: 'Asset not linked to this finding' }, { status: 404 });
    }

    const updatedFindingAsset = await prisma.findingAsset.update({
      where: { id: findingAsset.id },
      data: { impact: validatedData.impact },
      include: {
        asset: true,
      },
    });

    return NextResponse.json({ findingAsset: updatedFindingAsset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating asset impact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/findings/[id]/assets - Unlink asset from finding
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findingId = params.id;
    const body = await request.json();
    const validatedData = removeAssetSchema.parse(body);

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

    // Find and delete the finding asset relationship
    const findingAsset = await prisma.findingAsset.findFirst({
      where: {
        findingId: findingId,
        assetId: validatedData.assetId,
      },
    });

    if (!findingAsset) {
      return NextResponse.json({ error: 'Asset not linked to this finding' }, { status: 404 });
    }

    await prisma.findingAsset.delete({
      where: { id: findingAsset.id },
    });

    return NextResponse.json({ message: 'Asset unlinked from finding successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error unlinking asset from finding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
