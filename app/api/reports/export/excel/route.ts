
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threatModelId } = body;

    if (!threatModelId) {
      return NextResponse.json({ error: 'Threat model ID is required' }, { status: 400 });
    }

    // Fetch threat model with findings
    const threatModel = await prisma.threatModel.findFirst({
      where: {
        id: threatModelId,
        userId: session.user.id,
      },
      include: {
        findings: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!threatModel) {
      return NextResponse.json({ error: 'Threat model not found' }, { status: 404 });
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet data
    const summaryData = [
      ['Threat Model Report'],
      [''],
      ['Project Name', threatModel.name],
      ['Description', threatModel.description || 'No description'],
      ['Status', threatModel.status],
      ['Created', new Date(threatModel.createdAt).toLocaleDateString()],
      ['Last Updated', new Date(threatModel.updatedAt).toLocaleDateString()],
      ['Created By', `${threatModel.user.firstName || ''} ${threatModel.user.lastName || ''}`.trim() || threatModel.user.email],
      [''],
      ['Summary Statistics'],
      ['Total Findings', threatModel.findings.length],
      ['Critical Findings', threatModel.findings.filter(f => f.severity === 'CRITICAL').length],
      ['High Findings', threatModel.findings.filter(f => f.severity === 'HIGH').length],
      ['Medium Findings', threatModel.findings.filter(f => f.severity === 'MEDIUM').length],
      ['Low Findings', threatModel.findings.filter(f => f.severity === 'LOW').length],
      [''],
      ['Open Findings', threatModel.findings.filter(f => f.status === 'OPEN').length],
      ['In Progress Findings', threatModel.findings.filter(f => f.status === 'IN_PROGRESS').length],
      ['Resolved Findings', threatModel.findings.filter(f => f.status === 'RESOLVED').length],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Findings sheet data
    if (threatModel.findings.length > 0) {
      const findingsData = [
        ['ID', 'Threat Scenario', 'Severity', 'STRIDE Category', 'Status', 'Description', 'Recommendation', 'Created Date', 'Updated Date'],
        ...threatModel.findings.map(finding => [
          finding.id.slice(-8),
          finding.threatScenario,
          finding.severity,
          finding.strideCategory,
          finding.status,
          finding.description,
          finding.recommendation || 'No recommendation',
          new Date(finding.createdAt).toLocaleDateString(),
          new Date(finding.updatedAt).toLocaleDateString(),
        ])
      ];

      const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData);
      
      // Auto-width columns
      const maxWidth = 50;
      const colWidths = findingsData[0].map((_, colIndex) => {
        const columnData = findingsData.map(row => row[colIndex] || '');
        const maxLength = Math.max(...columnData.map(cell => cell.toString().length));
        return { width: Math.min(maxLength + 2, maxWidth) };
      });
      findingsSheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Findings');
    }

    // STRIDE Analysis sheet
    const strideCategories = ['SPOOFING', 'TAMPERING', 'REPUDIATION', 'INFORMATION_DISCLOSURE', 'DENIAL_OF_SERVICE', 'ELEVATION_OF_PRIVILEGE'];
    const strideData = [
      ['STRIDE Category Analysis'],
      [''],
      ['Category', 'Total Findings', 'Critical', 'High', 'Medium', 'Low'],
      ...strideCategories.map(category => {
        const categoryFindings = threatModel.findings.filter(f => f.strideCategory === category);
        return [
          category,
          categoryFindings.length,
          categoryFindings.filter(f => f.severity === 'CRITICAL').length,
          categoryFindings.filter(f => f.severity === 'HIGH').length,
          categoryFindings.filter(f => f.severity === 'MEDIUM').length,
          categoryFindings.filter(f => f.severity === 'LOW').length,
        ];
      })
    ];

    const strideSheet = XLSX.utils.aoa_to_sheet(strideData);
    XLSX.utils.book_append_sheet(workbook, strideSheet, 'STRIDE Analysis');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Save report to database for future access
    const reportName = `${threatModel.name} - Excel Report`;
    const summaryContent = JSON.stringify({
      totalFindings: threatModel.findings.length,
      criticalFindings: threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length,
      highFindings: threatModel.findings.filter((f: any) => f.severity === 'HIGH').length,
      mediumFindings: threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length,
      lowFindings: threatModel.findings.filter((f: any) => f.severity === 'LOW').length,
    });

    try {
      await prisma.report.create({
        data: {
          name: reportName,
          format: 'EXCEL',
          content: summaryContent,
          fileSize: excelBuffer.length,
          userId: session.user.id,
          threatModelId: threatModel.id,
        },
      });
    } catch (saveError) {
      console.error('Error saving report to database:', saveError);
      // Continue with download even if save fails
    }

    // Log the activity
    await logActivity({
      userId: session.user.id,
      action: 'EXPORT_EXCEL',
      status: 'SUCCESS',
      description: `Exported Excel report for threat model: ${threatModel.name}`,
      entityType: 'threat_model',
      entityId: threatModel.id,
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${threatModel.name.replace(/[^a-z0-9]/gi, '_')}_report.xlsx"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating Excel report:', error);
    
    // Log the failed activity
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'EXPORT_EXCEL',
        status: 'FAILED',
        description: 'Failed to export Excel report',
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate Excel report' },
      { status: 500 }
    );
  }
}
