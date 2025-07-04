
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const threatModelId = params.id;

    // Get the threat model with organization info
    const threatModel = await prisma.threatModel.findUnique({
      where: { id: threatModelId },
      include: {
        user: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!threatModel) {
      return NextResponse.json(
        { error: 'Threat model not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = session.user.role;
    const userOrgId = session.user.organizationId;
    const threatModelOrgId = threatModel.user.organizationId;

    let canDelete = false;

    if (userRole === 'ADMIN') {
      // Platform admins can delete any threat model
      canDelete = true;
    } else if (userRole === 'BUSINESS_ADMIN' && userOrgId === threatModelOrgId) {
      // Business admins can delete threat models in their organization
      canDelete = true;
    } else if (threatModel.userId === session.user.id) {
      // Users can delete their own threat models
      canDelete = true;
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this threat model' },
        { status: 403 }
      );
    }

    // Delete associated data in the correct order to handle foreign key constraints
    await prisma.$transaction(async (tx) => {
      // Delete file uploads
      await tx.fileUpload.deleteMany({
        where: { threatModelId }
      });

      // Delete findings (comments will be deleted via cascade)
      await tx.finding.deleteMany({
        where: { threatModelId }
      });

      // Delete reports
      await tx.report.deleteMany({
        where: { threatModelId }
      });

      // Finally delete the threat model
      await tx.threatModel.delete({
        where: { id: threatModelId }
      });
    });

    // Log the deletion
    await logActivity({
      userId: session.user.id,
      action: 'DELETE_THREAT_MODEL',
      status: 'SUCCESS',
      description: `Threat model deleted: ${threatModel.name} (original owner: ${threatModel.userId}, deleted by: ${userRole})`,
      entityType: 'threat_model',
      entityId: threatModelId,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Threat model deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting threat model:', error);
    return NextResponse.json(
      { error: 'Failed to delete threat model' },
      { status: 500 }
    );
  }
}
