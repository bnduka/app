
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-config';
import { SecurityDashboard } from '@/components/security/security-dashboard';
import { SecurityEvents } from '@/components/security/security-events';
import { SecuritySettings } from '@/components/security/security-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings, Activity, BarChart3 } from 'lucide-react';

export default async function BusinessAdminSecurityPage() {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Security</h1>
        <p className="text-muted-foreground">
          Monitor and manage security settings for your organization.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
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
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SecurityDashboard 
            isAdmin={false} 
            organizationId={session.user.organizationId} 
          />
        </TabsContent>

        <TabsContent value="events">
          <SecurityEvents isAdmin={true} />
        </TabsContent>

        <TabsContent value="settings">
          <SecuritySettings 
            isAdmin={false} 
            organizationId={session.user.organizationId} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
