
import { 
  ThreatModel, 
  Finding, 
  Report, 
  FileUpload, 
  User, 
  Asset,
  Tag,
  FindingAsset,
  FindingTag,
  Organization,
  ThreatModelStatus, 
  FindingStatus, 
  Severity, 
  StrideCategory, 
  ReportFormat, 
  UserRole,
  AssetType,
  AssetImpact,
  // BGuard Suite Models
  ApplicationAsset,
  DesignReview,
  ThirdPartyReview,
  ThreatModelAssetLink,
  DesignReviewAssetLink,
  // BGuard Suite Enums
  ApplicationAssetType,
  ApplicationAssetStatus,
  BusinessCriticality,
  DataClassification,
  HostingType,
  Environment,
  ThreatModelLinkStatus,
  DesignReviewLinkStatus,
  DesignReviewStatus,
  DesignReviewType,
  SystemType,
  SecurityGrade,
  RiskLevel,
  ThirdPartyReviewStatus,
  ScanFrequency,
  PrivacyPolicyStatus,
  TermsOfServiceStatus,
  ContractStatus,
  LinkStatus
} from '@prisma/client';

// Enhanced ThreatModel types with new relationships
export type ThreatModelWithDetails = ThreatModel & {
  user: User;
  findings: FindingWithEnhancedDetails[];
  reports: Report[];
  fileUploads: FileUpload[];
  assets: AssetWithDetails[];
};

// Enhanced Finding types with new relationships
export type FindingWithDetails = Finding & {
  user: User;
  threatModel: ThreatModel;
};

export type FindingWithEnhancedDetails = Finding & {
  user: User;
  threatModel: ThreatModel;
  findingAssets: FindingAssetWithDetails[];
  findingTags: FindingTagWithDetails[];
};

// Asset-related types
export type AssetWithDetails = Asset & {
  threatModel: ThreatModel;
  findingAssets: FindingAssetWithDetails[];
};

export type FindingAssetWithDetails = FindingAsset & {
  finding: Finding;
  asset: Asset;
};

// Tag-related types
export type TagWithDetails = Tag & {
  findingTags: FindingTagWithDetails[];
  _count: {
    findingTags: number;
  };
};

export type FindingTagWithDetails = FindingTag & {
  finding: Finding;
  tag: Tag;
  user: User;
};

export type ReportWithDetails = Report & {
  user: User;
  threatModel: ThreatModel;
};

// Enhanced STRIDE Analysis with updated threat analysis
export interface StrideAnalysis {
  category: StrideCategory;
  threats: ThreatAnalysis[];
}

export interface ThreatAnalysis {
  title: string; // Will be mapped to threatScenario in new findings
  description: string;
  severity: Severity;
  recommendation: string;
  mitigation: string;
}

// Asset extraction types
export interface AssetExtractionRequest {
  threatModelId: string;
  documentContent: string;
}

export interface AssetExtractionResponse {
  message: string;
  assets: Asset[];
  extractionSummary: {
    totalExtracted: number;
    document: string;
  };
}

// Tag management types
export interface TagCreationRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface TagApplicationRequest {
  tagId: string;
  justification?: string;
}

// Asset linking types
export interface AssetLinkingRequest {
  assetId: string;
  impact?: AssetImpact;
}

// Generate more scenarios types
export interface GenerateMoreScenariosRequest {
  count?: number;
}

export interface GenerateMoreScenariosResponse {
  message: string;
  scenarios: Finding[];
  sessionId: string;
  generationCount: number;
  remainingGenerations: number;
}

export interface ThreatModelRequest {
  name: string;
  description?: string;
  prompt: string;
  fileIds?: string[];
}

export interface AIAnalysisResponse {
  summary: string;
  strideAnalysis: StrideAnalysis[];
  recommendations: string[];
  technicalAssumptions: string[];
}

// Enhanced threat scenario validation
export interface ThreatScenarioValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}









// ============================================================================
// BGUARD SUITE TYPES - Asset Management, Design Review, Third-Party Review
// ============================================================================

// Asset Management Types
export type ApplicationAssetWithDetails = ApplicationAsset & {
  user: User;
  organization?: Organization;
  linkedThreatModels: ThreatModelAssetLinkWithDetails[];
  linkedDesignReviews: DesignReviewAssetLinkWithDetails[];
};

export type ApplicationAssetRequest = {
  name: string;
  description?: string;
  assetType: ApplicationAssetType;
  status?: ApplicationAssetStatus;
  businessCriticality?: BusinessCriticality;
  dataClassification?: DataClassification;
  owner?: string;
  team?: string;
  businessUnit?: string;
  techStack?: string[];
  hostingType?: HostingType;
  hostingProvider?: string;
  environment?: Environment;
  hasAuthentication?: boolean;
  authenticationMethods?: string[];
  hasAuthorization?: boolean;
  encryptionInTransit?: boolean;
  encryptionAtRest?: boolean;
  complianceRequirements?: string[];
  deploymentDate?: Date;
  lastSecurityReview?: Date;
  lastPenetrationTest?: Date;
  upstreamAssets?: string[];
  downstreamAssets?: string[];
  integrations?: string[];
  applicationUrl?: string;
  documentationUrl?: string;
  repositoryUrl?: string;
  tags?: string[];
  metadata?: string;
};

export type AssetDashboardStats = {
  totalAssets: number;
  assetsByType: { type: ApplicationAssetType; count: number }[];
  assetsByStatus: { status: ApplicationAssetStatus; count: number }[];
  assetsByCriticality: { criticality: BusinessCriticality; count: number }[];
  threatModeledAssets: number;
  designReviewedAssets: number;
  highRiskAssets: number;
  recentAssets: ApplicationAssetWithDetails[];
};

// Design Review Types
export type DesignReviewWithDetails = DesignReview & {
  user: User;
  organization?: Organization;
  linkedAssets: DesignReviewAssetLinkWithDetails[];
};

export type DesignReviewRequest = {
  name: string;
  description?: string;
  reviewType?: DesignReviewType;
  systemType?: SystemType;
  scope?: string;
  businessContext?: string;
  techStack?: string;
  cloudProviders?: string[];
  frameworks?: string[];
  databases?: string[];
  architectureDescription?: string;
  complianceFrameworks?: string[];
  overallRisk?: RiskLevel;
};

export type DesignReviewAnalysisRequest = {
  architectureDescription: string;
  techStack?: string;
  systemType: SystemType;
  complianceFrameworks?: string[];
};

export type DesignReviewAnalysisResponse = {
  securityScore: number;
  securityGrade: SecurityGrade;
  authenticationScore: number;
  authorizationScore: number;
  dataProtectionScore: number;
  inputValidationScore: number;
  loggingMonitoringScore: number;
  secureDesignScore: number;
  securityFindings: SecurityFinding[];
  recommendations: SecurityRecommendation[];
  prioritizedActions: PriorityAction[];
  complianceScore?: number;
  gaps?: ComplianceGap[];
};

export type SecurityFinding = {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: Severity;
  impact: string;
  recommendation: string;
};

export type SecurityRecommendation = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type PriorityAction = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  timeframe: string;
};

export type ComplianceGap = {
  framework: string;
  requirement: string;
  description: string;
  severity: Severity;
  remediation: string;
};

export type DesignReviewDashboardStats = {
  totalReviews: number;
  reviewsByStatus: { status: DesignReviewStatus; count: number }[];
  reviewsByGrade: { grade: SecurityGrade; count: number }[];
  reviewsByRisk: { risk: RiskLevel; count: number }[];
  averageSecurityScore: number;
  completedReviewsThisMonth: number;
  pendingReviews: number;
  recentReviews: DesignReviewWithDetails[];
};

// Third-Party Review Types
export type ThirdPartyReviewWithDetails = ThirdPartyReview & {
  user: User;
  organization?: Organization;
};

export type ThirdPartyReviewRequest = {
  name: string;
  description?: string;
  applicationUrl: string;
  additionalUrls?: string[];
  vendor?: string;
  applicationCategory?: string;
  businessPurpose?: string;
  dataTypes?: string[];
  scanFrequency?: ScanFrequency;
  businessOwner?: string;
  technicalContact?: string;
  contractStatus?: ContractStatus;
  contractExpiry?: Date;
  dataProcessingAgreement?: boolean;
  dataClassification?: DataClassification;
  businessCriticality?: BusinessCriticality;
};

export type ThirdPartyReviewScanRequest = {
  url: string;
  scanType: 'BASIC' | 'COMPREHENSIVE';
  includeHeaders?: boolean;
  includeCookies?: boolean;
  includePrivacyPolicy?: boolean;
  includeTermsOfService?: boolean;
};

export type ThirdPartyReviewScanResponse = {
  overallScore: number;
  securityGrade: SecurityGrade;
  tlsGrade: string;
  httpSecurityHeaders: SecurityHeadersAnalysis;
  cookieAnalysis: CookieAnalysis;
  privacyPolicyStatus: PrivacyPolicyStatus;
  termsOfServiceStatus: TermsOfServiceStatus;
  securityFeatures: SecurityFeaturesAnalysis;
  checklistResults: ChecklistResult[];
  securityFindings: SecurityFinding[];
  recommendations: SecurityRecommendation[];
  riskLevel: RiskLevel;
  riskFactors: string[];
};

export type SecurityHeadersAnalysis = {
  score: number;
  headers: {
    [key: string]: {
      present: boolean;
      value?: string;
      recommendation?: string;
      severity?: Severity;
    };
  };
};

export type CookieAnalysis = {
  score: number;
  totalCookies: number;
  secureCookies: number;
  httpOnlyCookies: number;
  sameSiteCookies: number;
  issues: {
    type: string;
    description: string;
    severity: Severity;
  }[];
};

export type SecurityFeaturesAnalysis = {
  supportsSSO?: boolean;
  supportsMFA?: boolean;
  authenticationMethods: string[];
  encryptionInTransit?: boolean;
  encryptionAtRest?: boolean;
  dataBackups?: boolean;
  incidentResponse?: boolean;
  penetrationTesting?: boolean;
  vulnerabilityManagement?: boolean;
  certifications: string[];
};

export type ChecklistResult = {
  category: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_APPLICABLE';
  score: number;
  details?: string;
  recommendation?: string;
};

export type ThirdPartyDashboardStats = {
  totalReviews: number;
  reviewsByStatus: { status: ThirdPartyReviewStatus; count: number }[];
  reviewsByGrade: { grade: SecurityGrade; count: number }[];
  reviewsByRisk: { risk: RiskLevel; count: number }[];
  averageSecurityScore: number;
  scheduledScans: number;
  failedScans: number;
  highRiskApplications: number;
  recentReviews: ThirdPartyReviewWithDetails[];
};

// Link Types
export type ThreatModelAssetLinkWithDetails = ThreatModelAssetLink & {
  threatModel: ThreatModel;
  applicationAsset: ApplicationAsset;
};

export type DesignReviewAssetLinkWithDetails = DesignReviewAssetLink & {
  designReview: DesignReview;
  applicationAsset: ApplicationAsset;
};

// Enhanced Threat Modeling Types (with new relationships)
export type EnhancedThreatModelWithDetails = ThreatModel & {
  user: User;
  findings: FindingWithEnhancedDetails[];
  reports: Report[];
  fileUploads: FileUpload[];
  assets: AssetWithDetails[];
  linkedAssets: ThreatModelAssetLinkWithDetails[];
};

export type ThreatModelCreationRequest = {
  name: string;
  description?: string;
  prompt?: string;
  linkedAssetIds?: string[];
  analysisType: 'PROMPT' | 'DOCUMENT' | 'HYBRID';
  documentContent?: string;
  systemContext?: string;
  securityRequirements?: string[];
};

// Unified Dashboard Types
export type UnifiedDashboardStats = {
  threatModeling: {
    totalThreatModels: number;
    completedThreatModels: number;
    totalFindings: number;
    criticalFindings: number;
    recentThreatModels: ThreatModelWithDetails[];
  };
  assetManagement: AssetDashboardStats;
  designReviews: DesignReviewDashboardStats;
  thirdPartyReviews: ThirdPartyDashboardStats;
  overallSecurityPosture: {
    overallScore: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    riskDistribution: { risk: RiskLevel; count: number }[];
    complianceScore: number;
  };
};

// Activity and Analytics Types
export type ModuleActivityLog = {
  module: 'THREAT_MODELING' | 'ASSET_MANAGEMENT' | 'DESIGN_REVIEW' | 'THIRD_PARTY_REVIEW';
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  timestamp: Date;
  user: User;
};

export type SecurityMetrics = {
  assetsWithThreatModels: number;
  assetsWithDesignReviews: number;
  highRiskAssets: number;
  complianceGaps: number;
  securityScore: number;
  trendData: {
    date: Date;
    score: number;
  }[];
};

// Search and Filter Types
export type AssetFilter = {
  assetType?: ApplicationAssetType[];
  status?: ApplicationAssetStatus[];
  businessCriticality?: BusinessCriticality[];
  environment?: Environment[];
  threatModelStatus?: ThreatModelLinkStatus[];
  designReviewStatus?: DesignReviewLinkStatus[];
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
};

export type DesignReviewFilter = {
  status?: DesignReviewStatus[];
  reviewType?: DesignReviewType[];
  systemType?: SystemType[];
  securityGrade?: SecurityGrade[];
  riskLevel?: RiskLevel[];
  dateRange?: {
    from: Date;
    to: Date;
  };
};

export type ThirdPartyReviewFilter = {
  status?: ThirdPartyReviewStatus[];
  securityGrade?: SecurityGrade[];
  riskLevel?: RiskLevel[];
  contractStatus?: ContractStatus[];
  scanFrequency?: ScanFrequency[];
  dateRange?: {
    from: Date;
    to: Date;
  };
};

// ============================================================================
// ENDPOINT DISCOVERY TYPES - Automated endpoint discovery with AI classification
// ============================================================================

// Endpoint Discovery Session Types
export type EndpointDiscoverySession = {
  id: string;
  applicationAssetId: string;
  domain: string;
  status: 'PENDING' | 'INITIALIZING' | 'SCANNING' | 'ANALYZING' | 'CLASSIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  maxDepth: number;
  includeSubdomains: boolean;
  followRedirects: boolean;
  customHeaders?: string;
  authConfig?: string;
  totalEndpoints: number;
  processedEndpoints: number;
  endpointsFound: number;
  highRiskEndpoints: number;
  mediumRiskEndpoints: number;
  lowRiskEndpoints: number;
  anomaliesDetected: number;
  aiSummary?: string;
  insights?: string;
  recommendations?: string;
  scanStartedAt?: Date;
  scanCompletedAt?: Date;
  scanDuration?: number;
  zapSessionId?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type EndpointDiscoverySessionWithDetails = EndpointDiscoverySession & {
  applicationAsset: ApplicationAsset;
  user: User;
  discoveredEndpoints: DiscoveredEndpoint[];
  _count: {
    discoveredEndpoints: number;
  };
};

// Discovered Endpoint Types
export type DiscoveredEndpoint = {
  id: string;
  sessionId: string;
  url: string;
  method: string;
  path: string;
  queryParams: string[];
  statusCode?: number;
  responseSize?: number;
  responseTime?: number;
  contentType?: string;
  serverHeader?: string;
  securityHeaders?: string;
  cookieAnalysis?: string;
  endpointType?: 'LOGIN_PAGE' | 'AUTHENTICATION' | 'ADMIN_PANEL' | 'API_ENDPOINT' | 'FORM_SUBMISSION' | 'FILE_UPLOAD' | 'DOWNLOAD' | 'SEARCH' | 'USER_PROFILE' | 'STATIC_CONTENT' | 'DOCUMENTATION' | 'ERROR_PAGE' | 'REDIRECT' | 'HEALTH_CHECK' | 'METRICS' | 'WEBHOOK' | 'CALLBACK' | 'OTHER';
  sensitivity?: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL' | 'HIGHLY_SENSITIVE';
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classification?: string;
  functionPurpose?: string;
  securityConcerns: string[];
  dataExposure: string[];
  isAnomaly: boolean;
  anomalyReason?: string;
  anomalyScore?: number;
  discoveredAt: Date;
  discoveryMethod?: string;
  parentUrl?: string;
  depth: number;
  forms?: string;
  jsFiles: string[];
  assets: string[];
};

export type DiscoveredEndpointWithDetails = DiscoveredEndpoint & {
  session: EndpointDiscoverySession;
};

// Endpoint Discovery Request/Response Types
export type EndpointDiscoveryRequest = {
  applicationAssetId: string;
  domain: string;
  maxDepth?: number;
  includeSubdomains?: boolean;
  followRedirects?: boolean;
  customHeaders?: Record<string, string>;
  authConfig?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials: Record<string, string>;
  };
};

export type EndpointDiscoveryResponse = {
  success: boolean;
  sessionId: string;
  message: string;
  error?: string;
};

export type EndpointDiscoveryStatusResponse = {
  sessionId: string;
  status: string;
  progress: number;
  domain: string;
  createdAt: string;
  scanStartedAt?: string;
  scanCompletedAt?: string;
  scanDuration?: number;
  estimatedTimeRemaining?: number;
  totalEndpoints: number;
  processedEndpoints: number;
  endpointsFound: number;
  highRiskEndpoints: number;
  mediumRiskEndpoints: number;
  lowRiskEndpoints: number;
  anomaliesDetected: number;
  config: {
    maxDepth: number;
    includeSubdomains: boolean;
    followRedirects: boolean;
  };
  asset: {
    id: string;
    name: string;
    applicationUrl?: string;
  };
  aiSummary?: string;
  insights?: any;
  errorMessage?: string;
  retryCount: number;
  endpointStats?: {
    total: number;
    byRiskLevel: Record<string, number>;
    anomalies: number;
  };
};

export type EndpointDiscoveryResultsResponse = {
  endpoints: DiscoveredEndpoint[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    riskLevel?: string;
    endpointType?: string;
    sensitivity?: string;
    anomaliesOnly: boolean;
    search?: string;
  };
  sorting: {
    sortBy: string;
    sortOrder: string;
  };
  stats: {
    riskLevels: Record<string, number>;
    endpointTypes: Record<string, number>;
    sensitivities: Record<string, number>;
    anomalies: number;
    averageRiskScore: number;
  };
};

// Enhanced Asset Types with Endpoint Discovery
export type ApplicationAssetWithEndpointDiscovery = ApplicationAssetWithDetails & {
  endpointDiscoverySessions: EndpointDiscoverySessionWithDetails[];
};

// Endpoint Discovery Statistics
export type EndpointDiscoveryStats = {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalEndpointsDiscovered: number;
  highRiskEndpoints: number;
  anomaliesDetected: number;
  averageRiskScore: number;
  recentSessions: EndpointDiscoverySessionWithDetails[];
  riskDistribution: { risk: string; count: number }[];
  endpointTypeDistribution: { type: string; count: number }[];
};

// Endpoint Discovery Filter Types
export type EndpointDiscoveryFilter = {
  status?: ('PENDING' | 'INITIALIZING' | 'SCANNING' | 'ANALYZING' | 'CLASSIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED')[];
  riskLevel?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  endpointType?: string[];
  sensitivity?: ('PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL' | 'HIGHLY_SENSITIVE')[];
  anomaliesOnly?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  domain?: string;
  applicationAssetId?: string;
};

// Export all existing types
export {
  ThreatModelStatus,
  FindingStatus,
  Severity,
  StrideCategory,
  ReportFormat,
  UserRole,
  AssetType,
  AssetImpact,
  // Export BGuard Suite Enums
  ApplicationAssetType,
  ApplicationAssetStatus,
  BusinessCriticality,
  DataClassification,
  HostingType,
  Environment,
  ThreatModelLinkStatus,
  DesignReviewLinkStatus,
  DesignReviewStatus,
  DesignReviewType,
  SystemType,
  SecurityGrade,
  RiskLevel,
  ThirdPartyReviewStatus,
  ScanFrequency,
  PrivacyPolicyStatus,
  TermsOfServiceStatus,
  ContractStatus,
  LinkStatus
};
