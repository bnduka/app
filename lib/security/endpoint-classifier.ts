
/**
 * AI-Powered Endpoint Classification Service
 * Uses Abacus.AI to classify discovered endpoints and assess risk
 */

interface EndpointAnalysis {
  endpointType: EndpointType;
  sensitivity: EndpointSensitivity;
  riskScore: number;
  riskLevel: EndpointRiskLevel;
  functionPurpose: string;
  securityConcerns: string[];
  dataExposure: string[];
  isAnomaly: boolean;
  anomalyReason?: string;
  anomalyScore?: number;
  classification: Record<string, any>;
}

interface ClassificationRequest {
  url: string;
  method: string;
  path: string;
  queryParams: string[];
  statusCode?: number;
  contentType?: string;
  responseSize?: number;
  securityHeaders?: Record<string, string>;
  forms?: any[];
  domain: string;
}

enum EndpointType {
  LOGIN_PAGE = 'LOGIN_PAGE',
  AUTHENTICATION = 'AUTHENTICATION',
  ADMIN_PANEL = 'ADMIN_PANEL',
  API_ENDPOINT = 'API_ENDPOINT',
  FORM_SUBMISSION = 'FORM_SUBMISSION',
  FILE_UPLOAD = 'FILE_UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  SEARCH = 'SEARCH',
  USER_PROFILE = 'USER_PROFILE',
  STATIC_CONTENT = 'STATIC_CONTENT',
  DOCUMENTATION = 'DOCUMENTATION',
  ERROR_PAGE = 'ERROR_PAGE',
  REDIRECT = 'REDIRECT',
  HEALTH_CHECK = 'HEALTH_CHECK',
  METRICS = 'METRICS',
  WEBHOOK = 'WEBHOOK',
  CALLBACK = 'CALLBACK',
  OTHER = 'OTHER',
}

enum EndpointSensitivity {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  RESTRICTED = 'RESTRICTED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  HIGHLY_SENSITIVE = 'HIGHLY_SENSITIVE',
}

enum EndpointRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class EndpointClassifierService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ABACUSAI_API_KEY || '';
    this.baseUrl = 'https://apps.abacus.ai';
  }

  /**
   * Classifies a batch of endpoints using AI
   */
  async classifyEndpoints(endpoints: ClassificationRequest[]): Promise<EndpointAnalysis[]> {
    try {
      const results: EndpointAnalysis[] = [];

      // Process endpoints in batches for efficiency
      const batchSize = 5;
      for (let i = 0; i < endpoints.length; i += batchSize) {
        const batch = endpoints.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch);
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      console.error('Endpoint classification failed:', error);
      return endpoints.map(ep => this.getFallbackClassification(ep));
    }
  }

  /**
   * Processes a batch of endpoints for classification
   */
  private async processBatch(endpoints: ClassificationRequest[]): Promise<EndpointAnalysis[]> {
    const results: EndpointAnalysis[] = [];

    for (const endpoint of endpoints) {
      try {
        const analysis = await this.classifySingleEndpoint(endpoint);
        results.push(analysis);
      } catch (error) {
        console.error(`Failed to classify endpoint ${endpoint.url}:`, error);
        results.push(this.getFallbackClassification(endpoint));
      }
    }

    return results;
  }

  /**
   * Classifies a single endpoint using AI
   */
  private async classifySingleEndpoint(endpoint: ClassificationRequest): Promise<EndpointAnalysis> {
    try {
      // Prepare context for AI analysis
      const analysisPrompt = this.buildAnalysisPrompt(endpoint);

      // Call Abacus.AI for classification
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a cybersecurity expert specializing in web application security. Analyze the provided endpoint information and classify it according to the specified criteria. Respond with structured JSON only.',
            },
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      return this.parseAIAnalysis(analysis, endpoint);
    } catch (error) {
      console.error('AI classification failed:', error);
      return this.getFallbackClassification(endpoint);
    }
  }

  /**
   * Builds analysis prompt for AI
   */
  private buildAnalysisPrompt(endpoint: ClassificationRequest): string {
    const securityHeadersText = endpoint.securityHeaders 
      ? Object.entries(endpoint.securityHeaders).map(([k, v]) => `${k}: ${v}`).join(', ')
      : 'None';

    const formsText = endpoint.forms && endpoint.forms.length > 0 
      ? endpoint.forms.map(form => JSON.stringify(form)).join(', ')
      : 'None';

    return `Analyze this web endpoint and provide detailed security classification:

URL: ${endpoint.url}
HTTP Method: ${endpoint.method}
Path: ${endpoint.path}
Query Parameters: ${endpoint.queryParams.join(', ') || 'None'}
Status Code: ${endpoint.statusCode || 'Unknown'}
Content Type: ${endpoint.contentType || 'Unknown'}
Response Size: ${endpoint.responseSize || 'Unknown'} bytes
Security Headers: ${securityHeadersText}
Forms: ${formsText}
Domain: ${endpoint.domain}

Please provide analysis in the following JSON structure:
{
  "endpointType": "one of: LOGIN_PAGE, AUTHENTICATION, ADMIN_PANEL, API_ENDPOINT, FORM_SUBMISSION, FILE_UPLOAD, DOWNLOAD, SEARCH, USER_PROFILE, STATIC_CONTENT, DOCUMENTATION, ERROR_PAGE, REDIRECT, HEALTH_CHECK, METRICS, WEBHOOK, CALLBACK, OTHER",
  "sensitivity": "one of: PUBLIC, INTERNAL, RESTRICTED, CONFIDENTIAL, HIGHLY_SENSITIVE",
  "riskScore": "number between 0-10",
  "riskLevel": "one of: LOW, MEDIUM, HIGH, CRITICAL",
  "functionPurpose": "brief description of endpoint's function",
  "securityConcerns": ["array of security concerns"],
  "dataExposure": ["array of potential data exposure risks"],
  "isAnomaly": "boolean - true if endpoint seems unusual or suspicious",
  "anomalyReason": "string explanation if isAnomaly is true",
  "anomalyScore": "number 0-1 if isAnomaly is true",
  "reasoning": "explanation of classification decisions"
}

Focus on:
1. Endpoint functionality and purpose
2. Security implications and risks
3. Data sensitivity and access control requirements
4. Anomaly detection (unusual patterns, suspicious paths, etc.)
5. Security header analysis
6. Form and input analysis`;
  }

  /**
   * Parses AI analysis response into structured format
   */
  private parseAIAnalysis(analysis: any, endpoint: ClassificationRequest): EndpointAnalysis {
    try {
      return {
        endpointType: this.parseEndpointType(analysis.endpointType),
        sensitivity: this.parseEndpointSensitivity(analysis.sensitivity),
        riskScore: Math.max(0, Math.min(10, parseFloat(analysis.riskScore) || 5)),
        riskLevel: this.parseEndpointRiskLevel(analysis.riskLevel),
        functionPurpose: analysis.functionPurpose || 'Unknown function',
        securityConcerns: Array.isArray(analysis.securityConcerns) ? analysis.securityConcerns : [],
        dataExposure: Array.isArray(analysis.dataExposure) ? analysis.dataExposure : [],
        isAnomaly: Boolean(analysis.isAnomaly),
        anomalyReason: analysis.anomalyReason || undefined,
        anomalyScore: analysis.isAnomaly ? Math.max(0, Math.min(1, parseFloat(analysis.anomalyScore) || 0.5)) : undefined,
        classification: {
          reasoning: analysis.reasoning || '',
          confidence: this.calculateConfidence(analysis),
          rawAnalysis: analysis,
        },
      };
    } catch (error) {
      console.error('Failed to parse AI analysis:', error);
      return this.getFallbackClassification(endpoint);
    }
  }

  /**
   * Calculates confidence score based on analysis quality
   */
  private calculateConfidence(analysis: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on detail quality
    if (analysis.functionPurpose && analysis.functionPurpose.length > 10) confidence += 0.1;
    if (analysis.securityConcerns && analysis.securityConcerns.length > 0) confidence += 0.1;
    if (analysis.reasoning && analysis.reasoning.length > 20) confidence += 0.2;
    if (analysis.riskScore && !isNaN(parseFloat(analysis.riskScore))) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generates natural language summary of findings
   */
  async generateSummary(endpoints: EndpointAnalysis[], domain: string): Promise<string> {
    try {
      const summaryData = this.prepareSummaryData(endpoints);
      
      const summaryPrompt = `Generate a comprehensive security summary for endpoint discovery results:

Domain: ${domain}
Total Endpoints: ${endpoints.length}
High Risk: ${summaryData.highRisk}
Medium Risk: ${summaryData.mediumRisk}
Low Risk: ${summaryData.lowRisk}
Anomalies: ${summaryData.anomalies}

Endpoint Types Found:
${summaryData.endpointTypes.map(type => `- ${type.type}: ${type.count}`).join('\n')}

Top Security Concerns:
${summaryData.topConcerns.map(concern => `- ${concern}`).join('\n')}

Please provide a 2-3 paragraph executive summary highlighting:
1. Overall security posture
2. Key findings and risks
3. Priority recommendations

Keep the tone professional and actionable.`;

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a cybersecurity analyst creating executive summaries of security assessments.',
            },
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Summary generation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Summary generation failed:', error);
      return this.getFallbackSummary(endpoints, domain);
    }
  }

  /**
   * Prepares summary data for AI analysis
   */
  private prepareSummaryData(endpoints: EndpointAnalysis[]) {
    const riskCounts = {
      highRisk: endpoints.filter(e => e.riskLevel === EndpointRiskLevel.HIGH || e.riskLevel === EndpointRiskLevel.CRITICAL).length,
      mediumRisk: endpoints.filter(e => e.riskLevel === EndpointRiskLevel.MEDIUM).length,
      lowRisk: endpoints.filter(e => e.riskLevel === EndpointRiskLevel.LOW).length,
      anomalies: endpoints.filter(e => e.isAnomaly).length,
    };

    const endpointTypeCounts = new Map<string, number>();
    const allConcerns = new Set<string>();

    endpoints.forEach(endpoint => {
      // Count endpoint types
      const type = endpoint.endpointType;
      endpointTypeCounts.set(type, (endpointTypeCounts.get(type) || 0) + 1);

      // Collect security concerns
      endpoint.securityConcerns.forEach(concern => allConcerns.add(concern));
    });

    return {
      ...riskCounts,
      endpointTypes: Array.from(endpointTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      topConcerns: Array.from(allConcerns).slice(0, 5),
    };
  }

  /**
   * Provides fallback classification when AI analysis fails
   */
  private getFallbackClassification(endpoint: ClassificationRequest): EndpointAnalysis {
    const path = endpoint.path.toLowerCase();
    
    // Rule-based fallback classification
    let endpointType = EndpointType.OTHER;
    let sensitivity = EndpointSensitivity.INTERNAL;
    let riskScore = 5;

    // Basic pattern matching
    if (path.includes('login') || path.includes('signin') || path.includes('auth')) {
      endpointType = EndpointType.LOGIN_PAGE;
      sensitivity = EndpointSensitivity.RESTRICTED;
      riskScore = 7;
    } else if (path.includes('admin') || path.includes('dashboard')) {
      endpointType = EndpointType.ADMIN_PANEL;
      sensitivity = EndpointSensitivity.HIGHLY_SENSITIVE;
      riskScore = 9;
    } else if (path.includes('api/')) {
      endpointType = EndpointType.API_ENDPOINT;
      sensitivity = EndpointSensitivity.INTERNAL;
      riskScore = 6;
    } else if (path.includes('upload')) {
      endpointType = EndpointType.FILE_UPLOAD;
      sensitivity = EndpointSensitivity.RESTRICTED;
      riskScore = 8;
    } else if (endpoint.statusCode === 404) {
      endpointType = EndpointType.ERROR_PAGE;
      sensitivity = EndpointSensitivity.PUBLIC;
      riskScore = 2;
    }

    return {
      endpointType,
      sensitivity,
      riskScore,
      riskLevel: this.calculateRiskLevel(riskScore),
      functionPurpose: 'Classified using fallback rules',
      securityConcerns: ['Classification performed without AI analysis'],
      dataExposure: [],
      isAnomaly: false,
      classification: {
        reasoning: 'Fallback rule-based classification',
        confidence: 0.3,
        method: 'fallback',
      },
    };
  }

  /**
   * Generates fallback summary when AI analysis fails
   */
  private getFallbackSummary(endpoints: EndpointAnalysis[], domain: string): string {
    const totalEndpoints = endpoints.length;
    const highRisk = endpoints.filter(e => e.riskLevel === EndpointRiskLevel.HIGH || e.riskLevel === EndpointRiskLevel.CRITICAL).length;
    const anomalies = endpoints.filter(e => e.isAnomaly).length;

    return `Endpoint discovery completed for ${domain}. Found ${totalEndpoints} total endpoints. ${highRisk} endpoints were classified as high or critical risk. ${anomalies} potential anomalies were detected. A detailed manual review is recommended to assess security posture and implement appropriate controls.`;
  }

  /**
   * Helper methods for enum parsing
   */
  private parseEndpointType(value: string): EndpointType {
    return Object.values(EndpointType).includes(value as EndpointType) 
      ? value as EndpointType 
      : EndpointType.OTHER;
  }

  private parseEndpointSensitivity(value: string): EndpointSensitivity {
    return Object.values(EndpointSensitivity).includes(value as EndpointSensitivity)
      ? value as EndpointSensitivity
      : EndpointSensitivity.INTERNAL;
  }

  private parseEndpointRiskLevel(value: string): EndpointRiskLevel {
    return Object.values(EndpointRiskLevel).includes(value as EndpointRiskLevel)
      ? value as EndpointRiskLevel
      : EndpointRiskLevel.MEDIUM;
  }

  private calculateRiskLevel(riskScore: number): EndpointRiskLevel {
    if (riskScore >= 8) return EndpointRiskLevel.CRITICAL;
    if (riskScore >= 6) return EndpointRiskLevel.HIGH;
    if (riskScore >= 4) return EndpointRiskLevel.MEDIUM;
    return EndpointRiskLevel.LOW;
  }
}

export const endpointClassifier = new EndpointClassifierService();
