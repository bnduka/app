
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

type Provider = any; // NextAuth Provider type
import { prisma } from '../db';
import { SecurityEventService } from './security-events';

export interface SSOConfig {
  provider: 'google' | 'azure-ad';
  clientId: string;
  clientSecret: string;
  tenantId?: string; // For Azure AD
  domain?: string; // For domain restriction
}

export class SSOProviders {
  /**
   * Get configured SSO providers for an organization
   */
  static async getOrganizationProviders(organizationId: string): Promise<Provider[]> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { allowSso: true, ssoProvider: true, ssoConfig: true },
    });

    if (!organization?.allowSso || !organization.ssoConfig) {
      return [];
    }

    try {
      const config: SSOConfig = JSON.parse(organization.ssoConfig);
      return this.createProviders([config]);
    } catch (error) {
      console.error('Error parsing SSO config:', error);
      return [];
    }
  }

  /**
   * Create NextAuth providers from configuration
   */
  static createProviders(configs: SSOConfig[]): Provider[] {
    return configs.map(config => {
      switch (config.provider) {
        case 'google':
          return GoogleProvider({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            authorization: {
              params: {
                scope: 'openid email profile',
                ...(config.domain && { hd: config.domain }),
              },
            },
          });

        case 'azure-ad':
          return AzureADProvider({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            tenantId: config.tenantId || 'common',
          });

        default:
          throw new Error(`Unsupported SSO provider: ${config.provider}`);
      }
    });
  }

  /**
   * Configure SSO for an organization
   */
  static async configureSSOForOrganization(
    organizationId: string,
    config: SSOConfig,
    enable: boolean = true
  ) {
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        allowSso: enable,
        ssoProvider: enable ? config.provider : null,
        ssoConfig: enable ? JSON.stringify(config) : null,
      },
    });

    await SecurityEventService.logEvent({
      eventType: 'SETTINGS_CHANGED',
      severity: 'MEDIUM',
      description: `SSO ${enable ? 'enabled' : 'disabled'} for organization`,
      metadata: {
        organizationId,
        provider: config.provider,
        action: enable ? 'enable' : 'disable',
      },
    });

    return organization;
  }

  /**
   * Validate SSO login domain restrictions
   */
  static async validateSSODomain(email: string, organizationId?: string): Promise<boolean> {
    if (!organizationId) return true;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ssoConfig: true },
    });

    if (!organization?.ssoConfig) return true;

    try {
      const config: SSOConfig = JSON.parse(organization.ssoConfig);
      
      if (config.domain) {
        const emailDomain = email.split('@')[1];
        return emailDomain === config.domain;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating SSO domain:', error);
      return false;
    }
  }

  /**
   * Handle SSO login success
   */
  static async handleSSOLoginSuccess(
    userId: string,
    provider: string,
    providerAccountId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Update user's last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    // Log SSO login event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'SSO_LOGIN',
      severity: 'LOW',
      description: `Successful SSO login via ${provider}`,
      ipAddress,
      userAgent,
      metadata: {
        provider,
        providerAccountId,
      },
    });

    return { success: true };
  }

  /**
   * Handle SSO login failure
   */
  static async handleSSOLoginFailure(
    email: string,
    provider: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Try to find user for logging
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    await SecurityEventService.logEvent({
      userId: user?.id,
      eventType: 'SSO_FAILED',
      severity: 'MEDIUM',
      description: `SSO login failed via ${provider}: ${reason}`,
      ipAddress,
      userAgent,
      metadata: {
        provider,
        email,
        reason,
      },
    });

    return { success: false, error: reason };
  }

  /**
   * Get SSO statistics
   */
  static async getSSOStats(organizationId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const where: any = {
      createdAt: { gte: startDate },
      eventType: { in: ['SSO_LOGIN', 'SSO_FAILED'] },
    };

    if (organizationId) {
      where.user = { organizationId };
    }

    const [
      totalSSOLogins,
      failedSSOLogins,
      organizationsWithSSO,
      ssoEvents
    ] = await Promise.all([
      prisma.securityEvent.count({
        where: { ...where, eventType: 'SSO_LOGIN' },
      }),
      prisma.securityEvent.count({
        where: { ...where, eventType: 'SSO_FAILED' },
      }),
      prisma.organization.count({
        where: { allowSso: true },
      }),
      prisma.securityEvent.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
        lastName: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      totalSSOLogins,
      failedSSOLogins,
      successRate: totalSSOLogins > 0 ? ((totalSSOLogins / (totalSSOLogins + failedSSOLogins)) * 100) : 0,
      organizationsWithSSO,
      ssoEvents,
      period: `${days} days`,
    };
  }

  /**
   * Validate SSO configuration
   */
  static validateSSOConfig(config: SSOConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.clientId) {
      errors.push('Client ID is required');
    }

    if (!config.clientSecret) {
      errors.push('Client Secret is required');
    }

    if (config.provider === 'azure-ad' && !config.tenantId) {
      errors.push('Tenant ID is required for Azure AD');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test SSO configuration
   */
  static async testSSOConfig(config: SSOConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = this.validateSSOConfig(config);
      
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Create a test provider to validate configuration
      const testProviders = this.createProviders([config]);
      
      if (testProviders.length === 0) {
        return { success: false, error: 'Failed to create provider' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get available SSO provider types
   */
  static getAvailableProviders() {
    return [
      {
        id: 'google',
        name: 'Google Workspace',
        description: 'Login with Google Workspace accounts',
        requiresDomain: true,
        fields: [
          { name: 'clientId', label: 'Client ID', required: true },
          { name: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { name: 'domain', label: 'Domain (optional)', required: false, placeholder: 'company.com' },
        ],
      },
      {
        id: 'azure-ad',
        name: 'Microsoft Azure AD',
        description: 'Login with Microsoft Azure Active Directory',
        requiresTenant: true,
        fields: [
          { name: 'clientId', label: 'Application ID', required: true },
          { name: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { name: 'tenantId', label: 'Tenant ID', required: true },
        ],
      },
    ];
  }
}
