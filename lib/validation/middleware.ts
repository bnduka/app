
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
}

export function validateData<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: ['Validation failed'] } };
  }
}

export function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    // Basic HTML sanitization
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    }).trim();
  }
  
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeInput);
    }
    
    const sanitized: Record<string, unknown> = {};
    Object.entries(input).forEach(([key, value]) => {
      // Sanitize key to prevent prototype pollution
      const cleanKey = DOMPurify.sanitize(key, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      });
      
      if (cleanKey && !['__proto__', 'constructor', 'prototype'].includes(cleanKey)) {
        sanitized[cleanKey] = sanitizeInput(value);
      }
    });
    return sanitized;
  }
  
  return input;
}

export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async (req: NextRequest): Promise<{ success: boolean; data?: T; response?: NextResponse }> => {
    try {
      const rawData = await req.json();
      const sanitizedData = sanitizeInput(rawData);
      const result = validateData(schema, sanitizedData);
      
      if (!result.success) {
        return {
          success: false,
          response: NextResponse.json(
            { 
              error: 'Validation failed', 
              details: result.errors 
            },
            { status: 400 }
          )
        };
      }
      
      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid JSON payload' },
          { status: 400 }
        )
      };
    }
  };
}

export function validateQueryParams<T>(schema: ZodSchema<T>, searchParams: URLSearchParams): ValidationResult<T> {
  const params: Record<string, string | string[]> = {};
  
  searchParams.forEach((value, key) => {
    const sanitizedKey = DOMPurify.sanitize(key, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    const sanitizedValue = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    
    if (sanitizedKey && !['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
      if (params[sanitizedKey]) {
        if (Array.isArray(params[sanitizedKey])) {
          (params[sanitizedKey] as string[]).push(sanitizedValue);
        } else {
          params[sanitizedKey] = [params[sanitizedKey] as string, sanitizedValue];
        }
      } else {
        params[sanitizedKey] = sanitizedValue;
      }
    }
  });
  
  return validateData(schema, params);
}

export function validatePathParams<T>(schema: ZodSchema<T>, params: Record<string, string>): ValidationResult<T> {
  const sanitizedParams: Record<string, string> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    const sanitizedKey = DOMPurify.sanitize(key, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    const sanitizedValue = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    
    if (sanitizedKey && !['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
      sanitizedParams[sanitizedKey] = sanitizedValue;
    }
  });
  
  return validateData(schema, sanitizedParams);
}

// SQL injection prevention utility
export function escapeSqlLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// XSS prevention utility
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
}

// Rate limiting validation utility
export function validateRateLimitHeaders(req: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  ).slice(0, 45); // Limit IP length
  
  const userAgent = (req.headers.get('user-agent') || 'unknown').slice(0, 500); // Limit UA length
  
  return {
    ipAddress: DOMPurify.sanitize(ipAddress, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
    userAgent: DOMPurify.sanitize(userAgent, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  };
}

// File validation utility
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

export function validateFileSize(size: number, maxSizeBytes: number): boolean {
  return size > 0 && size <= maxSizeBytes;
}

// Common error response utility
export function createErrorResponse(message: string, status: number = 400, details?: unknown): NextResponse {
  const response: Record<string, unknown> = {
    error: message,
    timestamp: new Date().toISOString(),
  };
  
  if (details) {
    response.details = details;
  }
  
  return NextResponse.json(response, { status });
}

// Common success response utility
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200): NextResponse {
  const response: Record<string, unknown> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (message) {
    response.message = message;
  }
  
  return NextResponse.json(response, { status });
}
