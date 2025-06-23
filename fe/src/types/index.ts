
export type ProductCategory = "Refrigerators" | "Washing Machines" | "Televisions";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
}

export type VerificationMatchStatus = "Correct" | "Incorrect" | "Uncertain";

// Individual match result for label and overview
export interface MatchResult {
  result: string; // "yes" | "no" | "unknown"
  confidence: number;
  explanation: string;
}

// Token usage information
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface VerificationResult {
  matchStatus: VerificationMatchStatus;
  confidenceScore: number;
  explanation: string;
  uploadedOverviewImage: string; // key or URL
  uploadedLabelImage: string; // key or URL
  referenceImages: string[]; // URLs
}

// Updated to match actual API response
export interface TransactionData {
  id: string; // API returns 'id' not 'transactionId'
  timestamp: string; // API returns ISO string, not Unix timestamp
  productId: string;
  productCategory: string; // API returns category code like "REF", "WM", "TV"
  uploadedLabelImageKey: string;
  uploadedOverviewImageKey: string;
  uploadedReferenceImageKey: string;
  verificationResult: string; // "CORRECT" | "INCORRECT" | "UNCERTAIN"
  overallConfidence: number;
  labelMatch: MatchResult;
  overviewMatch: MatchResult;
  aiModel: string;
  tokenUsage: TokenUsage;
}

// Legacy interface for backward compatibility (maps to new structure)
export interface LegacyTransactionData {
  transactionId: string;
  timestamp: number; // Unix timestamp
  productId: string;
  productName: string;
  category: ProductCategory;
  processingTime: number; // in milliseconds
  storeLocation: string;
  result: VerificationResult;
}

export interface ImageFile {
  key: string;
  name: string;
  url: string; // placeholder URL
  dataUri: string; // placeholder data URI for AI
  type: 'overview' | 'label'; // folder type: overview (CHÍNH DIỆN) or label (TEM NL)
}

// Types for System Health Page
export type ServiceStatusType = 'Operational' | 'Degraded' | 'Offline' | 'Checking...';

export interface ServiceHealthInfo {
  id: string;
  name: string;
  status: ServiceStatusType;
  lastChecked: string;
  details?: string;
}
