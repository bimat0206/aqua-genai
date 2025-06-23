
'use client';

import type { TransactionData, LegacyTransactionData, ProductCategory, Product, ImageFile, VerificationResult, VerificationMatchStatus } from '@/types';
import { configManager } from './config';

let configInitialized = false;

async function ensureConfigInitialized() {
    if (!configInitialized) {
        await configManager.initialize();
        configInitialized = true;
    }
}

export async function getApiEndpoint() {
    await ensureConfigInitialized();
    const apiEndpoint = configManager.getApiEndpoint();
    if (!apiEndpoint || apiEndpoint.includes('your-api-gateway-id')) {
        const errorMessage = "API Endpoint is not configured. Please set NEXT_PUBLIC_API_ENDPOINT in your .env file or configure AWS Secrets Manager.";
        if (typeof window !== 'undefined') {
            console.error(errorMessage);
        }
        throw new Error(errorMessage);
    }
    return apiEndpoint;
}

export async function getApiKey() {
    await ensureConfigInitialized();
    const apiKey = configManager.getApiKey();
    if (!apiKey) {
        const errorMessage = "API Key is not configured. Please set NEXT_PUBLIC_API_KEY in your .env file or configure AWS Secrets Manager.";
        if (typeof window !== 'undefined') {
            console.error(errorMessage);
        }
        throw new Error(errorMessage);
    }
    return apiKey;
}

// Helper function to convert category code to display name
function getCategoryDisplayName(categoryCode: string): ProductCategory {
    const categoryMap: Record<string, ProductCategory> = {
        "REF": "Refrigerators",
        "WM": "Washing Machines", 
        "TV": "Televisions"
    };
    return categoryMap[categoryCode] || "Refrigerators"; // Default fallback
}

// Helper function to convert verification result to match status
function convertVerificationResult(result: string): VerificationMatchStatus {
    switch (result.toUpperCase()) {
        case 'CORRECT':
            return 'Correct';
        case 'INCORRECT':
            return 'Incorrect';
        case 'UNCERTAIN':
        default:
            return 'Uncertain';
    }
}

// Convert API response to legacy format for backward compatibility
function convertToLegacyFormat(apiData: TransactionData): LegacyTransactionData {
    // Parse timestamp to Unix timestamp
    const timestamp = new Date(apiData.timestamp).getTime();
    
    // Determine match status based on labelMatch and overviewMatch results
    let matchStatus: VerificationMatchStatus;
    const labelResult = apiData.labelMatch?.result?.toLowerCase();
    const overviewResult = apiData.overviewMatch?.result?.toLowerCase();
    
    if (labelResult === 'yes' && overviewResult === 'yes') {
        matchStatus = 'Correct';
    } else if (labelResult === 'no' || overviewResult === 'no') {
        matchStatus = 'Incorrect';
    } else {
        // Fall back to verificationResult if available, otherwise 'Uncertain'
        matchStatus = apiData.verificationResult ? convertVerificationResult(apiData.verificationResult) : 'Uncertain';
    }
    
    // Create verification result
    const verificationResult: VerificationResult = {
        matchStatus,
        confidenceScore: apiData.overallConfidence,
        explanation: `Label: ${apiData.labelMatch.explanation}\n\nOverview: ${apiData.overviewMatch.explanation}`,
        uploadedOverviewImage: apiData.uploadedOverviewImageKey,
        uploadedLabelImage: apiData.uploadedLabelImageKey,
        referenceImages: apiData.uploadedReferenceImageKey ? apiData.uploadedReferenceImageKey.split(',') : [],
    };

    return {
        transactionId: apiData.id,
        timestamp,
        productId: apiData.productId,
        productName: apiData.productId, // Use product ID as name since API doesn't provide name
        category: getCategoryDisplayName(apiData.productCategory),
        processingTime: apiData.tokenUsage.input_tokens + apiData.tokenUsage.output_tokens, // Approximate processing time
        storeLocation: "Store", // Default value since API doesn't provide this
        result: verificationResult
    };
}

// These functions require an API key for authentication with API Gateway.

export async function getHistory(): Promise<LegacyTransactionData[]> {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    const response = await fetch(`${apiEndpoint}/history?view=list`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch history data:", errorText);
        throw new Error('Failed to fetch history data');
    }
    const result = await response.json();
    const apiData: TransactionData[] = result.data || [];
    
    // Convert API response to legacy format for existing components
    return apiData.map(convertToLegacyFormat);
}

// New function to get raw API data
export async function getHistoryRaw(): Promise<TransactionData[]> {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    const response = await fetch(`${apiEndpoint}/history?view=list`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch history data:", errorText);
        throw new Error('Failed to fetch history data');
    }
    const result = await response.json();
    return result.data || [];
}

// Helper function to convert display names to API category codes
export function getCategoryCode(categoryName: ProductCategory): string {
    const categoryMap: Record<ProductCategory, string> = {
        "Refrigerators": "REF",
        "Washing Machines": "WM", 
        "Televisions": "TV"
    };
    return categoryMap[categoryName] || categoryName;
}


export async function getProducts(category: ProductCategory): Promise<Product[]> {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    const categoryCode = getCategoryCode(category);
    const response = await fetch(`${apiEndpoint}/catalog?type=products&category=${encodeURIComponent(categoryCode)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch products for category ${category}:`, errorText);
        throw new Error('Failed to fetch products for category: ' + category);
    }
    const result = await response.json();
    
    // Transform backend response to frontend format
    const products = result.data || [];
    return products.map((product: any) => ({
        id: product.id,
        name: product.id, // Use ID as name since backend doesn't provide name
        category: getCategoryDisplayName(product.category)
    }));
}

export async function getImages(productId: string, category: string): Promise<ImageFile[]> {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    const response = await fetch(`${apiEndpoint}/catalog?type=images&productId=${encodeURIComponent(productId)}&category=${encodeURIComponent(category)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch images for product ${productId}:`, errorText);
        throw new Error('Failed to fetch images for product: ' + productId);
    }
    const result = await response.json();
    
    // Transform backend response to frontend format
    const imagesData = result.data;
    if (!imagesData) {
        return [];
    }
    
    const allImages: ImageFile[] = [];
    
    // Add label images
    if (imagesData.labelImages) {
        imagesData.labelImages.forEach((img: any) => {
            allImages.push({
                key: img.key,
                name: img.filename,
                url: img.presignedUrl || '',
                dataUri: img.presignedUrl || '', // Use presigned URL as dataUri for now
                type: 'label' as const
            });
        });
    }
    
    // Add overview images
    if (imagesData.overviewImages) {
        imagesData.overviewImages.forEach((img: any) => {
            allImages.push({
                key: img.key,
                name: img.filename,
                url: img.presignedUrl || '',
                dataUri: img.presignedUrl || '', // Use presigned URL as dataUri for now
                type: 'overview' as const
            });
        });
    }
    
    return allImages;
}

// Get images from specific folder
export async function getImagesFromFolder(productId: string, category: string, folder: string): Promise<ImageFile[]> {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    const response = await fetch(`${apiEndpoint}/catalog?type=images&productId=${encodeURIComponent(productId)}&category=${encodeURIComponent(category)}&folder=${encodeURIComponent(folder)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch images for product ${productId} from folder ${folder}:`, errorText);
        throw new Error(`Failed to fetch images for product ${productId} from folder ${folder}`);
    }
    const result = await response.json();
    
    // Transform backend response to frontend format
    const imagesData = result.data;
    if (!imagesData) {
        return [];
    }
    
    const allImages: ImageFile[] = [];
    
    // Add label images
    if (imagesData.labelImages) {
        imagesData.labelImages.forEach((img: any) => {
            allImages.push({
                key: img.key,
                name: img.filename,
                url: img.presignedUrl || '',
                dataUri: img.presignedUrl || '', // Use presigned URL as dataUri for now
                type: 'label' as const
            });
        });
    }
    
    // Add overview images
    if (imagesData.overviewImages) {
        imagesData.overviewImages.forEach((img: any) => {
            allImages.push({
                key: img.key,
                name: img.filename,
                url: img.presignedUrl || '',
                dataUri: img.presignedUrl || '', // Use presigned URL as dataUri for now
                type: 'overview' as const
            });
        });
    }
    
    return allImages;
}

// Get overview images from CHÍNH DIỆN folder
export async function getOverviewImages(productId: string, category: string): Promise<ImageFile[]> {
    return getImagesFromFolder(productId, category, 'CHÍNH DIỆN');
}

// Get label images from TEM NL folder
export async function getLabelImages(productId: string, category: string): Promise<ImageFile[]> {
    return getImagesFromFolder(productId, category, 'TEM NL');
}

// Get individual transaction details
export interface TransactionDetail {
    id: string;
    timestamp: string;
    productId: string;
    productCategory: string;
    uploadedLabelImageKey: string;
    uploadedOverviewImageKey: string;
    uploadedReferenceImageKey?: string;
    verificationResult: string;
    overallConfidence: number;
    labelVerification: {
        result: string;
        confidence: number;
        explanation: string;
    };
    overviewVerification: {
        result: string;
        confidence: number;
        explanation: string;
    };
    imageAccess: {
        uploadedLabelImage?: {
            key: string;
            presignedUrl: string;
            expiresAt: string;
        };
        uploadedOverviewImage?: {
            key: string;
            presignedUrl: string;
            expiresAt: string;
        };
        uploadedReferenceImage?: {
            key: string;
            presignedUrl: string;
            expiresAt: string;
        };
    };
    aiAnalysis: {
        model: string;
        modelId: string;
        stopReason: string;
        tokenUsage: {
            inputTokens: number;
            outputTokens: number;
            cacheCreationInputTokens: number;
            cacheReadInputTokens: number;
        };
        estimatedCost: number;
    };
    metadata: {
        retrievedAt: string;
        presignedUrlExpiry: string;
        apiVersion: string;
    };
}

// Get detailed transaction data from the transaction API
// Falls back gracefully if transaction doesn't exist in new system
export async function getTransactionDetail(transactionId: string): Promise<TransactionDetail | null> {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    
    console.log('Fetching transaction details:', {
        transactionId,
        endpoint: `${apiEndpoint}/transaction/${transactionId}`,
        apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
        fullApiEndpoint: apiEndpoint
    });
    
    try {
        // Use the configured API endpoint instead of hardcoded URL
        const response = await fetch(`${apiEndpoint}/transaction/${transactionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
        });
        
        console.log('API Response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorDetails = errorText;
            
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                    errorDetails = `${errorJson.error.code}: ${errorJson.error.message}`;
                }
            } catch (parseError) {
                // Handle common HTTP error codes with user-friendly messages
                if (response.status === 500) {
                    errorDetails = 'Server error - transaction API may be unavailable';
                } else if (response.status === 404) {
                    errorDetails = 'Transaction not found';
                } else if (response.status === 403) {
                    errorDetails = 'Access denied - invalid API key';
                } else {
                    errorDetails = `HTTP ${response.status}: ${errorText}`;
                }
            }
            
            // Log different levels based on error type
            if (errorDetails.includes('DATABASE_ERROR') || errorDetails.includes('TRANSACTION_NOT_FOUND')) {
                console.warn(`Transaction not available in enhanced API for ${transactionId}:`, errorDetails);
            } else {
                console.error(`Failed to fetch transaction details for ${transactionId}:`, errorDetails);
            }
            throw new Error(`Failed to fetch transaction details: ${errorDetails}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error) {
            // Log the error but don't throw for better UX - return null to indicate failure
            console.warn(`Could not fetch enhanced transaction details for ${transactionId}:`, error.message);
            throw error; // Still throw so calling code can handle gracefully
        }
        throw error;
    }
}
