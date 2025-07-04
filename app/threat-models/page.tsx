
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ThreatModelsContent } from '@/components/threat-models/threat-models-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ThreatModelsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Threat Models</h1>
        <p className="text-muted-foreground">
          View and manage all your threat modeling analyses
        </p>
      </div>
      
      <Suspense 
        fallback={
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2">Loading threat models...</span>
          </div>
        }
      >
        <ThreatModelsContent />
      </Suspense>
    </div>
  );
}
