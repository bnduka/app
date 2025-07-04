
import { prisma } from '../db';
import { EncryptionService } from './encryption';
import { SecurityEventService } from './security-events';

export interface ApiKeyScope {
  resource: string;
  actions: string[];
}

export class ApiKeyManager {
  /**
   * Generate a new API key for user
   */
  static async generateApiKey(
    userId: string,
    name: string,
    scopes: string[] = [],
    expiresInDays?: number
  ) {
    // Generate API key
    const key = `bguard_${EncryptionService.generateToken(32)}`;
    const keyHash = EncryptionService.hashApiKey(key);
    
    // Set expiration if provided
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key,
        keyHash,
        userId,
        scopes,
        expiresAt,
      },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'API_KEY_CREATED',
      severity: 'LOW',
      description: `API key created: ${name}`,
      metadata: {
        apiKeyId: apiKey.id,
        name,
        scopes,
        expiresAt: expiresAt?.toISOString(),
      },
    });

    return { ...apiKey, key }; // Return the plain key only once
  }

  /**
   * Validate API key and get user
   */
  static async validateApiKey(key: string) {
    if (!key.startsWith('bguard_')) {
      return null;
    }

    const keyHash = EncryptionService.hashApiKey(key);
    
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          include: { organization: true },
        },
      },
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      await this.deactivateApiKey(apiKey.id, 'EXPIRED');
      return null;
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    await SecurityEventService.logEvent({
      userId: apiKey.userId,
      eventType: 'API_KEY_USED',
      severity: 'LOW',
      description: `API key used: ${apiKey.name}`,
      metadata: {
        apiKeyId: apiKey.id,
        name: apiKey.name,
      },
    });

    return {
      user: apiKey.user,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes,
      },
    };
  }

  /**
   * Check if API key has specific scope
   */
  static hasScope(scopes: string[], requiredScope: string): boolean {
    return scopes.includes('*') || scopes.includes(requiredScope);
  }

  /**
   * Get user's API keys
   */
  static async getUserApiKeys(userId: string) {
    return await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deactivate API key
   */
  static async deactivateApiKey(apiKeyId: string, reason: string = 'USER_REQUEST') {
    const apiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    });

    await SecurityEventService.logEvent({
      userId: apiKey.userId,
      eventType: 'API_KEY_DELETED',
      severity: 'MEDIUM',
      description: `API key deactivated: ${apiKey.name}`,
      metadata: {
        apiKeyId,
        name: apiKey.name,
        reason,
      },
    });

    return apiKey;
  }

  /**
   * Rotate API key
   */
  static async rotateApiKey(apiKeyId: string) {
    const existingKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!existingKey) {
      throw new Error('API key not found');
    }

    // Generate new key
    const newKey = `bguard_${EncryptionService.generateToken(32)}`;
    const newKeyHash = EncryptionService.hashApiKey(newKey);

    // Update the key
    const updatedKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        key: newKey,
        keyHash: newKeyHash,
        lastUsedAt: null,
      },
    });

    await SecurityEventService.logEvent({
      userId: existingKey.userId,
      eventType: 'API_KEY_CREATED',
      severity: 'MEDIUM',
      description: `API key rotated: ${existingKey.name}`,
      metadata: {
        apiKeyId,
        name: existingKey.name,
        action: 'rotate',
      },
    });

    return { ...updatedKey, key: newKey };
  }

  /**
   * Clean up expired API keys
   */
  static async cleanupExpiredKeys() {
    const result = await prisma.apiKey.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  }

  /**
   * Get API key usage statistics
   */
  static async getApiKeyStats(userId?: string, organizationId?: string) {
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    } else if (organizationId) {
      where.user = { organizationId };
    }

    const [
      totalKeys,
      activeKeys,
      recentlyUsed,
      expiringSoon
    ] = await Promise.all([
      prisma.apiKey.count({ where }),
      prisma.apiKey.count({ where: { ...where, isActive: true } }),
      prisma.apiKey.count({
        where: {
          ...where,
          isActive: true,
          lastUsedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.apiKey.count({
        where: {
          ...where,
          isActive: true,
          expiresAt: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      totalKeys,
      activeKeys,
      recentlyUsed,
      expiringSoon,
    };
  }

  /**
   * Available API scopes
   */
  static getAvailableScopes(): ApiKeyScope[] {
    return [
      {
        resource: 'threat-models',
        actions: ['read', 'write', 'delete'],
      },
      {
        resource: 'findings',
        actions: ['read', 'write', 'delete'],
      },
      {
        resource: 'reports',
        actions: ['read', 'generate'],
      },
      {
        resource: 'uploads',
        actions: ['read', 'write', 'delete'],
      },
      {
        resource: 'admin',
        actions: ['read', 'write'],
      },
    ];
  }

  /**
   * Validate scope format
   */
  static validateScopes(scopes: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const availableScopes = this.getAvailableScopes();
    const validScopes = new Set(['*']);

    // Build valid scopes list
    availableScopes.forEach(scope => {
      scope.actions.forEach(action => {
        validScopes.add(`${scope.resource}:${action}`);
      });
      validScopes.add(`${scope.resource}:*`);
    });

    // Validate each scope
    scopes.forEach(scope => {
      if (!validScopes.has(scope)) {
        errors.push(`Invalid scope: ${scope}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
