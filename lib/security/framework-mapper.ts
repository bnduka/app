
// Security framework mapping for findings
export interface NISTControl {
  id: string;
  family: string;
  title: string;
  description: string;
}

export interface OWASPCategory {
  id: string;
  name: string;
  description: string;
  risk: string;
}

export class SecurityFrameworkMapper {
  // NIST SP 800-53 Control mappings
  static readonly NIST_CONTROLS: Record<string, NISTControl> = {
    'AC-1': {
      id: 'AC-1',
      family: 'Access Control',
      title: 'Access Control Policy and Procedures',
      description: 'Develop, document, and disseminate access control policy and procedures'
    },
    'AC-2': {
      id: 'AC-2',
      family: 'Access Control',
      title: 'Account Management',
      description: 'Manage information system accounts'
    },
    'AC-3': {
      id: 'AC-3',
      family: 'Access Control',
      title: 'Access Enforcement',
      description: 'Enforce approved authorizations for logical access'
    },
    'AC-6': {
      id: 'AC-6',
      family: 'Access Control',
      title: 'Least Privilege',
      description: 'Employ the principle of least privilege'
    },
    'AU-1': {
      id: 'AU-1',
      family: 'Audit and Accountability',
      title: 'Audit and Accountability Policy and Procedures',
      description: 'Develop, document, and disseminate audit policy and procedures'
    },
    'AU-2': {
      id: 'AU-2',
      family: 'Audit and Accountability',
      title: 'Audit Events',
      description: 'Determine which events to audit'
    },
    'AU-3': {
      id: 'AU-3',
      family: 'Audit and Accountability',
      title: 'Content of Audit Records',
      description: 'Generate audit records with specific content'
    },
    'CM-1': {
      id: 'CM-1',
      family: 'Configuration Management',
      title: 'Configuration Management Policy and Procedures',
      description: 'Develop, document, and disseminate configuration management policy'
    },
    'CM-2': {
      id: 'CM-2',
      family: 'Configuration Management',
      title: 'Baseline Configuration',
      description: 'Develop and maintain baseline configurations'
    },
    'IA-1': {
      id: 'IA-1',
      family: 'Identification and Authentication',
      title: 'Identification and Authentication Policy and Procedures',
      description: 'Develop, document, and disseminate identification and authentication policy'
    },
    'IA-2': {
      id: 'IA-2',
      family: 'Identification and Authentication',
      title: 'Identification and Authentication (Organizational Users)',
      description: 'Uniquely identify and authenticate organizational users'
    },
    'SC-1': {
      id: 'SC-1',
      family: 'System and Communications Protection',
      title: 'System and Communications Protection Policy and Procedures',
      description: 'Develop, document, and disseminate system and communications protection policy'
    },
    'SC-7': {
      id: 'SC-7',
      family: 'System and Communications Protection',
      title: 'Boundary Protection',
      description: 'Monitor and control communications at external boundaries'
    },
    'SI-1': {
      id: 'SI-1',
      family: 'System and Information Integrity',
      title: 'System and Information Integrity Policy and Procedures',
      description: 'Develop, document, and disseminate system and information integrity policy'
    },
    'SI-2': {
      id: 'SI-2',
      family: 'System and Information Integrity',
      title: 'Flaw Remediation',
      description: 'Identify, report, and correct information system flaws'
    }
  };

  // OWASP Top 10 mappings
  static readonly OWASP_CATEGORIES: Record<string, OWASPCategory> = {
    'A01': {
      id: 'A01',
      name: 'Broken Access Control',
      description: 'Restrictions on what authenticated users are allowed to do are often not properly enforced',
      risk: 'High'
    },
    'A02': {
      id: 'A02',
      name: 'Cryptographic Failures',
      description: 'Failures related to cryptography which often leads to sensitive data exposure',
      risk: 'High'
    },
    'A03': {
      id: 'A03',
      name: 'Injection',
      description: 'Application is vulnerable to injection attacks',
      risk: 'High'
    },
    'A04': {
      id: 'A04',
      name: 'Insecure Design',
      description: 'Represents a broad category of different weaknesses in insecure design',
      risk: 'High'
    },
    'A05': {
      id: 'A05',
      name: 'Security Misconfiguration',
      description: 'Security misconfiguration is commonly seen in applications',
      risk: 'Medium'
    },
    'A06': {
      id: 'A06',
      name: 'Vulnerable and Outdated Components',
      description: 'Using components with known vulnerabilities',
      risk: 'Medium'
    },
    'A07': {
      id: 'A07',
      name: 'Identification and Authentication Failures',
      description: 'Failures in authentication and session management',
      risk: 'Medium'
    },
    'A08': {
      id: 'A08',
      name: 'Software and Data Integrity Failures',
      description: 'Code and infrastructure that does not protect against integrity violations',
      risk: 'Medium'
    },
    'A09': {
      id: 'A09',
      name: 'Security Logging and Monitoring Failures',
      description: 'Insufficient logging and monitoring',
      risk: 'Low'
    },
    'A10': {
      id: 'A10',
      name: 'Server-Side Request Forgery',
      description: 'SSRF flaws occur when web application fetches remote resources without validating user-supplied URL',
      risk: 'Medium'
    }
  };

  static mapStrideToNIST(strideCategory: string): string[] {
    const mappings: Record<string, string[]> = {
      'SPOOFING': ['IA-1', 'IA-2', 'AC-2'],
      'TAMPERING': ['SI-1', 'SI-2', 'CM-1', 'CM-2'],
      'REPUDIATION': ['AU-1', 'AU-2', 'AU-3'],
      'INFORMATION_DISCLOSURE': ['AC-1', 'AC-3', 'SC-1', 'SC-7'],
      'DENIAL_OF_SERVICE': ['SC-1', 'SC-7', 'SI-1'],
      'ELEVATION_OF_PRIVILEGE': ['AC-1', 'AC-3', 'AC-6', 'IA-1']
    };
    
    return mappings[strideCategory] || [];
  }

  static mapStrideToOWASP(strideCategory: string): string[] {
    const mappings: Record<string, string[]> = {
      'SPOOFING': ['A07'], // Identification and Authentication Failures
      'TAMPERING': ['A03', 'A04', 'A08'], // Injection, Insecure Design, Software Integrity
      'REPUDIATION': ['A09'], // Security Logging and Monitoring Failures
      'INFORMATION_DISCLOSURE': ['A01', 'A02'], // Broken Access Control, Cryptographic Failures
      'DENIAL_OF_SERVICE': ['A05', 'A06'], // Security Misconfiguration, Vulnerable Components
      'ELEVATION_OF_PRIVILEGE': ['A01', 'A04'] // Broken Access Control, Insecure Design
    };
    
    return mappings[strideCategory] || [];
  }

  static calculateCVSSScore(severity: string, context: any = {}): number {
    const baseScores: Record<string, number> = {
      'LOW': 3.9,
      'MEDIUM': 6.9,
      'HIGH': 8.9,
      'CRITICAL': 10.0
    };
    
    let score = baseScores[severity] || 0;
    
    // Adjust based on context
    if (context.networkAccess) score += 0.5;
    if (context.privilegesRequired === false) score += 0.3;
    if (context.userInteraction === false) score += 0.2;
    if (context.confidentialityImpact === 'HIGH') score += 0.4;
    if (context.integrityImpact === 'HIGH') score += 0.4;
    if (context.availabilityImpact === 'HIGH') score += 0.4;
    
    return Math.min(10.0, Math.max(0.0, Number(score.toFixed(1))));
  }

  static getASVSLevel(severity: string, category: string): number {
    // OWASP ASVS (Application Security Verification Standard) levels
    if (severity === 'CRITICAL') return 3;
    if (severity === 'HIGH') return 2;
    if (severity === 'MEDIUM') return 1;
    return 1;
  }

  static getSeverityFromCVSS(cvssScore: number): string {
    if (cvssScore >= 9.0) return 'CRITICAL';
    if (cvssScore >= 7.0) return 'HIGH';
    if (cvssScore >= 4.0) return 'MEDIUM';
    return 'LOW';
  }
}
