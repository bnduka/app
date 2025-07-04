
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const generateMoreSchema = z.object({
  count: z.number().min(1).max(5).optional().default(3),
});

// POST /api/threat-models/[id]/generate-more - Generate additional threat scenarios
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threatModelId = params.id;
    const body = await request.json();
    const validatedData = generateMoreSchema.parse(body);

    // Verify user has access to the threat model
    const threatModel = await prisma.threatModel.findFirst({
      where: {
        id: threatModelId,
        userId: session.user.id,
      },
      include: {
        findings: {
          include: {
            findingAssets: {
              include: {
                asset: true,
              },
            },
          },
        },
        assets: true,
      },
    });

    if (!threatModel) {
      return NextResponse.json({ error: 'Threat model not found or access denied' }, { status: 404 });
    }

    // Check generation limits (max 3 generations per threat model)
    if (threatModel.generationCount >= 3) {
      return NextResponse.json({ 
        error: 'Maximum generation limit reached (3 generations per threat model)' 
      }, { status: 429 });
    }

    // Prepare context for AI generation
    const existingScenarios = threatModel.findings.map(f => f.threatScenario);
    const availableAssets = threatModel.assets.map(a => ({
      name: a.name,
      type: a.type,
      description: a.description,
    }));

    // Call AI service to generate more scenarios
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const systemPrompt = `You are a cybersecurity expert specializing in threat modeling using the STRIDE methodology.

Generate additional unique threat scenarios that are different from existing ones. Each scenario should:

1. Follow attacker-focused narrative format: "An [attacker type] could [attack action] to [achieve goal] by [attack method]"
2. Be specific and actionable, avoiding vague statements
3. Target different attack vectors and assets than existing scenarios
4. Cover different STRIDE categories when possible
5. Consider realistic attack paths and motivations

Available assets in the system:
${availableAssets.map(a => `- ${a.name} (${a.type}): ${a.description}`).join('\n')}

STRIDE Categories:
- SPOOFING: Identity spoofing threats
- TAMPERING: Data or system integrity threats  
- REPUDIATION: Non-repudiation threats
- INFORMATION_DISCLOSURE: Confidentiality threats
- DENIAL_OF_SERVICE: Availability threats
- ELEVATION_OF_PRIVILEGE: Authorization threats

Respond with a JSON object containing a "scenarios" array. Each scenario should have:
- threatScenario: Attacker-focused narrative
- description: Detailed technical description
- severity: LOW/MEDIUM/HIGH/CRITICAL
- strideCategory: One of the STRIDE categories
- recommendation: Specific mitigation steps
- targetAssets: Array of asset names this scenario affects`;

    const existingScenariosText = existingScenarios.length > 0 
      ? `\n\nExisting scenarios to avoid duplicating:\n${existingScenarios.map((s, i) => `${i+1}. ${s}`).join('\n')}`
      : '';

    const userPrompt = `Generate ${validatedData.count} new unique threat scenarios for this system.

System Description: ${threatModel.prompt}${existingScenariosText}

Focus on creating scenarios that complement existing ones and cover different attack vectors.`;

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7, // Slightly higher temperature for more diverse scenarios
      }),
    });

    if (!response.ok) {
      console.error('AI service error:', response.statusText);
      return NextResponse.json({ error: 'Scenario generation failed' }, { status: 500 });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices[0].message.content;
    
    let generatedData;
    try {
      const cleanedContent = aiContent.replace(/```json\n?|```\n?/g, '').trim();
      generatedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    // Create new findings from generated scenarios
    const createdFindings = [];
    const sessionId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (generatedData.scenarios && Array.isArray(generatedData.scenarios)) {
      for (const scenario of generatedData.scenarios) {
        try {
          // Validate required fields
          if (!scenario.threatScenario || !scenario.description) {
            console.warn('Skipping scenario with missing required fields');
            continue;
          }

          // Validate severity
          const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
          const severity = validSeverities.includes(scenario.severity) ? scenario.severity : 'MEDIUM';

          // Validate STRIDE category
          const validCategories = [
            'SPOOFING', 'TAMPERING', 'REPUDIATION', 
            'INFORMATION_DISCLOSURE', 'DENIAL_OF_SERVICE', 'ELEVATION_OF_PRIVILEGE'
          ];
          const strideCategory = validCategories.includes(scenario.strideCategory) 
            ? scenario.strideCategory 
            : 'INFORMATION_DISCLOSURE';

          // Create finding
          const finding = await prisma.finding.create({
            data: {
              threatScenario: scenario.threatScenario,
              description: scenario.description,
              severity: severity,
              strideCategory: strideCategory,
              recommendation: scenario.recommendation || 'No recommendation provided',
              status: 'OPEN',
              userId: session.user.id,
              threatModelId: threatModelId,
              isNewGeneration: true,
              generationSessionId: sessionId,
            },
          });

          // Link to assets if specified
          if (scenario.targetAssets && Array.isArray(scenario.targetAssets)) {
            for (const assetName of scenario.targetAssets) {
              const asset = threatModel.assets.find(a => 
                a.name.toLowerCase().includes(assetName.toLowerCase()) ||
                assetName.toLowerCase().includes(a.name.toLowerCase())
              );

              if (asset) {
                await prisma.findingAsset.create({
                  data: {
                    findingId: finding.id,
                    assetId: asset.id,
                    impact: 'DIRECT',
                  },
                });
              }
            }
          }

          createdFindings.push(finding);
        } catch (error) {
          console.error('Error creating finding from scenario:', error);
          // Continue with other scenarios even if one fails
        }
      }
    }

    // Update threat model generation count and timestamp
    await prisma.threatModel.update({
      where: { id: threatModelId },
      data: {
        generationCount: threatModel.generationCount + 1,
        lastGenerationAt: new Date(),
      },
    });

    return NextResponse.json({
      message: `Successfully generated ${createdFindings.length} new threat scenarios`,
      scenarios: createdFindings,
      sessionId: sessionId,
      generationCount: threatModel.generationCount + 1,
      remainingGenerations: 2 - threatModel.generationCount,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error generating more scenarios:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
