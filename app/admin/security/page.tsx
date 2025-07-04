
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-config';
import { SecurityDashboard } from '@/components/security/security-dashboard';
import { SecurityEvents } from '@/components/security/security-events';
import { SecuritySettings } from '@/components/security/security-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings, Activity, BarChart3 } from 'lucide-react';

export default async function AdminSecurityPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Security</h1>
        <p className="text-muted-foreground">
          Monitor and manage security across all organizations and users.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Security Events
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Platform Settings
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SecurityDashboard isAdmin={true} />
        </TabsContent>

        <TabsContent value="events">
          <SecurityEvents isAdmin={true} />
        </TabsContent>

        <TabsContent value="settings">
          <SecuritySettings isAdmin={true} />
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Advanced Monitoring</h3>
            <p className="text-muted-foreground">
              Real-time security monitoring and threat detection will be available here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
