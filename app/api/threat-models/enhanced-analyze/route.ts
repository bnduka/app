
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { logActivity } from '@/lib/activity-logger';
import { EnhancedThreatAnalyzer } from '@/lib/threat-modeling/enhanced-analyzer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { prompt, context, threatModelId } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'System description is required' },
        { status: 400 }
      );
    }

    // Generate enhanced threat analysis
    const findings = EnhancedThreatAnalyzer.analyzeSystemThreats(prompt, context);

    // Log the analysis activity
    await logActivity({
      userId: session.user.id,
      action: 'CREATE_THREAT_MODEL',
      status: 'SUCCESS',
      description: `Enhanced threat analysis completed with ${findings.length} findings`,
      entityType: 'threat_model',
      entityId: threatModelId || 'enhanced-analysis',
      details: JSON.stringify({
        prompt: prompt.substring(0, 200) + '...',
        context,
        findingsCount: findings.length,
        severityBreakdown: {
          critical: findings.filter(f => f.severity === 'CRITICAL').length,
          high: findings.filter(f => f.severity === 'HIGH').length,
          medium: findings.filter(f => f.severity === 'MEDIUM').length,
          low: findings.filter(f => f.severity === 'LOW').length
        }
      })
    });

    return NextResponse.json({
      message: 'Enhanced threat analysis completed successfully',
      findings,
      summary: {
        total: findings.length,
        critical: findings.filter(f => f.severity === 'CRITICAL').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        low: findings.filter(f => f.severity === 'LOW').length,
        frameworks: {
          nist: findings.filter(f => f.nistControls.length > 0).length,
          owasp: findings.filter(f => f.owaspCategory).length,
          cvss: findings.filter(f => f.cvssScore > 0).length
        }
      }
    });

  } catch (error) {
    console.error('Error in enhanced threat analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error during analysis' },
      { status: 500 }
    );
  }
}
