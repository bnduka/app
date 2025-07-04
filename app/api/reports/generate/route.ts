
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threatModelId, format } = body;

    if (!threatModelId) {
      return NextResponse.json({ error: 'Threat model ID is required' }, { status: 400 });
    }

    if (!format || !['PDF', 'EXCEL'].includes(format.toUpperCase())) {
      return NextResponse.json({ error: 'Valid format (PDF or EXCEL) is required' }, { status: 400 });
    }

    // Fetch threat model with findings
    const threatModel = await prisma.threatModel.findFirst({
      where: {
        id: threatModelId,
        // Role-based access control
        ...(session.user.role === 'ADMIN' ? {} : 
           session.user.role === 'BUSINESS_ADMIN' ? {
             OR: [
               { userId: session.user.id },
               { user: { organizationId: session.user.organizationId } }
             ]
           } : 
           { userId: session.user.id })
      },
      include: {
        findings: {
          include: {
            findingTags: {
              include: {
                tag: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!threatModel) {
      return NextResponse.json({ error: 'Threat model not found or access denied' }, { status: 404 });
    }

    const reportFormat = format.toUpperCase() as 'PDF' | 'EXCEL';
    const reportName = `${threatModel.name} - ${reportFormat} Report`;

    // Generate report content
    let reportContent: string;
    let fileBuffer: Buffer;

    if (reportFormat === 'PDF') {
      const result = await generatePDFReport(threatModel);
      reportContent = result.htmlContent;
      fileBuffer = result.pdfBuffer;
    } else {
      const result = await generateExcelReport(threatModel);
      reportContent = JSON.stringify(result.summary);
      fileBuffer = result.excelBuffer;
    }

    // Save report to database
    const report = await prisma.report.create({
      data: {
        name: reportName,
        format: reportFormat,
        content: reportContent,
        fileSize: fileBuffer.length,
        userId: session.user.id,
        threatModelId: threatModel.id,
      },
    });

    // Log the activity
    await logActivity({
      userId: session.user.id,
      action: reportFormat === 'PDF' ? 'EXPORT_PDF' : 'EXPORT_EXCEL',
      status: 'SUCCESS',
      description: `Generated and saved ${reportFormat} report for threat model: ${threatModel.name}`,
      entityType: 'threat_model',
      entityId: threatModel.id,
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        name: report.name,
        format: report.format,
        createdAt: report.createdAt,
      },
      message: `${reportFormat} report generated successfully`,
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    
    // Log the failed activity
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'GENERATE_REPORT',
        status: 'FAILED',
        description: 'Failed to generate report',
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generatePDFReport(threatModel: any): Promise<{ htmlContent: string; pdfBuffer: Buffer }> {
  let browser;
  
  try {
    // Calculate statistics
    const totalFindings = threatModel.findings.length;
    const criticalFindings = threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length;
    const highFindings = threatModel.findings.filter((f: any) => f.severity === 'HIGH').length;
    const mediumFindings = threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length;
    const lowFindings = threatModel.findings.filter((f: any) => f.severity === 'LOW').length;
    
    const openFindings = threatModel.findings.filter((f: any) => f.status === 'OPEN').length;
    const inProgressFindings = threatModel.findings.filter((f: any) => f.status === 'IN_PROGRESS').length;
    const resolvedFindings = threatModel.findings.filter((f: any) => f.status === 'RESOLVED').length;

    // Generate comprehensive HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Threat Analysis Report - ${threatModel.name}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .page { padding: 40px; min-height: 100vh; }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; margin: -40px -40px 40px -40px; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header h2 { margin: 10px 0 0 0; font-size: 20px; font-weight: 400; opacity: 0.9; }
        .header .meta { margin-top: 20px; font-size: 14px; opacity: 0.8; }
        .section { margin: 40px 0; page-break-inside: avoid; }
        .section-title { color: #1e40af; font-size: 22px; font-weight: 600; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .executive-summary { background: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 25px 0; }
        .stat-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-number { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
        .stat-label { color: #6b7280; font-size: 14px; font-weight: 500; }
        .stat-critical { color: #dc2626; }
        .stat-high { color: #ea580c; }
        .stat-medium { color: #d97706; }
        .stat-low { color: #059669; }
        .stat-info { color: #3b82f6; }
        .findings-table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 13px; }
        .findings-table th, .findings-table td { border: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; vertical-align: top; }
        .findings-table th { background: #f8fafc; font-weight: 600; color: #374151; }
        .findings-table tr:nth-child(even) { background: #f9fafb; }
        .severity-critical { background: #fef2f2 !important; color: #991b1b; font-weight: 600; }
        .severity-high { background: #fff7ed !important; color: #9a3412; font-weight: 600; }
        .severity-medium { background: #fffbeb !important; color: #92400e; font-weight: 600; }
        .severity-low { background: #f0fdf4 !important; color: #166534; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .status-open { background: #fef2f2; color: #991b1b; }
        .status-in-progress { background: #fff7ed; color: #9a3412; }
        .status-resolved { background: #f0fdf4; color: #166534; }
        .stride-section { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; }
        .stride-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
        .stride-card { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .stride-title { font-weight: 600; color: #1e40af; margin-bottom: 8px; }
        .stride-count { font-size: 24px; font-weight: 700; color: #374151; }
        .recommendations { background: #fef3c7; padding: 25px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0; }
        .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .page-break { page-break-before: always; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 25px 0; }
        .info-item { margin-bottom: 15px; }
        .info-label { font-weight: 600; color: #374151; margin-bottom: 5px; }
        .info-value { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <h1>Threat Analysis Report</h1>
          <h2>${threatModel.name}</h2>
          <div class="meta">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | 
            BGuard TMaaS Platform
          </div>
        </div>

        <!-- Executive Summary -->
        <div class="section">
          <div class="section-title">Executive Summary</div>
          <div class="executive-summary">
            <div class="info-grid">
              <div>
                <div class="info-item">
                  <div class="info-label">Project Name</div>
                  <div class="info-value">${threatModel.name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Description</div>
                  <div class="info-value">${threatModel.description || 'No description provided'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">${threatModel.status}</div>
                </div>
              </div>
              <div>
                <div class="info-item">
                  <div class="info-label">Created</div>
                  <div class="info-value">${new Date(threatModel.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Last Updated</div>
                  <div class="info-value">${new Date(threatModel.updatedAt).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Created By</div>
                  <div class="info-value">${`${threatModel.user.firstName || ''} ${threatModel.user.lastName || ''}`.trim() || threatModel.user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Summary -->
        <div class="section">
          <div class="section-title">Risk Assessment Summary</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number stat-info">${totalFindings}</div>
              <div class="stat-label">Total Findings</div>
            </div>
            <div class="stat-card">
              <div class="stat-number stat-critical">${criticalFindings}</div>
              <div class="stat-label">Critical Risk</div>
            </div>
            <div class="stat-card">
              <div class="stat-number stat-high">${highFindings}</div>
              <div class="stat-label">High Risk</div>
            </div>
            <div class="stat-card">
              <div class="stat-number stat-medium">${mediumFindings}</div>
              <div class="stat-label">Medium Risk</div>
            </div>
            <div class="stat-card">
              <div class="stat-number stat-low">${lowFindings}</div>
              <div class="stat-label">Low Risk</div>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number stat-critical">${openFindings}</div>
              <div class="stat-label">Open Issues</div>
            </div>
            <div class="stat-card">
              <div class="stat-number stat-medium">${inProgressFindings}</div>
              <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card">
              <div class="stat-number stat-low">${resolvedFindings}</div>
              <div class="stat-label">Resolved</div>
            </div>
          </div>
        </div>

        <!-- STRIDE Analysis -->
        <div class="section">
          <div class="section-title">STRIDE Threat Categories</div>
          <div class="stride-section">
            <p>The following analysis shows the distribution of threats across the STRIDE threat modeling framework:</p>
            <div class="stride-grid">
              ${['SPOOFING', 'TAMPERING', 'REPUDIATION', 'INFORMATION_DISCLOSURE', 'DENIAL_OF_SERVICE', 'ELEVATION_OF_PRIVILEGE'].map(category => {
                const categoryFindings = threatModel.findings.filter((f: any) => f.strideCategory === category);
                return `
                  <div class="stride-card">
                    <div class="stride-title">${category.replace(/_/g, ' ')}</div>
                    <div class="stride-count">${categoryFindings.length}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                      C:${categoryFindings.filter((f: any) => f.severity === 'CRITICAL').length} 
                      H:${categoryFindings.filter((f: any) => f.severity === 'HIGH').length} 
                      M:${categoryFindings.filter((f: any) => f.severity === 'MEDIUM').length} 
                      L:${categoryFindings.filter((f: any) => f.severity === 'LOW').length}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        ${threatModel.findings.length > 0 ? `
        <!-- Detailed Findings -->
        <div class="section page-break">
          <div class="section-title">Detailed Security Findings</div>
          <table class="findings-table">
            <thead>
              <tr>
                <th style="width: 8%;">ID</th>
                <th style="width: 20%;">Threat Scenario</th>
                <th style="width: 8%;">Severity</th>
                <th style="width: 12%;">STRIDE</th>
                <th style="width: 8%;">Status</th>
                <th style="width: 22%;">Description</th>
                <th style="width: 22%;">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              ${threatModel.findings.map((finding: any, index: number) => `
              <tr>
                <td>${(index + 1).toString().padStart(3, '0')}</td>
                <td style="font-weight: 500;">${finding.threatScenario || finding.title || 'N/A'}</td>
                <td class="severity-${finding.severity.toLowerCase()}">${finding.severity}</td>
                <td>${finding.strideCategory.replace(/_/g, ' ')}</td>
                <td><span class="status-badge status-${finding.status.toLowerCase().replace('_', '-')}">${finding.status.replace(/_/g, ' ')}</span></td>
                <td>${finding.description}</td>
                <td>${finding.recommendation || 'No recommendation provided'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Recommendations -->
        <div class="section">
          <div class="section-title">Key Recommendations</div>
          <div class="recommendations">
            <h4 style="margin-top: 0; color: #92400e;">Priority Actions</h4>
            <ul style="margin: 15px 0; padding-left: 20px;">
              ${criticalFindings > 0 ? `<li><strong>Immediate Action Required:</strong> Address ${criticalFindings} critical security finding${criticalFindings > 1 ? 's' : ''} that pose significant risk to the system.</li>` : ''}
              ${highFindings > 0 ? `<li><strong>High Priority:</strong> Remediate ${highFindings} high-severity finding${highFindings > 1 ? 's' : ''} in the next development cycle.</li>` : ''}
              <li><strong>Security Review:</strong> Implement regular security reviews and threat model updates as the system evolves.</li>
              <li><strong>Monitoring:</strong> Establish continuous monitoring for the identified threat vectors.</li>
              <li><strong>Training:</strong> Ensure development team receives appropriate security training on identified vulnerabilities.</li>
            </ul>
          </div>
        </div>

        <!-- Technical Assumptions -->
        <div class="section">
          <div class="section-title">Technical Assumptions</div>
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #6b7280;">
            <ul style="margin: 0; padding-left: 20px;">
              <li>This threat model analysis is based on the current system architecture and may need updates as the system evolves.</li>
              <li>Security controls and mitigations mentioned assume proper implementation and configuration.</li>
              <li>The STRIDE methodology was used as the primary threat modeling framework.</li>
              <li>Risk assessments are based on the current threat landscape and organizational context.</li>
              <li>Regular updates to this threat model are recommended as new features are added or the threat landscape changes.</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p><strong>BGuard TMaaS (Threat Modeling as a Service)</strong></p>
          <p>Report ID: ${threatModel.id} | Generated: ${new Date().toISOString()}</p>
          <p>This document contains confidential security information and should be handled according to your organization's data classification policies.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Generate PDF with Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; color: #666; width: 100%; text-align: center; margin: 0 15mm;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    await browser.close();

    return { htmlContent, pdfBuffer: Buffer.from(pdfBuffer) };

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

async function generateExcelReport(threatModel: any): Promise<{ summary: any; excelBuffer: Buffer }> {
  try {
    const workbook = XLSX.utils.book_new();

    // Executive Summary sheet
    const summaryData = [
      ['THREAT ANALYSIS REPORT'],
      [''],
      ['Project Information'],
      ['Project Name', threatModel.name],
      ['Description', threatModel.description || 'No description provided'],
      ['Status', threatModel.status],
      ['Created', new Date(threatModel.createdAt).toLocaleDateString()],
      ['Last Updated', new Date(threatModel.updatedAt).toLocaleDateString()],
      ['Created By', `${threatModel.user.firstName || ''} ${threatModel.user.lastName || ''}`.trim() || threatModel.user.email],
      ['Report Generated', new Date().toLocaleDateString()],
      [''],
      ['Risk Summary'],
      ['Total Findings', threatModel.findings.length],
      ['Critical Findings', threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length],
      ['High Findings', threatModel.findings.filter((f: any) => f.severity === 'HIGH').length],
      ['Medium Findings', threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length],
      ['Low Findings', threatModel.findings.filter((f: any) => f.severity === 'LOW').length],
      [''],
      ['Status Breakdown'],
      ['Open Findings', threatModel.findings.filter((f: any) => f.status === 'OPEN').length],
      ['In Progress Findings', threatModel.findings.filter((f: any) => f.status === 'IN_PROGRESS').length],
      ['Resolved Findings', threatModel.findings.filter((f: any) => f.status === 'RESOLVED').length],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // Detailed Findings sheet
    if (threatModel.findings.length > 0) {
      const findingsData = [
        [
          'ID', 'Threat Scenario', 'Description', 'Severity', 'STRIDE Category', 
          'Status', 'CVSS Score', 'ASVS Level', 'OWASP Category', 
          'NIST Controls', 'Tags', 'Recommendation', 'Created Date', 'Updated Date'
        ],
        ...threatModel.findings.map((finding: any, index: number) => [
          (index + 1).toString().padStart(3, '0'),
          finding.threatScenario || finding.title || 'N/A',
          finding.description,
          finding.severity,
          finding.strideCategory,
          finding.status,
          finding.cvssScore || 'N/A',
          finding.asvsLevel || 'N/A',
          finding.owaspCategory || 'N/A',
          Array.isArray(finding.nistControls) ? finding.nistControls.join(', ') : (finding.nistControls || 'N/A'),
          finding.findingTags?.map((ft: any) => ft.tag?.name).filter(Boolean).join(', ') || 'N/A',
          finding.recommendation || 'No recommendation provided',
          new Date(finding.createdAt).toLocaleDateString(),
          new Date(finding.updatedAt).toLocaleDateString(),
        ])
      ];

      const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData);
      
      // Set column widths
      const colWidths = [
        { width: 8 },   // ID
        { width: 25 },  // Threat Scenario
        { width: 40 },  // Description
        { width: 12 },  // Severity
        { width: 20 },  // STRIDE Category
        { width: 15 },  // Status
        { width: 12 },  // CVSS Score
        { width: 12 },  // ASVS Level
        { width: 18 },  // OWASP Category
        { width: 25 },  // NIST Controls
        { width: 20 },  // Tags
        { width: 40 },  // Recommendation
        { width: 15 },  // Created Date
        { width: 15 },  // Updated Date
      ];
      findingsSheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Detailed Findings');
    }

    // STRIDE Analysis sheet
    const strideCategories = ['SPOOFING', 'TAMPERING', 'REPUDIATION', 'INFORMATION_DISCLOSURE', 'DENIAL_OF_SERVICE', 'ELEVATION_OF_PRIVILEGE'];
    const strideData = [
      ['STRIDE THREAT CATEGORY ANALYSIS'],
      [''],
      ['Category', 'Total Findings', 'Critical', 'High', 'Medium', 'Low', 'Open', 'In Progress', 'Resolved'],
      ...strideCategories.map(category => {
        const categoryFindings = threatModel.findings.filter((f: any) => f.strideCategory === category);
        return [
          category.replace(/_/g, ' '),
          categoryFindings.length,
          categoryFindings.filter((f: any) => f.severity === 'CRITICAL').length,
          categoryFindings.filter((f: any) => f.severity === 'HIGH').length,
          categoryFindings.filter((f: any) => f.severity === 'MEDIUM').length,
          categoryFindings.filter((f: any) => f.severity === 'LOW').length,
          categoryFindings.filter((f: any) => f.status === 'OPEN').length,
          categoryFindings.filter((f: any) => f.status === 'IN_PROGRESS').length,
          categoryFindings.filter((f: any) => f.status === 'RESOLVED').length,
        ];
      })
    ];

    const strideSheet = XLSX.utils.aoa_to_sheet(strideData);
    strideSheet['!cols'] = [
      { width: 25 }, { width: 12 }, { width: 10 }, { width: 10 }, 
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 10 }
    ];
    XLSX.utils.book_append_sheet(workbook, strideSheet, 'STRIDE Analysis');

    // Risk Matrix sheet
    const riskMatrixData = [
      ['RISK ASSESSMENT MATRIX'],
      [''],
      ['Severity Level', 'Count', 'Percentage', 'Priority Action'],
      ['CRITICAL', threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length, `${((threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Immediate action required'],
      ['HIGH', threatModel.findings.filter((f: any) => f.severity === 'HIGH').length, `${((threatModel.findings.filter((f: any) => f.severity === 'HIGH').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Address in current sprint'],
      ['MEDIUM', threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length, `${((threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Plan for next release'],
      ['LOW', threatModel.findings.filter((f: any) => f.severity === 'LOW').length, `${((threatModel.findings.filter((f: any) => f.severity === 'LOW').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Monitor and track'],
      [''],
      ['Status Overview'],
      ['OPEN', threatModel.findings.filter((f: any) => f.status === 'OPEN').length, `${((threatModel.findings.filter((f: any) => f.status === 'OPEN').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Requires attention'],
      ['IN_PROGRESS', threatModel.findings.filter((f: any) => f.status === 'IN_PROGRESS').length, `${((threatModel.findings.filter((f: any) => f.status === 'IN_PROGRESS').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Being addressed'],
      ['RESOLVED', threatModel.findings.filter((f: any) => f.status === 'RESOLVED').length, `${((threatModel.findings.filter((f: any) => f.status === 'RESOLVED').length / Math.max(threatModel.findings.length, 1)) * 100).toFixed(1)}%`, 'Completed'],
    ];

    const riskMatrixSheet = XLSX.utils.aoa_to_sheet(riskMatrixData);
    riskMatrixSheet['!cols'] = [{ width: 15 }, { width: 10 }, { width: 12 }, { width: 25 }];
    XLSX.utils.book_append_sheet(workbook, riskMatrixSheet, 'Risk Assessment');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const summary = {
      totalFindings: threatModel.findings.length,
      criticalFindings: threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length,
      highFindings: threatModel.findings.filter((f: any) => f.severity === 'HIGH').length,
      mediumFindings: threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length,
      lowFindings: threatModel.findings.filter((f: any) => f.severity === 'LOW').length,
      openFindings: threatModel.findings.filter((f: any) => f.status === 'OPEN').length,
      inProgressFindings: threatModel.findings.filter((f: any) => f.status === 'IN_PROGRESS').length,
      resolvedFindings: threatModel.findings.filter((f: any) => f.status === 'RESOLVED').length,
    };

    return { summary, excelBuffer: Buffer.from(excelBuffer) };

  } catch (error) {
    console.error('Error generating Excel report:', error);
    throw error;
  }
}
