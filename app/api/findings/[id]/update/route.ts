
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { SecurityFrameworkMapper } from '@/lib/security/framework-mapper';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const findingId = params.id;
    const updateData = await request.json();

    // Get existing finding
    const existingFinding = await prisma.finding.findUnique({
      where: { id: findingId },
      include: { threatModel: true }
    });

    if (!existingFinding) {
      return NextResponse.json(
        { error: 'Finding not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = ['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role);
    const isOwner = existingFinding.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Auto-map security frameworks if severity or STRIDE category changes
    let enhancedData = { ...updateData };

    if (updateData.severity || updateData.strideCategory) {
      const severity = updateData.severity || existingFinding.severity;
      const strideCategory = updateData.strideCategory || existingFinding.strideCategory;

      // Auto-map NIST controls
      const nistControls = SecurityFrameworkMapper.mapStrideToNIST(strideCategory);
      
      // Auto-map OWASP category
      const owaspCategories = SecurityFrameworkMapper.mapStrideToOWASP(strideCategory);
      const owaspCategory = owaspCategories[0]; // Take first match

      // Calculate CVSS score
      const cvssScore = SecurityFrameworkMapper.calculateCVSSScore(severity, {
        networkAccess: true,
        privilegesRequired: false,
        userInteraction: true
      });

      // Get ASVS level
      const asvsLevel = SecurityFrameworkMapper.getASVSLevel(severity, strideCategory);

      enhancedData = {
        ...enhancedData,
        nistControls: updateData.nistControls || nistControls,
        owaspCategory: updateData.owaspCategory || owaspCategory,
        cvssScore: updateData.cvssScore !== undefined ? updateData.cvssScore : cvssScore,
        asvsLevel: updateData.asvsLevel !== undefined ? updateData.asvsLevel : asvsLevel,
      };
    }

    // Update finding
    const updatedFinding = await prisma.finding.update({
      where: { id: findingId },
      data: enhancedData,
      include: {
        user: {
          select: { id: true, firstName: true,
        lastName: true, email: true }
        },
        threatModel: {
          select: { id: true, name: true }
        }
      }
    });

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'UPDATE_FINDING',
      status: 'SUCCESS',
      description: `Updated finding: ${updatedFinding.threatScenario}`,
      entityType: 'finding',
      entityId: updatedFinding.id,
      details: JSON.stringify({
        changes: updateData,
        threatModelId: existingFinding.threatModelId
      })
    });

    return NextResponse.json({
      message: 'Finding updated successfully',
      finding: updatedFinding
    });

  } catch (error) {
    console.error('Error updating finding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
