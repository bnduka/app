
import { ThreatModelWithDetails, ReportFormat } from './types';

export class ReportGenerator {
  static generateHtmlReport(threatModel: ThreatModelWithDetails, analysisContent: string): string {
    const date = new Date().toLocaleDateString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Analysis Report - ${threatModel.name}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
        .header { border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #007bff; margin: 0; }
        .subtitle { color: #666; margin: 5px 0; }
        .section { margin: 30px 0; }
        .section h2 { color: #007bff; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .threat-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .threat-table th, .threat-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .threat-table th { background-color: #f8f9fa; font-weight: bold; }
        .severity-high { background-color: #ffebee; color: #c62828; }
        .severity-medium { background-color: #fff3e0; color: #ef6c00; }
        .severity-low { background-color: #e8f5e8; color: #2e7d32; }
        .severity-critical { background-color: #ffcdd2; color: #b71c1c; font-weight: bold; }
        .recommendations { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">BGuard Suite - Threat Analysis Report</h1>
        <p class="subtitle">Project: ${threatModel.name}</p>
        <p class="subtitle">Generated: ${date}</p>
        <p class="subtitle">Author: ${`${threatModel.user.firstName || ''} ${threatModel.user.lastName || ''}`.trim() || threatModel.user.name || threatModel.user.email}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <p><strong>Project Description:</strong> ${threatModel.description || 'No description provided'}</p>
        <p><strong>Analysis Scope:</strong> STRIDE-based threat modeling analysis</p>
        <p><strong>Total Findings:</strong> ${threatModel.findings.length}</p>
    </div>

    <div class="section">
        <h2>Input Summary</h2>
        <p><strong>Analysis Prompt:</strong></p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-style: italic;">
            ${threatModel.prompt}
        </div>
        ${threatModel.fileUploads.length > 0 ? `
        <p><strong>Analyzed Documents:</strong></p>
        <ul>
            ${threatModel.fileUploads.map(file => `<li>${file.originalName} (${(file.fileSize / 1024).toFixed(1)} KB)</li>`).join('')}
        </ul>
        ` : ''}
    </div>

    <div class="section">
        <h2>STRIDE Threat Analysis</h2>
        ${threatModel.findings.length > 0 ? `
        <table class="threat-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Threat</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Recommendation</th>
                </tr>
            </thead>
            <tbody>
                ${threatModel.findings.map(finding => `
                <tr>
                    <td><strong>${finding.strideCategory.replace(/_/g, ' ')}</strong></td>
                    <td>${finding.threatScenario}</td>
                    <td class="severity-${finding.severity.toLowerCase()}">${finding.severity}</td>
                    <td>${finding.description}</td>
                    <td>${finding.recommendation || 'No recommendation provided'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p><em>No threats identified in this analysis.</em></p>'}
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        <div class="recommendations">
            ${analysisContent}
        </div>
    </div>

    <div class="section">
        <h2>Appendix</h2>
        <h3>Technical Assumptions</h3>
        <ul>
            <li>Analysis based on STRIDE threat modeling methodology</li>
            <li>Severity levels: Critical, High, Medium, Low</li>
            <li>Recommendations are general guidelines and should be adapted to specific implementation contexts</li>
            <li>Regular reassessment recommended as system evolves</li>
        </ul>
        
        <h3>Generated Information</h3>
        <p><strong>Report Generated:</strong> ${date}</p>
        <p><strong>BGuard Suite Version:</strong> 1.0.0</p>
        <p><strong>Analysis Engine:</strong> GPT-4.1-mini</p>
    </div>
</body>
</html>`;
  }

  static generateTextContent(threatModel: ThreatModelWithDetails): string {
    const date = new Date().toLocaleDateString();
    
    let content = `BGUARD SUITE - THREAT ANALYSIS REPORT\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `Project: ${threatModel.name}\n`;
    content += `Generated: ${date}\n`;
    content += `Author: ${`${threatModel.user.firstName || ''} ${threatModel.user.lastName || ''}`.trim() || threatModel.user.name || threatModel.user.email}\n\n`;
    
    content += `PROJECT DESCRIPTION\n`;
    content += `${'-'.repeat(20)}\n`;
    content += `${threatModel.description || 'No description provided'}\n\n`;
    
    content += `ANALYSIS INPUT\n`;
    content += `${'-'.repeat(15)}\n`;
    content += `${threatModel.prompt}\n\n`;
    
    if (threatModel.fileUploads.length > 0) {
      content += `ANALYZED DOCUMENTS\n`;
      content += `${'-'.repeat(18)}\n`;
      threatModel.fileUploads.forEach(file => {
        content += `- ${file.originalName} (${(file.fileSize / 1024).toFixed(1)} KB)\n`;
      });
      content += `\n`;
    }
    
    content += `STRIDE THREAT ANALYSIS\n`;
    content += `${'-'.repeat(22)}\n`;
    
    if (threatModel.findings.length > 0) {
      threatModel.findings.forEach((finding, index) => {
        content += `${index + 1}. ${finding.threatScenario}\n`;
        content += `   Category: ${finding.strideCategory.replace(/_/g, ' ')}\n`;
        content += `   Severity: ${finding.severity}\n`;
        content += `   Description: ${finding.description}\n`;
        content += `   Recommendation: ${finding.recommendation || 'No recommendation provided'}\n\n`;
      });
    } else {
      content += `No threats identified in this analysis.\n\n`;
    }
    
    return content;
  }
}
