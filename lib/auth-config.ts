
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { logActivity } from './activity-logger';
import { AccountLockoutService } from './security/account-lockout';
import { TwoFactorAuth } from './security/two-factor-auth';
import { SSOProviders } from './security/sso-providers';
import { SessionManager } from './security/session-manager';
import { DeviceManager } from './security/device-manager';
import { SecurityEventService } from './security/security-events';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        const ipAddress = (req?.headers?.['x-forwarded-for'] as string) || 
                         (req?.headers?.['x-real-ip'] as string) || 
                         'unknown';
        const userAgent = (req?.headers?.['user-agent'] as string) || 'unknown';

        // Check if account is locked
        const isLocked = await AccountLockoutService.isAccountLocked(email);
        if (isLocked) {
          await SecurityEventService.logEvent({
            eventType: 'LOGIN_FAILED',
            severity: 'HIGH',
            description: 'Login attempt on locked account',
            ipAddress,
            userAgent,
            metadata: { email, reason: 'account_locked' },
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (!user || !user.password) {
          await AccountLockoutService.recordFailedLogin(email, ipAddress, userAgent, 'invalid_credentials');
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          await AccountLockoutService.recordFailedLogin(email, ipAddress, userAgent, 'invalid_password');
          return null;
        }

        // Check if 2FA is required
        const is2FARequired = await TwoFactorAuth.isRequired2FA(user.id) || user.twoFactorEnabled;
        
        if (is2FARequired) {
          if (!credentials.twoFactorCode) {
            // Generate and send 2FA code
            await TwoFactorAuth.generateAndSend2FACode(user.id);
            throw new Error('2FA_REQUIRED');
          }

          // Verify 2FA code
          const twoFactorResult = await TwoFactorAuth.verify2FACode(user.id, credentials.twoFactorCode);
          if (!twoFactorResult.success) {
            await SecurityEventService.logEvent({
              userId: user.id,
              eventType: 'TWO_FACTOR_FAILED',
              severity: 'MEDIUM',
              description: 'Invalid 2FA code provided',
              ipAddress,
              userAgent,
            });
            return null;
          }
        }

        // Reset failed login attempts on successful login
        await AccountLockoutService.resetFailedAttempts(user.id);

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), lastActiveAt: new Date() }
        });

        // Register device
        await DeviceManager.registerDevice(user.id, {
          userAgent,
          ipAddress,
        });

        // Log successful login
        await logActivity({
          userId: user.id,
          action: 'LOGIN',
          status: 'SUCCESS',
          description: 'User logged in successfully',
          entityType: 'user',
          entityId: user.id,
          ipAddress,
          userAgent
        });

        await SecurityEventService.logEvent({
          userId: user.id,
          eventType: 'LOGIN_SUCCESS',
          severity: 'LOW',
          description: 'Successful login',
          ipAddress,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          role: user.role,
          organizationId: user.organizationId || undefined,
          organizationName: user.organization?.name || undefined,
          emailVerified: user.emailVerified || undefined
        };
      }
    }),
    // SSO providers (conditionally added based on environment variables)
    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
    ...(process.env.AZURE_AD_CLIENT_ID ? [
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID,
      })
    ] : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 5 * 60, // 5 minutes default
  },
  callbacks: {
    async signIn({ user, account, profile, email: userEmail, credentials }) {
      // Handle SSO sign-in
      if (account?.provider !== 'credentials') {
        const email = user.email?.toLowerCase();
        if (!email || !account) return false;

        // Check if user exists
        let existingUser = await prisma.user.findUnique({
          where: { email },
          include: { organization: true }
        });

        // For existing users, validate SSO domain if they have organization
        if (existingUser?.organizationId) {
          const isValidDomain = await SSOProviders.validateSSODomain(email, existingUser.organizationId);
          if (!isValidDomain) {
            await SSOProviders.handleSSOLoginFailure(email, account.provider, 'domain_not_allowed');
            return false;
          }

          // Handle existing user SSO login success
          await SSOProviders.handleSSOLoginSuccess(
            existingUser.id,
            account.provider,
            account.providerAccountId
          );
          return true;
        }

        // For new users - create user without organization for now
        // They will be redirected to organization selection page
        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              email,
              name: user.name,
              emailVerified: new Date(),
              role: 'USER', // Default role until organization is selected
            },
            include: { organization: true }
          });

          // Handle SSO signup success
          await SSOProviders.handleSSOLoginSuccess(
            existingUser.id,
            account.provider,
            account.providerAccountId
          );
          
          // Mark this as a new SSO user needing organization selection
          // We'll handle this in the callback
          return `/sso-organization-setup?userId=${existingUser.id}`;
        }

        return true;
      }

      return true;
    },
    jwt: async ({ user, token, account, trigger }) => {
      if (user) {
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.emailVerified = user.emailVerified || undefined;
      }

      // Update session timeout based on organization settings
      if (token.organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: token.organizationId as string },
          select: { sessionTimeoutMinutes: true },
        });
        
        if (organization) {
          token.sessionTimeout = organization.sessionTimeoutMinutes;
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.sub || '';
        session.user.role = token.role as any;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.emailVerified = token.emailVerified as Date;
        session.sessionTimeout = token.sessionTimeout as number;

        // Update session expiry based on timeout
        const timeoutMinutes = (token.sessionTimeout as number) || 5;
        session.expires = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();
      }
      return session;
    }
  },
  events: {
    async signOut({ token, session }) {
      if (token?.sub) {
        await SessionManager.terminateAllUserSessions(token.sub, 'USER_LOGOUT');
        
        await logActivity({
          userId: token.sub,
          action: 'LOGOUT',
          status: 'SUCCESS',
          description: 'User logged out',
          entityType: 'user',
          entityId: token.sub
        });
      }
    },
    async session({ session, token }) {
      // Update user's last active time
      if (token?.sub) {
        await prisma.user.update({
          where: { id: token.sub },
          data: { lastActiveAt: new Date() },
        }).catch(() => {}); // Ignore errors to prevent breaking session
      }
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  }
};
