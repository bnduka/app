
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding role management system...');

  // Create test organizations
  console.log('Creating organizations...');
  
  const techCorpOrg = await prisma.organization.upsert({
    where: { name: 'TechCorp Solutions' },
    update: {},
    create: {
      name: 'TechCorp Solutions',
      description: 'A leading technology solutions company'
    },
  });

  const financeProOrg = await prisma.organization.upsert({
    where: { name: 'FinancePro Inc' },
    update: {},
    create: {
      name: 'FinancePro Inc',
      description: 'Financial services and consulting firm'
    },
  });

  const healthTechOrg = await prisma.organization.upsert({
    where: { name: 'HealthTech Innovations' },
    update: {},
    create: {
      name: 'HealthTech Innovations',
      description: 'Healthcare technology and innovation company'
    },
  });

  console.log('✅ Organizations created');

  // Create test users with different roles
  console.log('Creating users with different roles...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Platform Admin (existing admin user)
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@bguard.com' },
    update: {
      role: 'ADMIN',
      organizationId: null, // Platform admin doesn't belong to any specific org
    },
    create: {
      email: 'admin@bguard.com',
      name: 'Platform Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      organizationId: null,
    },
  });

  // TechCorp Users
  const techCorpBusinessAdmin = await prisma.user.upsert({
    where: { email: 'alice.admin@techcorp.com' },
    update: {
      role: 'BUSINESS_ADMIN',
      organizationId: techCorpOrg.id,
    },
    create: {
      email: 'alice.admin@techcorp.com',
      name: 'Alice Johnson',
      password: hashedPassword,
      role: 'BUSINESS_ADMIN',
      organizationId: techCorpOrg.id,
    },
  });

  const techCorpBusinessUser1 = await prisma.user.upsert({
    where: { email: 'bob.dev@techcorp.com' },
    update: {
      role: 'BUSINESS_USER',
      organizationId: techCorpOrg.id,
    },
    create: {
      email: 'bob.dev@techcorp.com',
      name: 'Bob Smith',
      password: hashedPassword,
      role: 'BUSINESS_USER',
      organizationId: techCorpOrg.id,
    },
  });

  const techCorpBusinessUser2 = await prisma.user.upsert({
    where: { email: 'carol.qa@techcorp.com' },
    update: {
      role: 'BUSINESS_USER',
      organizationId: techCorpOrg.id,
    },
    create: {
      email: 'carol.qa@techcorp.com',
      name: 'Carol Williams',
      password: hashedPassword,
      role: 'BUSINESS_USER',
      organizationId: techCorpOrg.id,
    },
  });

  // FinancePro Users
  const financeProBusinessAdmin = await prisma.user.upsert({
    where: { email: 'david.manager@financepro.com' },
    update: {
      role: 'BUSINESS_ADMIN',
      organizationId: financeProOrg.id,
    },
    create: {
      email: 'david.manager@financepro.com',
      name: 'David Brown',
      password: hashedPassword,
      role: 'BUSINESS_ADMIN',
      organizationId: financeProOrg.id,
    },
  });

  const financeProBusinessUser = await prisma.user.upsert({
    where: { email: 'eva.analyst@financepro.com' },
    update: {
      role: 'BUSINESS_USER',
      organizationId: financeProOrg.id,
    },
    create: {
      email: 'eva.analyst@financepro.com',
      firstName: 'Eva',
      lastName: 'Davis',
      password: hashedPassword,
      role: 'BUSINESS_USER',
      organizationId: financeProOrg.id,
    },
  });

  // HealthTech Users
  const healthTechBusinessUser = await prisma.user.upsert({
    where: { email: 'frank.dev@healthtech.com' },
    update: {
      role: 'BUSINESS_USER',
      organizationId: healthTechOrg.id,
    },
    create: {
      email: 'frank.dev@healthtech.com',
      firstName: 'Frank',
      lastName: 'Miller',
      password: hashedPassword,
      role: 'BUSINESS_USER',
      organizationId: healthTechOrg.id,
    },
  });

  // Legacy User (no organization)
  const legacyUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      role: 'USER',
      organizationId: null,
    },
    create: {
      email: 'user@example.com',
      firstName: 'Legacy',
      lastName: 'User',
      password: hashedPassword,
      role: 'USER',
      organizationId: null,
    },
  });

  // Unassigned Business User (for testing)
  const unassignedUser = await prisma.user.upsert({
    where: { email: 'unassigned@example.com' },
    update: {
      role: 'BUSINESS_USER',
      organizationId: null,
    },
    create: {
      email: 'unassigned@example.com',
      firstName: 'Unassigned',
      lastName: 'User',
      password: hashedPassword,
      role: 'BUSINESS_USER',
      organizationId: null,
    },
  });

  console.log('✅ Users created');

  // Create some sample threat models for testing organization scoping
  console.log('Creating sample threat models...');

  const techCorpThreatModel = await prisma.threatModel.create({
    data: {
      name: 'TechCorp Web Application Security Assessment',
      description: 'Security assessment for our main web application',
      prompt: 'Analyze the security of our e-commerce web application with user authentication, payment processing, and data storage.',
      status: 'COMPLETED',
      userId: techCorpBusinessUser1.id,
    },
  });

  const financeProThreatModel = await prisma.threatModel.create({
    data: {
      name: 'FinancePro Trading Platform Analysis',
      description: 'Security analysis of our trading platform',
      prompt: 'Evaluate the security threats for our financial trading platform that handles sensitive customer data and transactions.',
      status: 'COMPLETED',
      userId: financeProBusinessUser.id,
    },
  });

  const healthTechThreatModel = await prisma.threatModel.create({
    data: {
      name: 'HealthTech Patient Portal Security',
      description: 'Security assessment for patient data portal',
      prompt: 'Analyze security threats for our patient portal that stores and manages sensitive health information.',
      status: 'COMPLETED',
      userId: healthTechBusinessUser.id,
    },
  });

  // Create some sample findings
  console.log('Creating sample findings...');

  await prisma.finding.createMany({
    data: [
      {
        threatScenario: 'A malicious user could exploit inadequate input validation to inject SQL commands and compromise database integrity',
        description: 'Potential SQL injection in user authentication system',
        severity: 'HIGH',
        strideCategory: 'TAMPERING',
        recommendation: 'Implement parameterized queries and input validation',
        status: 'OPEN',
        userId: techCorpBusinessUser1.id,
        threatModelId: techCorpThreatModel.id,
      },
      {
        threatScenario: 'An attacker could intercept sensitive data transmitted over unencrypted channels to gain unauthorized access to confidential information',
        description: 'Financial data transmitted without proper encryption',
        severity: 'CRITICAL',
        strideCategory: 'INFORMATION_DISCLOSURE',
        recommendation: 'Implement TLS 1.3 for all financial data transmissions',
        status: 'OPEN',
        userId: financeProBusinessUser.id,
        threatModelId: financeProThreatModel.id,
      },
      {
        threatScenario: 'An unauthorized user could exploit insufficient access controls to escalate privileges and gain administrative access to sensitive system functions',
        description: 'Patient data accessible without proper authorization checks',
        severity: 'HIGH',
        strideCategory: 'ELEVATION_OF_PRIVILEGE',
        recommendation: 'Implement role-based access control and audit logging',
        status: 'IN_PROGRESS',
        userId: healthTechBusinessUser.id,
        threatModelId: healthTechThreatModel.id,
      },
    ],
  });

  // Create some sample reports
  console.log('Creating sample reports...');

  await prisma.report.createMany({
    data: [
      {
        name: 'TechCorp Security Assessment Report',
        format: 'PDF',
        content: JSON.stringify({
          summary: 'Security assessment completed with 3 findings identified',
          findings: ['SQL Injection', 'XSS Vulnerability', 'Weak Authentication'],
        }),
        userId: techCorpBusinessUser1.id,
        threatModelId: techCorpThreatModel.id,
      },
      {
        name: 'FinancePro Trading Security Report',
        format: 'PDF',
        content: JSON.stringify({
          summary: 'Critical security issues found in trading platform',
          findings: ['Data Encryption Issues', 'API Security Gaps'],
        }),
        userId: financeProBusinessUser.id,
        threatModelId: financeProThreatModel.id,
      },
    ],
  });

  console.log('✅ Sample data created');

  // Create some activity logs to demonstrate the new logging system
  console.log('Creating sample activity logs...');

  await prisma.activityLog.createMany({
    data: [
      {
        action: 'LOGIN',
        status: 'SUCCESS',
        description: 'User logged in successfully',
        userId: techCorpBusinessAdmin.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Chrome/91.0)',
      },
      {
        action: 'CREATE_THREAT_MODEL',
        status: 'SUCCESS',
        description: 'Created new threat model: TechCorp Web Application Security Assessment',
        userId: techCorpBusinessUser1.id,
        entityType: 'threat_model',
        entityId: techCorpThreatModel.id,
      },
      {
        action: 'BUSINESS_ADMIN_VIEW_ORG_USERS',
        status: 'SUCCESS',
        description: 'Business admin viewed organization users',
        userId: financeProBusinessAdmin.id,
        details: JSON.stringify({ organizationId: financeProOrg.id }),
      },
    ],
  });

  console.log('✅ Activity logs created');

  // Display summary
  console.log('\n🎉 Role management system seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Organizations: 3`);
  console.log(`- Users: 8 (1 Admin, 2 Business Admins, 4 Business Users, 1 Legacy User)`);
  console.log(`- Threat Models: 3`);
  console.log(`- Findings: 3`);
  console.log(`- Reports: 2`);
  
  console.log('\n👥 Test Accounts:');
  console.log('Platform Admin: admin@bguard.com (password: password123)');
  console.log('TechCorp Business Admin: alice.admin@techcorp.com (password: password123)');
  console.log('TechCorp Business User: bob.dev@techcorp.com (password: password123)');
  console.log('FinancePro Business Admin: david.manager@financepro.com (password: password123)');
  console.log('FinancePro Business User: eva.analyst@financepro.com (password: password123)');
  console.log('Legacy User: user@example.com (password: password123)');
  
  console.log('\n🏢 Organizations:');
  console.log('- TechCorp Solutions (3 users)');
  console.log('- FinancePro Inc (2 users)');
  console.log('- HealthTech Innovations (1 user)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
