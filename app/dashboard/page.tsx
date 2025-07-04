import { Metadata } from 'next';
import { UnifiedDashboard } from '@/components/dashboard/unified-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard - BGuard Suite',
  description: 'Comprehensive security operations dashboard with threat modeling, design reviews, and third-party assessments.',
};

export default function DashboardPage() {
  return <UnifiedDashboard />;
}
