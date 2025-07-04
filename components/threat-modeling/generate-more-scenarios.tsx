
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Finding } from '@prisma/client';

interface GenerateMoreScenariosProps {
  threatModelId: string;
  generationCount: number;
  maxGenerations?: number;
  onScenariosGenerated: (scenarios: Finding[]) => void;
}

export function GenerateMoreScenarios({
  threatModelId,
  generationCount,
  maxGenerations = 3,
  onScenariosGenerated
}: GenerateMoreScenariosProps) {
  const [loading, setLoading] = useState(false);
  const [lastGenerationResult, setLastGenerationResult] = useState<{
    scenariosCount: number;
    sessionId: string;
  } | null>(null);

  const remainingGenerations = maxGenerations - generationCount;
  const canGenerate = remainingGenerations > 0;

  const handleGenerateScenarios = async () => {
    setLoading(true);
    setLastGenerationResult(null);

    try {
      const response = await fetch(`/api/threat-models/${threatModelId}/generate-more`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: 3, // Generate 3 scenarios by default
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastGenerationResult({
          scenariosCount: data.scenarios.length,
          sessionId: data.sessionId,
        });
        onScenariosGenerated(data.scenarios);
        toast.success(`Generated ${data.scenarios.length} new threat scenarios`);
      } else {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error('Generation limit reached. You have used all available generations for this threat model.');
        } else {
          toast.error(errorData.error || 'Failed to generate scenarios');
        }
      }
    } catch (error) {
      console.error('Error generating scenarios:', error);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg text-purple-900">
              Generate More Scenarios
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={canGenerate ? 'default' : 'secondary'}>
              {generationCount}/{maxGenerations} used
            </Badge>
            {remainingGenerations > 0 && (
              <Badge variant="outline" className="text-purple-700 border-purple-300">
                {remainingGenerations} remaining
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-purple-700">
          Use AI to generate additional unique threat scenarios based on your system assets and existing findings.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Messages */}
        {!canGenerate ? (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have reached the maximum number of generations ({maxGenerations}) for this threat model. 
              This limit helps ensure focused and manageable threat analysis.
            </AlertDescription>
          </Alert>
        ) : lastGenerationResult ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully generated {lastGenerationResult.scenariosCount} new threat scenarios! 
              Look for the "New Generation" badges in your findings list.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Generate additional threat scenarios that complement your existing findings. 
              New scenarios will focus on different attack vectors and assets.
            </AlertDescription>
          </Alert>
        )}

        {/* Generation Features */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-purple-900">What you'll get:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
              <span>Attacker-focused threat scenarios</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
              <span>Different STRIDE categories</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
              <span>Asset-specific attack vectors</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
              <span>Unique scenarios (no duplicates)</span>
            </div>
          </div>
        </div>

        {/* Generation Button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleGenerateScenarios}
            disabled={loading || !canGenerate}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating Scenarios...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate More Scenarios
              </>
            )}
          </Button>
        </div>

        {/* Usage Guidelines */}
        <div className="pt-2 border-t border-purple-200">
          <div className="text-xs text-purple-700 space-y-1">
            <div><strong>Best practices:</strong></div>
            <div>• Review and link new scenarios to relevant assets</div>
            <div>• Apply appropriate tags for organizational tracking</div>
            <div>• Update scenarios if they don't match your system</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
