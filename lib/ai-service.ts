
import { AIAnalysisResponse, StrideAnalysis, ThreatAnalysis, StrideCategory, Severity } from './types';

export class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ABACUSAI_API_KEY || '';
    this.baseUrl = 'https://apps.abacus.ai';
  }

  async analyzeThreat(prompt: string, fileContent?: string): Promise<AIAnalysisResponse> {
    try {
      const systemPrompt = `You are a cybersecurity expert specializing in threat modeling using the STRIDE methodology. 
      
      Analyze the provided system description and identify potential security threats categorized by STRIDE:
      - Spoofing: Identity spoofing threats
      - Tampering: Data or system integrity threats  
      - Repudiation: Non-repudiation threats
      - Information Disclosure: Confidentiality threats
      - Denial of Service: Availability threats
      - Elevation of Privilege: Authorization threats

      For each identified threat, provide:
      1. Clear title and description
      2. Severity level (LOW, MEDIUM, HIGH, CRITICAL)
      3. Specific recommendation for mitigation
      4. Technical implementation details

      Respond with structured JSON containing summary, strideAnalysis array, recommendations, and technicalAssumptions.`;

      const userPrompt = `System Description: ${prompt}${fileContent ? `\n\nAdditional Context from Documents:\n${fileContent}` : ''}`;

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse and validate the JSON response
      const analysisResult = JSON.parse(content);
      
      return this.validateAndTransformResponse(analysisResult);
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to analyze threats. Please try again.');
    }
  }

  async analyzeDocument(fileContent: string, mimeType: string): Promise<string> {
    try {
      const systemPrompt = `Extract and summarize security-relevant information from the provided document. 
      Focus on system architecture, data flows, user interactions, external dependencies, and potential attack surfaces.
      Provide a clear, structured summary that can be used for threat modeling.`;

      let content;
      if (mimeType.includes('pdf')) {
        // For PDF files, send as base64 data URI
        content = [
          { type: "text", text: "Please analyze this document for security-relevant information:" },
          { type: "file", file: { filename: "document.pdf", file_data: fileContent } }
        ];
      } else if (mimeType.includes('image')) {
        // For images, send as image URL
        content = [
          { type: "text", text: "Please analyze this image for security-relevant information:" },
          { type: "image_url", image_url: { url: fileContent } }
        ];
      } else {
        // For text-based files, send as regular text
        content = `Please analyze this document for security-relevant information:\n\n${fileContent}`;
      }

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Document analysis error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error('Failed to analyze document. Please try again.');
    }
  }

  private validateAndTransformResponse(response: any): AIAnalysisResponse {
    // Provide default structure if response is malformed
    const defaultResponse: AIAnalysisResponse = {
      summary: response.summary || 'Analysis completed',
      strideAnalysis: [],
      recommendations: response.recommendations || [],
      technicalAssumptions: response.technicalAssumptions || []
    };

    if (response.strideAnalysis && Array.isArray(response.strideAnalysis)) {
      defaultResponse.strideAnalysis = response.strideAnalysis.map((analysis: any) => ({
        category: this.validateStrideCategory(analysis.category),
        threats: (analysis.threats || []).map((threat: any) => ({
          title: threat.title || 'Untitled Threat',
          description: threat.description || 'No description provided',
          severity: this.validateSeverity(threat.severity),
          recommendation: threat.recommendation || 'No recommendation provided',
          mitigation: threat.mitigation || threat.recommendation || 'No mitigation provided'
        }))
      }));
    }

    return defaultResponse;
  }

  private validateStrideCategory(category: string): StrideCategory {
    const validCategories = Object.values(StrideCategory);
    const upperCategory = category?.toUpperCase().replace(/\s+/g, '_');
    return validCategories.includes(upperCategory as StrideCategory) 
      ? upperCategory as StrideCategory 
      : StrideCategory.INFORMATION_DISCLOSURE;
  }

  private validateSeverity(severity: string): Severity {
    const validSeverities = Object.values(Severity);
    const upperSeverity = severity?.toUpperCase();
    return validSeverities.includes(upperSeverity as Severity) 
      ? upperSeverity as Severity 
      : Severity.MEDIUM;
  }
}

export const aiService = new AIService();
