
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ThreatModelingAnalyticsContent } from '@/components/threat-modeling/analytics-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ThreatModelingAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Threat Modeling Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights and metrics for your threat modeling activities
        </p>
      </div>
      
      <Suspense 
        fallback={
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2">Loading analytics...</span>
          </div>
        }
      >
        <ThreatModelingAnalyticsContent />
      </Suspense>
    </div>
  );
}
