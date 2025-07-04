
/**
 * OWASP ZAP Integration Service
 * Handles automated endpoint discovery using OWASP ZAP's API
 */

import { RateLimiter } from './rate-limiter';

interface ZapConfig {
  apiUrl: string;
  apiKey?: string;
  maxDepth: number;
  includeSubdomains: boolean;
  followRedirects: boolean;
  customHeaders?: Record<string, string>;
  authConfig?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials: Record<string, string>;
  };
}

interface ZapScanResult {
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  urls: ZapDiscoveredUrl[];
  errors?: string[];
}

interface ZapDiscoveredUrl {
  url: string;
  method: string;
  statusCode: number;
  responseTime: number;
  responseSize: number;
  contentType?: string;
  serverHeader?: string;
  depth: number;
  parentUrl?: string;
  forms?: any[];
  securityHeaders?: Record<string, string>;
  cookies?: any[];
}

export class ZapIntegrationService {
  private zapApiUrl: string;
  private zapApiKey?: string;

  constructor() {
    // Default to local ZAP instance, can be configured
    this.zapApiUrl = process.env.ZAP_API_URL || 'http://localhost:8080';
    this.zapApiKey = process.env.ZAP_API_KEY;
  }

  /**
   * Validates domain and checks if scanning is allowed
   */
  async validateDomain(domain: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Remove protocol if present
      const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
      
      // Basic domain validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
      if (!domainRegex.test(cleanDomain)) {
        return { valid: false, reason: 'Invalid domain format' };
      }

      // Check for localhost/private IPs (security constraint)
      const privateRanges = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^169\.254\./, // Link-local
        /^::1$/, // IPv6 localhost
        /^fc00::/i, // IPv6 private
      ];

      for (const range of privateRanges) {
        if (range.test(cleanDomain)) {
          return { valid: false, reason: 'Private/localhost addresses not allowed' };
        }
      }

      // Check domain reachability
      try {
        const testUrl = `https://${cleanDomain}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok && response.status >= 400) {
          return { valid: false, reason: `Domain unreachable (${response.status})` };
        }
      } catch (error) {
        return { valid: false, reason: 'Domain unreachable or invalid' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Domain validation error:', error);
      return { valid: false, reason: 'Validation failed' };
    }
  }

  /**
   * Checks rate limiting for domain scanning
   */
  async checkRateLimit(userId: string, domain: string): Promise<{ allowed: boolean; remaining?: number }> {
    try {
      const key = `zap-scan:${userId}:${domain}`;
      const result = await RateLimiter.checkRateLimit(key, {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // Max 10 scans per minute
      });
      return {
        allowed: result.allowed,
        remaining: result.remaining,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: false };
    }
  }

  /**
   * Starts a new ZAP scanning session
   */
  async startScan(domain: string, config: ZapConfig): Promise<{ sessionId: string; success: boolean; error?: string }> {
    try {
      // Validate domain first
      const validation = await this.validateDomain(domain);
      if (!validation.valid) {
        return { sessionId: '', success: false, error: validation.reason };
      }

      // Create new session
      const sessionResponse = await this.zapApiCall('/JSON/core/action/newSession/', {
        name: `scan_${domain}_${Date.now()}`,
      });

      if (!sessionResponse.success) {
        return { sessionId: '', success: false, error: 'Failed to create ZAP session' };
      }

      const sessionId = sessionResponse.data?.session || `session_${Date.now()}`;

      // Configure context
      await this.configureContext(sessionId, domain, config);

      // Start spider scan
      const spiderResponse = await this.zapApiCall('/JSON/spider/action/scan/', {
        url: `https://${domain}`,
        maxChildren: config.maxDepth.toString(),
        recurse: config.includeSubdomains.toString(),
        contextName: sessionId,
      });

      if (!spiderResponse.success) {
        return { sessionId, success: false, error: 'Failed to start spider scan' };
      }

      return { sessionId, success: true };
    } catch (error) {
      console.error('ZAP scan start failed:', error);
      return { sessionId: '', success: false, error: 'Internal scan error' };
    }
  }

  /**
   * Configures ZAP scanning context
   */
  private async configureContext(sessionId: string, domain: string, config: ZapConfig): Promise<void> {
    try {
      // Create context
      await this.zapApiCall('/JSON/context/action/newContext/', {
        contextName: sessionId,
      });

      // Include in context
      await this.zapApiCall('/JSON/context/action/includeInContext/', {
        contextName: sessionId,
        regex: `https?://${domain}.*`,
      });

      // Configure authentication if provided
      if (config.authConfig) {
        await this.configureAuthentication(sessionId, config.authConfig);
      }

      // Set custom headers if provided
      if (config.customHeaders) {
        for (const [key, value] of Object.entries(config.customHeaders)) {
          await this.zapApiCall('/JSON/replacer/action/addRule/', {
            description: `Custom header ${key}`,
            enabled: 'true',
            matchType: 'REQ_HEADER',
            matchString: key,
            replacement: value,
          });
        }
      }
    } catch (error) {
      console.error('ZAP context configuration failed:', error);
    }
  }

  /**
   * Configures authentication for ZAP
   */
  private async configureAuthentication(sessionId: string, authConfig: ZapConfig['authConfig']): Promise<void> {
    if (!authConfig) return;

    try {
      switch (authConfig.type) {
        case 'basic':
          await this.zapApiCall('/JSON/authentication/action/setAuthenticationMethod/', {
            contextId: sessionId,
            authMethodName: 'httpAuthentication',
            authMethodConfigParams: `username=${authConfig.credentials.username}&password=${authConfig.credentials.password}`,
          });
          break;
        case 'bearer':
          await this.zapApiCall('/JSON/replacer/action/addRule/', {
            description: 'Bearer token',
            enabled: 'true',
            matchType: 'REQ_HEADER',
            matchString: 'Authorization',
            replacement: `Bearer ${authConfig.credentials.token}`,
          });
          break;
        case 'cookie':
          // Configure session management for cookie-based auth
          await this.zapApiCall('/JSON/sessionManagement/action/setSessionManagementMethod/', {
            contextId: sessionId,
            methodName: 'cookieBasedSessionManagement',
          });
          break;
      }
    } catch (error) {
      console.error('Authentication configuration failed:', error);
    }
  }

  /**
   * Gets the current scan status and progress
   */
  async getScanStatus(sessionId: string): Promise<ZapScanResult> {
    try {
      // Get spider status
      const spiderStatus = await this.zapApiCall('/JSON/spider/view/status/');
      const progress = parseInt(spiderStatus.data?.status || '0');

      // Get discovered URLs
      const urlsResponse = await this.zapApiCall('/JSON/spider/view/results/');
      const urls = await this.parseDiscoveredUrls(urlsResponse.data?.results || []);

      return {
        sessionId,
        status: progress === 100 ? 'completed' : progress > 0 ? 'running' : 'pending',
        progress,
        urls,
      };
    } catch (error) {
      console.error('Failed to get scan status:', error);
      return {
        sessionId,
        status: 'failed',
        progress: 0,
        urls: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Parses discovered URLs from ZAP results
   */
  private async parseDiscoveredUrls(zapUrls: any[]): Promise<ZapDiscoveredUrl[]> {
    const discoveredUrls: ZapDiscoveredUrl[] = [];

    for (const zapUrl of zapUrls) {
      try {
        // Get additional details for each URL
        const details = await this.getUrlDetails(zapUrl.url);
        
        discoveredUrls.push({
          url: zapUrl.url,
          method: zapUrl.method || 'GET',
          statusCode: details.statusCode || 200,
          responseTime: details.responseTime || 0,
          responseSize: details.responseSize || 0,
          contentType: details.contentType,
          serverHeader: details.serverHeader,
          depth: zapUrl.depth || 0,
          parentUrl: zapUrl.referer,
          forms: details.forms || [],
          securityHeaders: details.securityHeaders || {},
          cookies: details.cookies || [],
        });
      } catch (error) {
        console.error(`Failed to parse URL ${zapUrl.url}:`, error);
      }
    }

    return discoveredUrls;
  }

  /**
   * Gets detailed information about a specific URL
   */
  private async getUrlDetails(url: string): Promise<Partial<ZapDiscoveredUrl>> {
    try {
      // Use ZAP to get response details
      const response = await this.zapApiCall('/JSON/core/view/httpMessagesHarByBaseUrl/', {
        baseurl: url,
        start: '0',
        count: '1',
      });

      const harData = response.data?.httpMessagesHar;
      if (!harData || !harData.log || !harData.log.entries || harData.log.entries.length === 0) {
        return {};
      }

      const entry = harData.log.entries[0];
      const responseData = entry.response;

      return {
        statusCode: responseData.status,
        responseTime: entry.time,
        responseSize: responseData.bodySize,
        contentType: responseData.headers.find((h: any) => h.name.toLowerCase() === 'content-type')?.value,
        serverHeader: responseData.headers.find((h: any) => h.name.toLowerCase() === 'server')?.value,
        securityHeaders: this.extractSecurityHeaders(responseData.headers),
        cookies: responseData.cookies || [],
      };
    } catch (error) {
      console.error('Failed to get URL details:', error);
      return {};
    }
  }

  /**
   * Extracts security-relevant headers
   */
  private extractSecurityHeaders(headers: any[]): Record<string, string> {
    const securityHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy',
    ];

    const result: Record<string, string> = {};
    
    for (const header of headers) {
      if (securityHeaders.includes(header.name.toLowerCase())) {
        result[header.name.toLowerCase()] = header.value;
      }
    }

    return result;
  }

  /**
   * Makes API call to ZAP
   */
  private async zapApiCall(endpoint: string, params: Record<string, string> = {}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = new URL(endpoint, this.zapApiUrl);
      
      // Add API key if configured
      if (this.zapApiKey) {
        url.searchParams.set('zapapikey', this.zapApiKey);
      }

      // Add parameters
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `ZAP API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('ZAP API call failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Stops a running scan
   */
  async stopScan(sessionId: string): Promise<boolean> {
    try {
      const response = await this.zapApiCall('/JSON/spider/action/stop/');
      return response.success;
    } catch (error) {
      console.error('Failed to stop scan:', error);
      return false;
    }
  }

  /**
   * Cleans up ZAP session and resources
   */
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      // Remove session
      await this.zapApiCall('/JSON/core/action/deleteSession/', {
        session: sessionId,
      });

      // Clear spider results
      await this.zapApiCall('/JSON/spider/action/clearExcludedFromScan/');
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }
}

export const zapIntegration = new ZapIntegrationService();
