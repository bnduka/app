
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bguard.com' },
    update: {},
    create: {
      email: 'admin@bguard.com',
      firstName: 'Admin',
      lastName: 'User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      firstName: 'Demo',
      lastName: 'User',
      password: userPassword,
      role: 'USER',
    },
  });

  // Create sample organization
  const organization = await prisma.organization.upsert({
    where: { name: 'TechCorp Solutions' },
    update: {},
    create: {
      name: 'TechCorp Solutions',
      description: 'A leading technology company specializing in enterprise software solutions and cybersecurity services.',
      sessionTimeoutMinutes: 30,
      maxFailedLogins: 3,
      lockoutDurationMinutes: 15,
      requireTwoFactor: false,
      allowSso: true,
    },
  });

  // Create business admin user
  const businessAdminPassword = await bcrypt.hash('admin123', 12);
  const businessAdmin = await prisma.user.upsert({
    where: { email: 'admin@techcorp.com' },
    update: {},
    create: {
      email: 'admin@techcorp.com',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      password: businessAdminPassword,
      role: 'BUSINESS_ADMIN',
      organizationId: organization.id,
      emailVerified: new Date(),
    },
  });

  // Create business user
  const businessUserPassword = await bcrypt.hash('user123', 12);
  const businessUser = await prisma.user.upsert({
    where: { email: 'user@techcorp.com' },
    update: {},
    create: {
      email: 'user@techcorp.com',
      firstName: 'Michael',
      lastName: 'Johnson',
      password: businessUserPassword,
      role: 'BUSINESS_USER',
      organizationId: organization.id,
      emailVerified: new Date(),
    },
  });

  // Create sample threat model for demo user
  const threatModel = await prisma.threatModel.create({
    data: {
      name: 'Corporate Web Application',
      description: 'Multi-tier web application with user management and data processing',
      prompt: 'A modern web application with user authentication, role-based access control, data processing capabilities, and API integrations. The system includes a responsive frontend, backend services, database layer, and third-party service integrations for notifications and analytics.',
      status: 'COMPLETED',
      userId: user.id,
    },
  });

  // Create business threat model
  const businessThreatModel = await prisma.threatModel.create({
    data: {
      name: 'TechCorp Enterprise Platform',
      description: 'Enterprise-grade software platform with advanced security features and multi-tenant architecture',
      prompt: 'A comprehensive enterprise platform featuring microservices architecture, API gateway, distributed database systems, real-time analytics, advanced authentication mechanisms, and comprehensive audit logging. The system handles sensitive customer data and financial transactions with strict compliance requirements.',
      status: 'COMPLETED',
      userId: businessUser.id,
    },
  });

  // Create system tags for enhanced tagging system
  console.log('Creating system tags...');
  const systemTags = [
    {
      name: 'False Positive',
      color: '#ef4444',
      description: 'Finding identified as not a valid security issue',
      isSystemTag: true,
      organizationId: null,
    },
    {
      name: 'Not Applicable',
      color: '#6b7280',
      description: 'Finding does not apply to current system configuration',
      isSystemTag: true,
      organizationId: null,
    },
    {
      name: 'Accepted Risk',
      color: '#f59e0b',
      description: 'Risk acknowledged and accepted by organization',
      isSystemTag: true,
      organizationId: null,
    },
    {
      name: 'In Review',
      color: '#3b82f6',
      description: 'Finding is currently under security review',
      isSystemTag: true,
      organizationId: null,
    },
    {
      name: 'Critical Priority',
      color: '#dc2626',
      description: 'High priority finding requiring immediate attention',
      isSystemTag: true,
      organizationId: null,
    },
  ];

  const createdTags = [];
  for (const tag of systemTags) {
    // For system tags, use findFirst and create pattern since organizationId is null
    let createdTag = await prisma.tag.findFirst({
      where: { 
        name: tag.name, 
        isSystemTag: true,
        organizationId: null 
      }
    });
    
    if (!createdTag) {
      createdTag = await prisma.tag.create({ data: tag });
    }
    
    createdTags.push(createdTag);
  }

  // Create organization-specific tags for TechCorp
  console.log('Creating organization-specific tags...');
  const orgTags = [
    {
      name: 'GDPR Compliance',
      color: '#10b981',
      description: 'Finding related to GDPR compliance requirements',
      isSystemTag: false,
      organizationId: organization.id,
    },
    {
      name: 'SOC2 Required',
      color: '#8b5cf6',
      description: 'Finding requires attention for SOC2 compliance',
      isSystemTag: false,
      organizationId: organization.id,
    },
    {
      name: 'Customer Impact',
      color: '#f97316',
      description: 'Finding has potential customer impact',
      isSystemTag: false,
      organizationId: organization.id,
    },
  ];

  const createdOrgTags = [];
  for (const tag of orgTags) {
    const createdTag = await prisma.tag.upsert({
      where: { name_organizationId: { name: tag.name, organizationId: tag.organizationId } },
      update: {},
      create: tag,
    });
    createdOrgTags.push(createdTag);
  }

  // Create sample assets for the threat model
  console.log('Creating sample assets...');
  const assets = [
    {
      name: 'Authentication API',
      type: 'API' as const,
      description: 'RESTful API endpoints for user authentication and authorization',
      properties: JSON.stringify({
        endpoints: ['/login', '/logout', '/refresh-token'],
        authentication: 'JWT',
        rateLimit: '100 requests/minute'
      }),
      threatModelId: threatModel.id,
    },
    {
      name: 'User Database',
      type: 'DATABASE' as const,
      description: 'PostgreSQL database storing user credentials and profile information',
      properties: JSON.stringify({
        type: 'PostgreSQL',
        encryption: 'AES-256',
        backup: 'Daily automated backups'
      }),
      threatModelId: threatModel.id,
    },
    {
      name: 'Web Frontend',
      type: 'USER_INTERFACE' as const,
      description: 'React-based web application frontend with user interface components',
      properties: JSON.stringify({
        framework: 'React',
        bundler: 'Webpack',
        authentication: 'JWT tokens'
      }),
      threatModelId: threatModel.id,
    },
    {
      name: 'Payment Gateway',
      type: 'THIRD_PARTY_INTEGRATION' as const,
      description: 'External payment processing service integration',
      properties: JSON.stringify({
        provider: 'Stripe',
        protocols: ['HTTPS', 'TLS 1.3'],
        compliance: 'PCI DSS Level 1'
      }),
      threatModelId: threatModel.id,
    },
    {
      name: 'Session Cache',
      type: 'CACHE' as const,
      description: 'Redis cache for storing user session data',
      properties: JSON.stringify({
        type: 'Redis',
        ttl: '24 hours',
        encryption: 'In-transit and at-rest'
      }),
      threatModelId: threatModel.id,
    },
  ];

  const createdAssets = [];
  for (const asset of assets) {
    const createdAsset = await prisma.asset.create({ data: asset });
    createdAssets.push(createdAsset);
  }

  // Create business assets for TechCorp threat model
  console.log('Creating business assets...');
  const businessAssets = [
    {
      name: 'Customer Data Vault',
      type: 'DATABASE' as const,
      description: 'Encrypted database containing sensitive customer information and financial records',
      properties: JSON.stringify({
        type: 'PostgreSQL with encryption',
        compliance: ['GDPR', 'SOC2', 'PCI-DSS'],
        encryption: 'AES-256-GCM',
        accessControl: 'Role-based with audit logging'
      }),
      threatModelId: businessThreatModel.id,
    },
    {
      name: 'API Gateway',
      type: 'API' as const,
      description: 'Enterprise API gateway managing all microservice communications',
      properties: JSON.stringify({
        authentication: 'OAuth 2.0 + JWT',
        rateLimit: '1000 requests/minute',
        protocols: ['HTTPS', 'GraphQL', 'REST'],
        monitoring: 'Real-time threat detection'
      }),
      threatModelId: businessThreatModel.id,
    },
    {
      name: 'Analytics Engine',
      type: 'SERVICE' as const,
      description: 'Real-time data processing and analytics service',
      properties: JSON.stringify({
        framework: 'Apache Kafka + Spark',
        dataRetention: '7 years',
        anonymization: 'Automatic PII scrubbing'
      }),
      threatModelId: businessThreatModel.id,
    },
  ];

  const createdBusinessAssets = [];
  for (const asset of businessAssets) {
    const createdAsset = await prisma.asset.create({ data: asset });
    createdBusinessAssets.push(createdAsset);
  }

  // Create sample findings with threatScenario field
  console.log('Creating sample findings...');
  const findings = [
    {
      threatScenario: 'An unauthenticated attacker could exploit weak authentication mechanisms to gain unauthorized access by performing brute force attacks against user accounts',
      description: 'The authentication system may be vulnerable to brute force attacks due to lack of rate limiting and weak password policies.',
      severity: 'HIGH' as const,
      strideCategory: 'SPOOFING' as const,
      recommendation: 'Implement rate limiting, enforce strong password policies, and consider multi-factor authentication.',
      status: 'OPEN' as const,
      userId: user.id,
      threatModelId: threatModel.id,
    },
    {
      threatScenario: 'A network-based attacker could intercept sensitive data transmitted between client and server by exploiting unencrypted communication channels',
      description: 'Sensitive data might be transmitted without proper encryption, exposing confidential information to potential attackers.',
      severity: 'CRITICAL' as const,
      strideCategory: 'INFORMATION_DISCLOSURE' as const,
      recommendation: 'Ensure all sensitive data is encrypted using TLS 1.3 and implement proper certificate management.',
      status: 'IN_PROGRESS' as const,
      userId: user.id,
      threatModelId: threatModel.id,
    },
    {
      threatScenario: 'A malicious user could manipulate API input parameters to execute injection attacks and compromise application data integrity',
      description: 'API endpoints may not properly validate input data, potentially leading to injection attacks.',
      severity: 'MEDIUM' as const,
      strideCategory: 'TAMPERING' as const,
      recommendation: 'Implement comprehensive input validation and sanitization for all API endpoints.',
      status: 'RESOLVED' as const,
      userId: user.id,
      threatModelId: threatModel.id,
    },
  ];

  const createdFindings = [];
  for (const finding of findings) {
    const createdFinding = await prisma.finding.create({ data: finding });
    createdFindings.push(createdFinding);
  }

  // Create business findings for TechCorp
  console.log('Creating business findings...');
  const businessFindings = [
    {
      threatScenario: 'An insider threat actor with privileged access could exfiltrate sensitive customer data from the encrypted data vault by exploiting inadequate access monitoring',
      description: 'The customer data vault may lack comprehensive access monitoring and behavioral analytics to detect abnormal data access patterns by privileged users.',
      severity: 'CRITICAL' as const,
      strideCategory: 'INFORMATION_DISCLOSURE' as const,
      recommendation: 'Implement zero-trust architecture with continuous monitoring, user behavior analytics, and mandatory break-glass procedures for sensitive data access.',
      status: 'OPEN' as const,
      userId: businessUser.id,
      threatModelId: businessThreatModel.id,
      nistControls: ['AC-2', 'AC-3', 'AU-2', 'AU-6'],
      owaspCategory: 'A01:2021 – Broken Access Control',
      cvssScore: 9.1,
    },
    {
      threatScenario: 'A sophisticated attacker could compromise the API Gateway through supply chain attacks targeting third-party dependencies and gain unauthorized access to backend services',
      description: 'Third-party dependencies in the API Gateway may contain vulnerabilities or malicious code that could be exploited to compromise the entire microservices ecosystem.',
      severity: 'HIGH' as const,
      strideCategory: 'ELEVATION_OF_PRIVILEGE' as const,
      recommendation: 'Implement software composition analysis, dependency scanning, and secure software supply chain practices including SBOM generation and verification.',
      status: 'IN_PROGRESS' as const,
      userId: businessAdmin.id,
      threatModelId: businessThreatModel.id,
      nistControls: ['SA-15', 'SA-17', 'SI-7'],
      owaspCategory: 'A06:2021 – Vulnerable and Outdated Components',
      cvssScore: 8.2,
    },
    {
      threatScenario: 'A malicious actor could perform data poisoning attacks against the analytics engine to manipulate business intelligence and decision-making processes',
      description: 'The real-time analytics engine may be vulnerable to adversarial inputs that could skew data analysis results and lead to incorrect business decisions.',
      severity: 'MEDIUM' as const,
      strideCategory: 'TAMPERING' as const,
      recommendation: 'Implement data validation frameworks, anomaly detection for input data, and segregation of training data from operational data.',
      status: 'OPEN' as const,
      userId: businessUser.id,
      threatModelId: businessThreatModel.id,
      nistControls: ['SI-10', 'SI-15', 'SI-16'],
      owaspCategory: 'A03:2021 – Injection',
      cvssScore: 6.8,
    },
  ];

  const createdBusinessFindings = [];
  for (const finding of businessFindings) {
    const createdFinding = await prisma.finding.create({ data: finding });
    createdBusinessFindings.push(createdFinding);
  }

  // Create finding-asset relationships
  console.log('Creating finding-asset relationships...');
  const findingAssetRelationships = [
    {
      findingId: createdFindings[0].id, // Weak authentication finding
      assetId: createdAssets[0].id,     // Authentication API
      impact: 'DIRECT' as const,
    },
    {
      findingId: createdFindings[0].id, // Weak authentication finding
      assetId: createdAssets[1].id,     // User Database
      impact: 'INDIRECT' as const,
    },
    {
      findingId: createdFindings[1].id, // Unencrypted transmission finding
      assetId: createdAssets[0].id,     // Authentication API
      impact: 'DIRECT' as const,
    },
    {
      findingId: createdFindings[1].id, // Unencrypted transmission finding
      assetId: createdAssets[3].id,     // Payment Gateway
      impact: 'DIRECT' as const,
    },
    {
      findingId: createdFindings[2].id, // Input validation finding
      assetId: createdAssets[0].id,     // Authentication API
      impact: 'DIRECT' as const,
    },
  ];

  for (const relationship of findingAssetRelationships) {
    await prisma.findingAsset.create({ data: relationship });
  }

  // Create sample finding tags with justifications
  console.log('Creating finding tags...');
  const findingTags = [
    {
      findingId: createdFindings[2].id, // Resolved finding
      tagId: createdTags[3].id,         // In Review tag
      justification: 'Finding has been thoroughly reviewed and remediation has been implemented and tested.',
      createdBy: admin.id,
    },
    {
      findingId: createdFindings[0].id, // High severity finding
      tagId: createdTags[4].id,         // Critical Priority tag
      justification: 'High impact on user security requires immediate attention.',
      createdBy: admin.id,
    },
  ];

  for (const findingTag of findingTags) {
    await prisma.findingTag.create({ data: findingTag });
  }

  // Create sample report
  await prisma.report.create({
    data: {
      name: 'Web Application Security Assessment Report',
      format: 'HTML',
      content: '<h1>Security Assessment Report</h1><p>This is a sample report content for the corporate web application security assessment...</p>',
      userId: user.id,
      threatModelId: threatModel.id,
    },
  });

  // Create initial admin stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.adminStats.upsert({
    where: { date: today },
    update: {
      totalUsers: 4, // admin, demo user, business admin, business user
      totalThreatModels: 2, // demo threat model + business threat model
      totalFindings: 6, // 3 demo findings + 3 business findings
      totalReports: 1,
      apiCalls: 10,
    },
    create: {
      date: today,
      totalUsers: 4, // admin, demo user, business admin, business user
      totalThreatModels: 2, // demo threat model + business threat model
      totalFindings: 6, // 3 demo findings + 3 business findings
      totalReports: 1,
      apiCalls: 10,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('🏢 ORGANIZATION: TechCorp Solutions');
  console.log('📧 Business Admin: admin@techcorp.com (password: admin123)');
  console.log('📧 Business User: user@techcorp.com (password: user123)');
  console.log('');
  console.log('🔧 SYSTEM ACCOUNTS:');
  console.log('📧 System Admin: admin@bguard.com (password: admin123)');
  console.log('📧 Demo User: user@example.com (password: user123)');
  console.log('');
  console.log('🎯 BUSINESS FEATURES AVAILABLE:');
  console.log('• Organization-scoped threat models and findings');
  console.log('• Role-based access control (Business Admin vs Business User)');
  console.log('• Organization-specific tags and compliance tracking');
  console.log('• Enterprise-grade assets and security frameworks');
  console.log('• NIST SP 800-53 and OWASP integration');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
