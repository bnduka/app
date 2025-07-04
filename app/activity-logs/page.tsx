
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ActivityLogsContent } from '@/components/activity-logs/activity-logs-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ActivityLogsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
        <p className="text-muted-foreground">
          Track all activities and events in your account
        </p>
      </div>
      
      <Suspense 
        fallback={
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2">Loading activity logs...</span>
          </div>
        }
      >
        <ActivityLogsContent />
      </Suspense>
    </div>
  );
}
