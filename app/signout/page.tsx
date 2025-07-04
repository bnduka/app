
'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Shield } from 'lucide-react';

export default function SignOutPage() {
  useEffect(() => {
    const performSignOut = async () => {
      try {
        // Sign out and redirect to public landing page
        await signOut({ 
          callbackUrl: '/', 
          redirect: true 
        });
      } catch (error) {
        console.error('Sign out error:', error);
        // Fallback redirect to landing page
        window.location.href = '/';
      }
    };

    performSignOut();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Signing Out</h1>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we securely sign you out...</p>
        </div>
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}
