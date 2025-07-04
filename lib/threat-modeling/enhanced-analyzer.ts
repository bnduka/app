
// Enhanced threat modeling with industry-standard approaches
import { SecurityFrameworkMapper } from '../security/framework-mapper';

export interface ThreatModelContext {
  systemType: string;
  dataClassification: string;
  networkExposure: string;
  authenticationMethods: string[];
  dataStores: string[];
  trustedBoundaries: string[];
}

export interface EnhancedFinding {
  id: string;
  title: string;
  description: string;
  severity: string;
  strideCategory: string;
  recommendation: string;
  nistControls: string[];
  owaspCategory?: string;
  cvssScore: number;
  asvsLevel: number;
  tags: string[];
  mitigationStrategies: string[];
  references: string[];
}

export class EnhancedThreatAnalyzer {
  // Microsoft Threat Modeling Tool concepts integration
  static generateMicrosoftStyleThreats(context: ThreatModelContext): EnhancedFinding[] {
    const threats: EnhancedFinding[] = [];

    // Data Flow Analysis
    if (context.dataStores.length > 0) {
      threats.push({
        id: 'TMT-001',
        title: 'Unauthorized Data Access',
        description: 'Sensitive data may be accessed by unauthorized entities due to insufficient access controls',
        severity: 'HIGH',
        strideCategory: 'INFORMATION_DISCLOSURE',
        recommendation: 'Implement proper access controls and encryption for data at rest',
        nistControls: SecurityFrameworkMapper.mapStrideToNIST('INFORMATION_DISCLOSURE'),
        owaspCategory: 'A01',
        cvssScore: SecurityFrameworkMapper.calculateCVSSScore('HIGH', { 
          confidentialityImpact: 'HIGH',
          networkAccess: true 
        }),
        asvsLevel: SecurityFrameworkMapper.getASVSLevel('HIGH', 'data_access'),
        tags: ['data-protection', 'access-control', 'microsoft-tmt'],
        mitigationStrategies: [
          'Implement role-based access control (RBAC)',
          'Use encryption for sensitive data',
          'Regular access reviews and audits'
        ],
        references: [
          'https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool',
          'NIST SP 800-53 AC-3'
        ]
      });
    }

    // Trust Boundary Analysis
    if (context.trustedBoundaries.length > 0) {
      threats.push({
        id: 'TMT-002',
        title: 'Trust Boundary Violation',
        description: 'Data or control flow crosses trust boundaries without proper validation',
        severity: 'HIGH',
        strideCategory: 'TAMPERING',
        recommendation: 'Implement input validation and sanitization at trust boundaries',
        nistControls: SecurityFrameworkMapper.mapStrideToNIST('TAMPERING'),
        owaspCategory: 'A03',
        cvssScore: SecurityFrameworkMapper.calculateCVSSScore('HIGH', {
          integrityImpact: 'HIGH',
          privilegesRequired: false
        }),
        asvsLevel: SecurityFrameworkMapper.getASVSLevel('HIGH', 'input_validation'),
        tags: ['trust-boundary', 'input-validation', 'microsoft-tmt'],
        mitigationStrategies: [
          'Implement comprehensive input validation',
          'Use parameterized queries',
          'Apply principle of least privilege'
        ],
        references: [
          'https://owasp.org/www-project-top-ten/',
          'NIST SP 800-53 SI-2'
        ]
      });
    }

    return threats;
  }

  // OWASP Threat Dragon concepts integration
  static generateOWASPStyleThreats(context: ThreatModelContext): EnhancedFinding[] {
    const threats: EnhancedFinding[] = [];

    // Authentication Analysis
    if (context.authenticationMethods.includes('password')) {
      threats.push({
        id: 'OTD-001',
        title: 'Weak Authentication Mechanism',
        description: 'Password-based authentication without additional factors is vulnerable to attacks',
        severity: 'MEDIUM',
        strideCategory: 'SPOOFING',
        recommendation: 'Implement multi-factor authentication and strong password policies',
        nistControls: SecurityFrameworkMapper.mapStrideToNIST('SPOOFING'),
        owaspCategory: 'A07',
        cvssScore: SecurityFrameworkMapper.calculateCVSSScore('MEDIUM', {
          privilegesRequired: false,
          userInteraction: true
        }),
        asvsLevel: SecurityFrameworkMapper.getASVSLevel('MEDIUM', 'authentication'),
        tags: ['authentication', 'password-security', 'owasp-dragon'],
        mitigationStrategies: [
          'Implement multi-factor authentication',
          'Enforce strong password policies',
          'Account lockout mechanisms'
        ],
        references: [
          'https://owasp.org/www-project-threat-dragon/',
          'OWASP Authentication Cheat Sheet'
        ]
      });
    }

    // Network Exposure Analysis
    if (context.networkExposure === 'public') {
      threats.push({
        id: 'OTD-002',
        title: 'Excessive Network Exposure',
        description: 'System components exposed to public networks increase attack surface',
        severity: 'HIGH',
        strideCategory: 'DENIAL_OF_SERVICE',
        recommendation: 'Implement network segmentation and restrict public access',
        nistControls: SecurityFrameworkMapper.mapStrideToNIST('DENIAL_OF_SERVICE'),
        owaspCategory: 'A05',
        cvssScore: SecurityFrameworkMapper.calculateCVSSScore('HIGH', {
          networkAccess: true,
          availabilityImpact: 'HIGH'
        }),
        asvsLevel: SecurityFrameworkMapper.getASVSLevel('HIGH', 'network_security'),
        tags: ['network-security', 'exposure', 'owasp-dragon'],
        mitigationStrategies: [
          'Implement network segmentation',
          'Use firewalls and intrusion detection',
          'Regular security assessments'
        ],
        references: [
          'https://owasp.org/www-project-threat-dragon/',
          'NIST SP 800-53 SC-7'
        ]
      });
    }

    return threats;
  }

  // Comprehensive threat analysis combining both approaches
  static analyzeSystemThreats(
    prompt: string, 
    context: ThreatModelContext
  ): EnhancedFinding[] {
    const allThreats: EnhancedFinding[] = [];

    // Generate Microsoft TMT style threats
    const microsoftThreats = this.generateMicrosoftStyleThreats(context);
    allThreats.push(...microsoftThreats);

    // Generate OWASP Threat Dragon style threats
    const owaspThreats = this.generateOWASPStyleThreats(context);
    allThreats.push(...owaspThreats);

    // Add context-specific analysis
    const contextualThreats = this.generateContextualThreats(prompt, context);
    allThreats.push(...contextualThreats);

    return allThreats;
  }

  private static generateContextualThreats(
    prompt: string, 
    context: ThreatModelContext
  ): EnhancedFinding[] {
    const threats: EnhancedFinding[] = [];

    // Analyze system type specific threats
    if (context.systemType.toLowerCase().includes('web')) {
      threats.push({
        id: 'CTX-001',
        title: 'Cross-Site Scripting (XSS)',
        description: 'Web application may be vulnerable to XSS attacks due to insufficient input sanitization',
        severity: 'MEDIUM',
        strideCategory: 'TAMPERING',
        recommendation: 'Implement comprehensive input validation and output encoding',
        nistControls: ['SI-2', 'CM-2'],
        owaspCategory: 'A03',
        cvssScore: 6.1,
        asvsLevel: 2,
        tags: ['web-security', 'xss', 'input-validation'],
        mitigationStrategies: [
          'Use Content Security Policy (CSP)',
          'Implement proper input validation',
          'Use output encoding/escaping'
        ],
        references: [
          'https://owasp.org/www-community/attacks/xss/',
          'OWASP XSS Prevention Cheat Sheet'
        ]
      });
    }

    if (context.systemType.toLowerCase().includes('api')) {
      threats.push({
        id: 'CTX-002',
        title: 'API Security Misconfiguration',
        description: 'API endpoints may lack proper authentication and rate limiting',
        severity: 'HIGH',
        strideCategory: 'ELEVATION_OF_PRIVILEGE',
        recommendation: 'Implement API authentication, authorization, and rate limiting',
        nistControls: ['AC-3', 'AC-6'],
        owaspCategory: 'A01',
        cvssScore: 7.5,
        asvsLevel: 2,
        tags: ['api-security', 'authentication', 'rate-limiting'],
        mitigationStrategies: [
          'Implement OAuth 2.0 or API keys',
          'Use rate limiting and throttling',
          'Regular API security testing'
        ],
        references: [
          'https://owasp.org/www-project-api-security/',
          'OWASP API Security Top 10'
        ]
      });
    }

    return threats;
  }
}
