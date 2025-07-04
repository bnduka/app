
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      role: 'USER' | 'ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER';
      organizationId?: string;
      organizationName?: string;
      emailVerified?: Date;
    };
    sessionTimeout?: number;
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role: 'USER' | 'ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER';
    organizationId?: string;
    organizationName?: string;
    emailVerified?: Date;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'USER' | 'ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER';
    organizationId?: string;
    organizationName?: string;
    emailVerified?: Date;
    sessionTimeout?: number;
  }
}
