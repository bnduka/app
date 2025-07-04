
'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NavBar } from './nav-bar';

export function ConditionalNavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  // Hide NavBar on the main landing page
  if (pathname === '/') {
    return null;
  }
  
  // Don't show any top navigation for authenticated users
  if (status === 'authenticated' && session?.user) {
    return null;
  }
  
  // Show NavBar for unauthenticated users on other pages (login, register, etc.)
  return <NavBar />;
}
