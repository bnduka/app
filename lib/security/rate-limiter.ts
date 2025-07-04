
import { NextRequest } from 'next/server';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  private static store: RateLimitStore = {};

  /**
   * Check if request is within rate limit
   */
  static async checkRateLimit(
    identifier: string,
    rule: RateLimitRule
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + rule.windowMs;

    // Clean up expired entries
    this.cleanupExpired();

    // Get or create entry
    let entry = this.store[identifier];
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime,
      };
      this.store[identifier] = entry;
      
      return {
        allowed: true,
        remaining: rule.maxRequests - 1,
        resetTime,
      };
    }

    // Check if limit exceeded
    if (entry.count >= rule.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    
    return {
      allowed: true,
      remaining: rule.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get rate limit identifier from request
   */
  static getIdentifier(request: NextRequest, type: 'ip' | 'user' | 'endpoint' = 'ip', userId?: string): string {
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown';
    
    switch (type) {
      case 'user':
        return userId ? `user:${userId}` : `ip:${ip}`;
      case 'endpoint':
        return `endpoint:${request.nextUrl.pathname}:${ip}`;
      default:
        return `ip:${ip}`;
    }
  }

  /**
   * Create rate limit middleware
   */
  static createMiddleware(rule: RateLimitRule, type: 'ip' | 'user' | 'endpoint' = 'ip') {
    return async (request: NextRequest, userId?: string) => {
      const identifier = this.getIdentifier(request, type, userId);
      const result = await this.checkRateLimit(identifier, rule);
      
      return result;
    };
  }

  /**
   * Predefined rate limit rules
   */
  static rules = {
    // Authentication endpoints
    login: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
    signup: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 signups per hour
    passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 resets per hour
    
    // API endpoints
    api: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
    upload: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
    
    // Admin endpoints
    admin: { windowMs: 60 * 1000, maxRequests: 50 }, // 50 admin requests per minute
    
    // 2FA
    twoFactor: { windowMs: 5 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 5 minutes
  };

  /**
   * Clean up expired entries
   */
  private static cleanupExpired() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }

  /**
   * Reset rate limit for identifier
   */
  static reset(identifier: string) {
    delete this.store[identifier];
  }

  /**
   * Get current rate limit status
   */
  static getStatus(identifier: string): { count: number; resetTime: number } | null {
    const entry = this.store[identifier];
    if (!entry || Date.now() > entry.resetTime) {
      return null;
    }
    return entry;
  }
}
