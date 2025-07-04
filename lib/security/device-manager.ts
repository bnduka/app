
import { prisma } from '../db';
import { DeviceType } from '@prisma/client';
import { EncryptionService } from './encryption';
import { SecurityEventService } from './security-events';

interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
}

export class DeviceManager {
  /**
   * Register a new device for a user
   */
  static async registerDevice(userId: string, deviceInfo: DeviceInfo) {
    const deviceId = EncryptionService.generateDeviceFingerprint(
      deviceInfo.userAgent,
      deviceInfo.ipAddress
    );

    // Check if device already exists
    const existingDevice = await prisma.userDevice.findUnique({
      where: { deviceId },
    });

    if (existingDevice) {
      // Update last active time
      return await prisma.userDevice.update({
        where: { deviceId },
        data: {
          lastActiveAt: new Date(),
          ipAddress: deviceInfo.ipAddress,
          location: deviceInfo.location,
        },
      });
    }

    // Create new device
    const device = await prisma.userDevice.create({
      data: {
        userId,
        deviceId,
        deviceName: deviceInfo.deviceName || this.generateDeviceName(deviceInfo),
        deviceType: this.detectDeviceType(deviceInfo.userAgent),
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        browser: deviceInfo.browser || this.detectBrowser(deviceInfo.userAgent),
        os: deviceInfo.os || this.detectOS(deviceInfo.userAgent),
        location: deviceInfo.location,
        isActive: true,
        isTrusted: false,
        lastActiveAt: new Date(),
      },
    });

    // Log device registration event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_REGISTERED',
      severity: 'LOW',
      description: `New device registered: ${device.deviceName}`,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      metadata: {
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
      },
    });

    return device;
  }

  /**
   * Get user's devices
   */
  static async getUserDevices(userId: string, includeInactive: boolean = false) {
    const where: any = { userId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return await prisma.userDevice.findMany({
      where,
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Trust a device
   */
  static async trustDevice(deviceId: string, userId: string) {
    const device = await prisma.userDevice.update({
      where: { 
        deviceId,
        userId, // Ensure user owns the device
      },
      data: { isTrusted: true },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_REGISTERED',
      severity: 'LOW',
      description: `Device marked as trusted: ${device.deviceName}`,
      metadata: { deviceId, action: 'trusted' },
    });

    return device;
  }

  /**
   * Remove/deactivate a device
   */
  static async removeDevice(deviceId: string, userId: string) {
    const device = await prisma.userDevice.update({
      where: { 
        deviceId,
        userId, // Ensure user owns the device
      },
      data: { 
        isActive: false,
        lastActiveAt: new Date(),
      },
    });

    // Terminate all sessions for this device
    await prisma.userSession.updateMany({
      where: {
        deviceId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'DEVICE_REMOVED',
      },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_REMOVED',
      severity: 'MEDIUM',
      description: `Device removed: ${device.deviceName}`,
      metadata: { deviceId, deviceName: device.deviceName },
    });

    return device;
  }

  /**
   * Check if device is trusted
   */
  static async isDeviceTrusted(deviceId: string): Promise<boolean> {
    const device = await prisma.userDevice.findUnique({
      where: { deviceId },
      select: { isTrusted: true, isActive: true },
    });

    return device?.isTrusted && device?.isActive || false;
  }

  /**
   * Update device location and activity
   */
  static async updateDeviceActivity(deviceId: string, location?: string) {
    return await prisma.userDevice.update({
      where: { deviceId },
      data: {
        lastActiveAt: new Date(),
        location: location || undefined,
      },
    });
  }

  /**
   * Clean up inactive devices
   */
  static async cleanupInactiveDevices(daysInactive: number = 90) {
    const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);
    
    const result = await prisma.userDevice.updateMany({
      where: {
        lastActiveAt: { lt: cutoffDate },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  /**
   * Detect device type from user agent
   */
  private static detectDeviceType(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'MOBILE';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'TABLET';
    } else if (ua.includes('desktop') || ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) {
      return 'DESKTOP';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Detect browser from user agent
   */
  private static detectBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    
    return 'Unknown';
  }

  /**
   * Detect operating system from user agent
   */
  private static detectOS(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    
    return 'Unknown';
  }

  /**
   * Generate device name
   */
  private static generateDeviceName(deviceInfo: DeviceInfo): string {
    const browser = this.detectBrowser(deviceInfo.userAgent);
    const os = this.detectOS(deviceInfo.userAgent);
    const deviceType = this.detectDeviceType(deviceInfo.userAgent);
    
    return `${browser} on ${os} (${deviceType})`;
  }

  /**
   * Get device statistics
   */
  static async getDeviceStats(userId?: string, organizationId?: string) {
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    } else if (organizationId) {
      where.user = { organizationId };
    }

    const [
      totalDevices,
      activeDevices,
      trustedDevices,
      devicesByType,
      recentActivity
    ] = await Promise.all([
      prisma.userDevice.count({ where }),
      prisma.userDevice.count({ where: { ...where, isActive: true } }),
      prisma.userDevice.count({ where: { ...where, isTrusted: true, isActive: true } }),
      prisma.userDevice.groupBy({
        by: ['deviceType'],
        where: { ...where, isActive: true },
        _count: true,
      }),
      prisma.userDevice.count({
        where: {
          ...where,
          isActive: true,
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalDevices,
      activeDevices,
      trustedDevices,
      devicesByType: devicesByType.reduce((acc, item) => {
        acc[item.deviceType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentActivity,
    };
  }
}
