
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reportId = params.id;

    // Get the report to check permissions
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        threatModel: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = ['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role);
    const isOwner = report.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this report' },
        { status: 403 }
      );
    }

    // Admin can delete reports regardless of status, but log it
    if (isAdmin && !isOwner) {
      await logActivity({
        userId: session.user.id,
        action: 'DELETE_REPORT',
        status: 'SUCCESS',
        description: `Admin deleted report: ${report.name} (owned by ${`${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.email})`,
        entityType: 'report',
        entityId: report.id,
        details: JSON.stringify({
          reportName: report.name,
          originalOwner: report.user.email,
          threatModelId: report.threatModel.id,
          threatModelStatus: report.threatModel.status,
          adminOverride: true
        })
      });
    }

    // Soft delete - mark as deleted instead of removing from database
    await prisma.report.update({
      where: { id: reportId },
      data: {
        deletedBy: session.user.id,
        deletedAt: new Date()
      }
    });

    // Log the deletion activity
    await logActivity({
      userId: session.user.id,
      action: 'DELETE_REPORT',
      status: 'SUCCESS',
      description: `Deleted report: ${report.name}`,
      entityType: 'report',
      entityId: report.id,
      details: JSON.stringify({
        reportName: report.name,
        threatModelId: report.threatModel.id,
        deletedBy: session.user.id,
        isAdminDelete: isAdmin && !isOwner
      })
    });

    return NextResponse.json({
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
