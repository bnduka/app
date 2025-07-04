

import nodemailer from 'nodemailer';
import { EncryptionService } from './encryption';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email service with robust configuration and testing
   */
  static async initialize() {
    if (this.transporter) return this.transporter;

    // Check if SMTP is configured
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    let config: EmailConfig;

    if (hasSmtpConfig) {
      // Use production SMTP configuration
      config = {
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      };
      console.log('Email service: Using production SMTP configuration');
    } else {
      // For development, create a reliable test account
      try {
        const testAccount = await nodemailer.createTestAccount();
        config = {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        };
        console.log('Email service: Using Ethereal test account:', {
          user: testAccount.user,
          viewUrl: 'https://ethereal.email'
        });
      } catch (error) {
        console.error('Failed to create test account, using fallback configuration:', error);
        // Fallback to a working test configuration
        config = {
          host: 'smtp.mailtrap.io',
          port: 2525,
          secure: false,
          auth: {
            user: 'test',
            pass: 'test',
          },
        };
      }
    }

    try {
      this.transporter = nodemailer.createTransport(config);
      
      // Test the connection
      await this.transporter.verify();
      console.log('Email service: Connection verified successfully');
      
      return this.transporter;
    } catch (error) {
      console.error('Email service: Connection verification failed:', error);
      throw new Error('Failed to initialize email service');
    }
  }

  /**
   * Test email service functionality
   */
  static async testEmailService(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      await this.initialize();
      
      // Send a test email to verify everything works
      const testEmail = {
        to: 'test@example.com',
        subject: 'BGuard Email Service Test',
        html: '<p>This is a test email from BGuard Suite to verify email service functionality.</p>',
        text: 'This is a test email from BGuard Suite to verify email service functionality.',
      };

      const info = await this.sendEmail(testEmail);
      
      return {
        success: true,
        details: {
          messageId: info.messageId,
          previewUrl: nodemailer.getTestMessageUrl(info),
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }

  /**
   * Send 2FA verification code
   */
  static async send2FACode(email: string, code: string, userName?: string) {
    const template = this.get2FATemplate(code, userName);
    
    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(email: string, token: string, userName?: string) {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
    const template = this.getEmailVerificationTemplate(verificationUrl, userName);
    
    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email: string, token: string, userName?: string) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    const template = this.getPasswordResetTemplate(resetUrl, userName);
    
    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send security alert
   */
  static async sendSecurityAlert(email: string, alertType: string, details: any, userName?: string) {
    const template = this.getSecurityAlertTemplate(alertType, details, userName);
    
    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send account lockout notification
   */
  static async sendAccountLockout(email: string, unlockTime: Date, userName?: string) {
    const template = this.getAccountLockoutTemplate(unlockTime, userName);
    
    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Generic email sending method with enhanced error handling
   */
  static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
  }) {
    try {
      await this.initialize();
      
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }
      
      const info = await this.transporter.sendMail({
        from: options.from || process.env.FROM_EMAIL || 'BGuard Security <security@bguard.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      // Log email for development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Email sent successfully:', {
          to: options.to,
          subject: options.subject,
          messageId: info.messageId,
          previewUrl: nodemailer.getTestMessageUrl(info),
        });
      }

      return info;
    } catch (error) {
      console.error('❌ Failed to send email:', {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * 2FA email template
   */
  private static get2FATemplate(code: string, userName?: string): EmailTemplate {
    const name = userName || 'User';
    
    return {
      subject: 'Your BGuard Security Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Security Verification Required</h2>
          <p>Hello ${name},</p>
          <p>Your verification code for BGuard Suite is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="font-size: 32px; color: #1f2937; margin: 0; letter-spacing: 4px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes for security reasons.</p>
          <p>If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from BGuard Suite. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Hello ${name},\n\nYour verification code for BGuard Suite is: ${code}\n\nThis code will expire in 10 minutes for security reasons.\n\nIf you didn't request this code, please ignore this email or contact support if you're concerned about your account security.`,
    };
  }

  /**
   * Email verification template
   */
  private static getEmailVerificationTemplate(verificationUrl: string, userName?: string): EmailTemplate {
    const name = userName || 'User';
    
    return {
      subject: 'Verify Your BGuard Account Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to BGuard Suite!</h2>
          <p>Hello ${name},</p>
          <p>Please verify your email address to complete your account setup and access all features of BGuard Suite.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">${verificationUrl}</p>
          <p>This verification link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from BGuard Suite. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Hello ${name},\n\nPlease verify your email address to complete your account setup: ${verificationUrl}\n\nThis verification link will expire in 24 hours.`,
    };
  }

  /**
   * Password reset template
   */
  private static getPasswordResetTemplate(resetUrl: string, userName?: string): EmailTemplate {
    const name = userName || 'User';
    
    return {
      subject: 'Reset Your BGuard Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password for your BGuard Suite account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">${resetUrl}</p>
          <p>This reset link will expire in 1 hour for security reasons.</p>
          <p><strong>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</strong></p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from BGuard Suite. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Hello ${name},\n\nWe received a request to reset your password for your BGuard Suite account.\n\nReset your password: ${resetUrl}\n\nThis reset link will expire in 1 hour for security reasons.\n\nIf you didn't request this password reset, please ignore this email.`,
    };
  }

  /**
   * Security alert template
   */
  private static getSecurityAlertTemplate(alertType: string, details: any, userName?: string): EmailTemplate {
    const name = userName || 'User';
    
    return {
      subject: `BGuard Security Alert: ${alertType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🔒 Security Alert</h2>
          <p>Hello ${name},</p>
          <p>We've detected suspicious activity on your BGuard Suite account:</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Alert: ${alertType}</h3>
            <p style="margin-bottom: 0;"><strong>Details:</strong> ${JSON.stringify(details, null, 2)}</p>
          </div>
          <p>If this was you, no action is needed. If you don't recognize this activity, please:</p>
          <ul>
            <li>Change your password immediately</li>
            <li>Review your recent login activity</li>
            <li>Contact support if you need assistance</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated security alert from BGuard Suite. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Security Alert: ${alertType}\n\nHello ${name},\n\nWe've detected suspicious activity on your BGuard Suite account.\n\nDetails: ${JSON.stringify(details)}\n\nIf this wasn't you, please change your password immediately and contact support.`,
    };
  }

  /**
   * Account lockout template
   */
  private static getAccountLockoutTemplate(unlockTime: Date, userName?: string): EmailTemplate {
    const name = userName || 'User';
    const unlockTimeStr = unlockTime.toLocaleString();
    
    return {
      subject: 'BGuard Account Temporarily Locked',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Account Temporarily Locked</h2>
          <p>Hello ${name},</p>
          <p>Your BGuard Suite account has been temporarily locked due to multiple failed login attempts.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Your account will be automatically unlocked at:</strong></p>
            <p style="font-size: 18px; color: #dc2626; margin: 0;">${unlockTimeStr}</p>
          </div>
          <p>This is a security measure to protect your account from unauthorized access attempts.</p>
          <p>If you believe your account has been compromised, please contact our support team immediately.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated security notification from BGuard Suite. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Account Temporarily Locked\n\nHello ${name},\n\nYour BGuard Suite account has been temporarily locked due to multiple failed login attempts.\n\nYour account will be automatically unlocked at: ${unlockTimeStr}\n\nIf you believe your account has been compromised, please contact support.`,
    };
  }
}

