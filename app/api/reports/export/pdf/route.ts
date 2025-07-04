
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

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

    // Generate HTML content for PDF
    const htmlContent = generatePDFHTML(threatModel);

    // Generate actual PDF using Puppeteer
    const puppeteer = await import('puppeteer');
    let browser;
    let pdfBuffer: Buffer;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
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
      pdfBuffer = Buffer.from(pdf);

    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error generating PDF with Puppeteer:', error);
      // Fallback to HTML content
      pdfBuffer = Buffer.from(htmlContent, 'utf-8');
    }

    // Save report to database for future access
    const reportName = `${threatModel.name} - PDF Report`;
    try {
      await prisma.report.create({
        data: {
          name: reportName,
          format: 'PDF',
          content: htmlContent,
          fileSize: pdfBuffer.length,
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
      action: 'EXPORT_PDF',
      status: 'SUCCESS',
      description: `Exported PDF report for threat model: ${threatModel.name}`,
      entityType: 'threat_model',
      entityId: threatModel.id,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${threatModel.name.replace(/[^a-z0-9]/gi, '_')}_report.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF report:', error);
    
    // Log the failed activity
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'EXPORT_PDF',
        status: 'FAILED',
        description: 'Failed to export PDF report',
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}

function generatePDFHTML(threatModel: any): string {
  const now = new Date().toLocaleDateString();
  
  // Calculate statistics
  const totalFindings = threatModel.findings.length;
  const criticalFindings = threatModel.findings.filter((f: any) => f.severity === 'CRITICAL').length;
  const highFindings = threatModel.findings.filter((f: any) => f.severity === 'HIGH').length;
  const mediumFindings = threatModel.findings.filter((f: any) => f.severity === 'MEDIUM').length;
  const lowFindings = threatModel.findings.filter((f: any) => f.severity === 'LOW').length;
  
  const openFindings = threatModel.findings.filter((f: any) => f.status === 'OPEN').length;
  const inProgressFindings = threatModel.findings.filter((f: any) => f.status === 'IN_PROGRESS').length;
  const resolvedFindings = threatModel.findings.filter((f: any) => f.status === 'RESOLVED').length;

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Threat Model Report - ${threatModel.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #007acc; padding-bottom: 20px; }
        .title { color: #007acc; font-size: 28px; margin-bottom: 10px; }
        .subtitle { color: #666; font-size: 16px; }
        .section { margin: 30px 0; }
        .section-title { color: #007acc; font-size: 20px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: bold; color: #555; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007acc; }
        .stat-label { color: #666; margin-top: 5px; }
        .findings-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .findings-table th, .findings-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .findings-table th { background-color: #f5f5f5; font-weight: bold; }
        .severity-critical { background-color: #ffebee; color: #c62828; }
        .severity-high { background-color: #fff3e0; color: #ef6c00; }
        .severity-medium { background-color: #fffde7; color: #f57c00; }
        .severity-low { background-color: #e8f5e8; color: #388e3c; }
        .status-open { background-color: #ffebee; color: #c62828; }
        .status-in-progress { background-color: #fff3e0; color: #ef6c00; }
        .status-resolved { background-color: #e8f5e8; color: #388e3c; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Threat Model Report</div>
        <div class="subtitle">${threatModel.name}</div>
        <div class="subtitle">Generated on ${now}</div>
    </div>

    <div class="section">
        <div class="section-title">Project Information</div>
        <div class="info-grid">
            <div>
                <div class="info-item">
                    <span class="info-label">Project Name:</span> ${threatModel.name}
                </div>
                <div class="info-item">
                    <span class="info-label">Description:</span> ${threatModel.description || 'No description provided'}
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span> ${threatModel.status}
                </div>
            </div>
            <div>
                <div class="info-item">
                    <span class="info-label">Created:</span> ${new Date(threatModel.createdAt).toLocaleDateString()}
                </div>
                <div class="info-item">
                    <span class="info-label">Last Updated:</span> ${new Date(threatModel.updatedAt).toLocaleDateString()}
                </div>
                <div class="info-item">
                    <span class="info-label">Created By:</span> ${`${threatModel.user.firstName || ''} ${threatModel.user.lastName || ''}`.trim() || threatModel.user.name || threatModel.user.email}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Summary Statistics</div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${totalFindings}</div>
                <div class="stat-label">Total Findings</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${criticalFindings}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${highFindings}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${mediumFindings}</div>
                <div class="stat-label">Medium</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${lowFindings}</div>
                <div class="stat-label">Low</div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${openFindings}</div>
                <div class="stat-label">Open</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${inProgressFindings}</div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${resolvedFindings}</div>
                <div class="stat-label">Resolved</div>
            </div>
        </div>
    </div>

    ${threatModel.findings.length > 0 ? `
    <div class="section">
        <div class="section-title">Detailed Findings</div>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>STRIDE Category</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Recommendation</th>
                </tr>
            </thead>
            <tbody>
                ${threatModel.findings.map((finding: any) => `
                <tr>
                    <td>${finding.id.slice(-8)}</td>
                    <td>${finding.title}</td>
                    <td class="severity-${finding.severity.toLowerCase()}">${finding.severity}</td>
                    <td>${finding.strideCategory}</td>
                    <td class="status-${finding.status.toLowerCase().replace('_', '-')}">${finding.status}</td>
                    <td>${finding.description}</td>
                    <td>${finding.recommendation || 'No recommendation'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was generated by BGuard Suite TMaaS (Threat Modeling as a Service)</p>
        <p>Report ID: ${threatModel.id} | Generated: ${now}</p>
    </div>
</body>
</html>
  `;
}
