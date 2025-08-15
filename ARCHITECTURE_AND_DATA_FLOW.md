# Aqua GenAI Application - Architecture and Data Flow Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Backend Services](#backend-services)
5. [Frontend Application](#frontend-application)
6. [Infrastructure](#infrastructure)
7. [Data Models](#data-models)
8. [API Endpoints](#api-endpoints)
9. [Security and Authentication](#security-and-authentication)
10. [Deployment and Configuration](#deployment-and-configuration)

## System Overview

The Aqua GenAI application is a comprehensive product verification system that uses AI-powered image analysis to verify the authenticity and compliance of Aqua brand appliances. The system compares uploaded product images (both overview and label images) against a curated reference dataset using Amazon Bedrock's Claude AI model.

### Key Features

- **AI-Powered Verification**: Uses Amazon Bedrock Claude models for intelligent image comparison
- **Multi-Category Support**: Handles Refrigerators, Washing Machines, and Televisions
- **Real-time Analysis**: Provides instant verification results with confidence scores
- **Historical Tracking**: Maintains complete audit trail of all verification transactions
- **Interactive Frontend**: Modern React-based UI with step-by-step verification wizard
- **Scalable Architecture**: Serverless AWS infrastructure for high availability

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  • New Verification Page   • History Page   • Components       │
│  • Image Browser          • Result Display  • API Client       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (API Keys)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  • Authentication (API Keys)  • Request Routing               │
│  • Rate Limiting              • CORS Headers                  │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Catalog API    │    │  History API    │    │ Transaction API │
│  (Go Lambda)    │    │  (Go Lambda)    │    │  (Go Lambda)    │
│                 │    │                 │    │                 │
│ • Categories    │    │ • List View     │    │ • Get Details   │
│ • Products      │    │ • Analytics     │    │ • Presigned     │
│ • Images        │    │ • Export        │    │   URLs          │
│ • Presigned     │    │ • Filtering     │    │ • AI Analysis   │
│   URLs          │    │                 │    │   Parsing       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │              ┌────────┼────────┐             │
        │              │        │        │             │
        ▼              ▼        ▼        ▼             ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   S3 Dataset    │ │   DynamoDB      │ │ S3 Validation   │
│     Bucket      │ │    Results      │ │     Bucket      │
│                 │ │    Table        │ │                 │
│ • REF/WM/TV     │ │                 │ │ • Uploaded      │
│ • Reference     │ │ • Transactions  │ │   Images        │
│   Images        │ │ • AI Responses  │ │ • Temporary     │
│ • Organized     │ │ • Metadata      │ │   Storage       │
│   by Product    │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              ▲                   ▲
                              │                   │
                              │    ┌─────────────────┐
                              │    │ Core Verification│
                              │    │     Lambda      │
                              │    │   (Python)      │
                              │    │                 │
                              │    │ POST /validate  │
                              │    │                 │
                              └────┤ • Image Fetch   │
                                   │ • AI Orchestr.  │
                                   │ • Result Store  │
                                   │ • Response Gen. │
                                   └─────────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │  Amazon Bedrock │
                                   │   (Claude AI)   │
                                   │                 │
                                   │ • Image Analysis│
                                   │ • Comparison    │
                                   │ • Confidence    │
                                   │ • Explanations  │
                                   └─────────────────┘
```

## Data Flow Diagrams

### Complete System Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │  Frontend   │    │ API Gateway │    │  Backend    │
│ Interface   │    │ (Next.js)   │    │   Layer     │    │  Services   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. Product        │                   │                   │
       │   Selection       │                   │                   │
       ├──────────────────▶│                   │                   │
       │                   │ 2. GET /catalog   │                   │
       │                   │   ?type=products  │                   │
       │                   ├──────────────────▶│ 3. Route to       │
       │                   │                   │   Catalog API     │
       │                   │                   ├──────────────────▶│
       │                   │ 4. Product List   │                   │
       │                   │◀──────────────────┤                   │
       │ 5. Display        │                   │                   │
       │   Products        │                   │                   │
       │◀──────────────────┤                   │                   │
       │                   │                   │                   │
       │ 6. Image          │                   │                   │
       │   Selection       │                   │                   │
       ├──────────────────▶│                   │                   │
       │                   │ 7. GET /catalog   │                   │
       │                   │   ?type=images    │                   │
       │                   ├──────────────────▶│ 8. Route to       │
       │                   │                   │   Catalog API     │
       │                   │                   ├──────────────────▶│
       │                   │ 9. Presigned URLs │                   │
       │                   │◀──────────────────┤                   │
       │ 10. Image Browser │                   │                   │
       │◀──────────────────┤                   │                   │
       │                   │                   │                   │
       │ 11. Submit        │                   │                   │
       │    Verification   │                   │                   │
       ├──────────────────▶│                   │                   │
       │                   │ 12. POST /validate│                   │
       │                   ├──────────────────▶│ 13. Route to      │
       │                   │                   │    Core Lambda    │
       │                   │                   ├──────────────────▶│
       │                   │ 14. AI Results    │                   │
       │                   │◀──────────────────┤                   │
       │ 15. Show Results  │                   │                   │
       │◀──────────────────┤                   │                   │
```

### Core Verification Process (POST /validate)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │ Core Lambda │    │ S3 Services │    │  Bedrock    │    │  DynamoDB   │
│             │    │  (Python)   │    │             │    │   (AI)      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ 1. POST /validate │                   │                   │                   │
       │  {product_id,     │                   │                   │                   │
       │   category,       │                   │                   │                   │
       │   images}         │                   │                   │                   │
       ├──────────────────▶│                   │                   │                   │
       │                   │ 2. Validate       │                   │                   │
       │                   │    Request        │                   │                   │
       │                   │                   │                   │                   │
       │                   │ 3. Fetch Uploaded │                   │                   │
       │                   │    Images         │                   │                   │
       │                   ├──────────────────▶│                   │                   │
       │                   │ 4. Image Bytes    │                   │                   │
       │                   │◀──────────────────┤                   │                   │
       │                   │                   │                   │                   │
       │                   │ 5. Fetch Reference│                   │                   │
       │                   │    Images         │                   │                   │
       │                   ├──────────────────▶│                   │                   │
       │                   │ 6. Reference Data │                   │                   │
       │                   │◀──────────────────┤                   │                   │
       │                   │                   │                   │                   │
       │                   │ 7. Build AI Prompt│                   │                   │
       │                   │    + Images       │                   │                   │
       │                   ├───────────────────┼──────────────────▶│                   │
       │                   │ 8. AI Analysis    │                   │                   │
       │                   │◀───────────────────┼──────────────────┤                   │
       │                   │                   │                   │                   │
       │                   │ 9. Parse Results  │                   │                   │
       │                   │    + Generate     │                   │                   │
       │                   │    Transaction ID │                   │                   │
       │                   │                   │                   │                   │
       │                   │ 10. Store Complete│                   │                   │
       │                   │     Transaction   │                   │                   │
       │                   ├───────────────────┼───────────────────┼──────────────────▶│
       │                   │ 11. Confirm Save  │                   │                   │
       │                   │◀───────────────────┼───────────────────┼──────────────────┤
       │                   │                   │                   │                   │
       │ 12. Return        │                   │                   │                   │
       │     {match,       │                   │                   │                   │
       │      confidence,  │                   │                   │                   │
       │      explanation, │                   │                   │                   │
       │      txnId}       │                   │                   │                   │
       │◀──────────────────┤                   │                   │                   │
```

### Supporting API Flows

#### 1. History Retrieval Flow
```
Frontend → History API → DynamoDB → Frontend Display
    │           │            │            │
    │           │            └─ Scan/Query Results
    │           └─ Format & Paginate
    └─ Display Table with Filters
```

#### 2. Transaction Detail Flow
```
Frontend → Transaction API → DynamoDB → S3 Presigned URLs → Frontend Detail View
    │           │               │            │                      │
    │           │               └─ Get Record└─ Generate URLs       │
    │           └─ Parse AI Response + Build Response              │
    └─ Modal with Images + Analysis                               │
```

#### 3. Catalog Discovery Flow  
```
Frontend → Catalog API → S3 Dataset → Presigned URLs → Frontend Browser
    │           │            │             │                │
    │           │            └─ List Objects└─ Generate URLs │
    │           └─ Organize by Category/Product/Type         │
    └─ Image Selection Interface                            │
```

## Backend Services

### 1. Core Verification Lambda (Python) - `/app/src/index.py`

**Purpose**: **PRIMARY VERIFICATION ENGINE** - Orchestrates the complete AI-powered product verification process through the `POST /validate` endpoint.

**Location**: `/app/src/index.py` - Main Lambda handler  
**Endpoint**: `POST /validate`  
**Runtime**: Python 3.9 with AWS Lambda

**Key Responsibilities**:
- **Primary Endpoint**: Accepts and processes all product verification requests
- **Image Processing**: Handles both S3 keys and direct base64 image data
- **Reference Data**: Fetches curated reference images from organized S3 dataset
- **AI Orchestration**: Constructs sophisticated prompts and invokes Amazon Bedrock Claude models
- **Response Processing**: Parses, validates, and structures AI analysis results
- **Data Persistence**: Stores complete transaction records with full audit trail in DynamoDB
- **Error Handling**: Comprehensive error handling with detailed user feedback

**Detailed Processing Flow**:
```python
def lambda_handler(event, context):
    """
    Main verification handler - processes POST /validate requests
    """
    
    # 1. Request Validation & Parsing
    body = json.loads(event.get("body", "{}"))
    product_id = body.get("product_id") or body.get("productId")
    product_category = body.get("product_category") or body.get("category")
    
    # Support both S3 keys and direct base64 data
    uploaded_label_image_key = body.get("uploaded_label_image_key")
    uploaded_overview_image_key = body.get("uploaded_overview_image_key")
    label_image_data = body.get("labelImage")  # Direct base64
    overview_image_data = body.get("overviewImage")  # Direct base64
    
    # 2. Image Data Retrieval
    if uploaded_label_image_key:
        # Fetch from S3 validation bucket
        uploaded_label_image_bytes = s3_input_img_validation_service.get_image_bytes(uploaded_label_image_key)
    else:
        # Process direct base64 data
        uploaded_label_image_bytes = base64.b64decode(label_image_data.split(',')[1])
    
    # 3. Reference Images Discovery
    reference_label_folder = f"dataset/{product_category}/{product_id}/TEM NL/"
    reference_frontview_folder = f"dataset/{product_category}/{product_id}/CHÍNH DIỆN/"
    reference_web_folder = f"dataset/{product_category}/{product_id}/HÌNH WEB/"
    
    reference_label_keys = s3_dataset_service.list_keys(reference_label_folder, max_files=Config.MAX_REFERENCE_LABEL_IMAGES)
    reference_overview_keys = s3_dataset_service.list_keys(reference_web_folder, max_files=Config.MAX_REFERENCE_OVERVIEW_IMAGES)
    
    # 4. AI Model Invocation via Bedrock
    result_text = bedrock_service.get_check_response(
        uploaded_label_image_bytes=uploaded_label_image_bytes,
        uploaded_overview_image_bytes=uploaded_overview_image_bytes,
        reference_label_images_with_types=base64_reference_label_images_with_types,
        reference_overview_images_with_types=base64_reference_overview_images_with_types,
        product_id=product_id,
        product_category=product_category
    )
    
    # 5. Transaction Recording
    item_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    dynamo_item = {
        "id": item_id,
        "timestamp": timestamp,
        "productId": product_id,
        "productCategory": product_category,
        "uploadedLabelImageKey": uploaded_label_image_key or "direct_base64_data",
        "uploadedOverviewImageKey": uploaded_overview_image_key or "direct_base64_data",
        "uploadedReferenceImageKey": ",".join(reference_overview_keys),
        "bedrockResponse": result_text
    }
    
    dynamodb_service.insert_item(dynamo_item)
    
    # 6. Response Generation
    return {
        "statusCode": 200,
        "headers": get_cors_headers(),
        "body": json.dumps({
            "matchLabelToReference": response_data.get("matchLabelToReference", "unknown"),
            "matchLabelToReference_confidence": response_data.get("matchLabelToReference_confidence", 0),
            "label_explanation": response_data.get("label_explanation", ""),
            "matchOverviewToReference": response_data.get("matchOverviewToReference", "unknown"),
            "matchOverviewToReference_confidence": response_data.get("matchOverviewToReference_confidence", 0),
            "overview_explanation": response_data.get("overview_explanation", ""),
            "transactionId": item_id
        })
    }
```

**Supporting Modules**:
- **`/app/src/services/s3_service.py`**: S3 operations and image handling
- **`/app/src/services/bedrock_service.py`**: AI model invocation and prompt engineering  
- **`/app/src/services/dynamodb_service.py`**: Database operations and transaction storage
- **`/app/src/config.py`**: Environment configuration and prompt templates
- **`/app/src/utils/logger_config.py`**: Centralized logging configuration

### 2. Catalog API (Go) - `/api/catalog/main.go`

**Purpose**: Provides browsing and discovery capabilities for the product dataset.

**Key Features**:
- **Categories Discovery**: Lists all available product categories (REF, WM, TV)
- **Products Discovery**: Lists products within a specific category  
- **Images Discovery**: Provides presigned URLs for product reference images
- **Folder-Specific Queries**: Supports filtering by image folder types

**API Endpoints**:
```go
// GET /catalog?type=categories
// Returns: All product categories with counts

// GET /catalog?type=products&category=REF  
// Returns: All products in Refrigerators category

// GET /catalog?type=images&category=REF&productId=12345
// Returns: All images for specific product with presigned URLs

// GET /catalog?type=images&category=REF&productId=12345&folder=TEM%20NL
// Returns: Label images only for specific product
```

### 3. Transaction API (Go) - `/api/transaction/main.go`

**Purpose**: Retrieves detailed information about individual verification transactions.

**Key Features**:
- Fetch complete transaction details by transaction ID
- Generate presigned URLs for uploaded and reference images
- Parse and structure AI analysis results
- Calculate confidence scores and verification status
- Provide cost estimation based on token usage

**Response Structure**:
```go
type TransactionResponse struct {
    ID                        string              `json:"id"`
    Timestamp                 time.Time           `json:"timestamp"`
    ProductID                 string              `json:"productId"`
    ProductCategory           string              `json:"productCategory"`
    VerificationResult        string              `json:"verificationResult"`
    OverallConfidence         float64             `json:"overallConfidence"`
    LabelVerification         VerificationDetail  `json:"labelVerification"`
    OverviewVerification      VerificationDetail  `json:"overviewVerification"`
    ImageAccess               ImageAccessData     `json:"imageAccess"`
    AIAnalysis                AIAnalysisData      `json:"aiAnalysis"`
}
```

### 4. History API (Go) - `/api/history/main.go`

**Purpose**: Provides comprehensive historical data and analytics for all verification transactions.

**Key Features**:
- **List View**: Paginated transaction history with filtering and sorting
- **Summary View**: Analytics and statistics across date ranges  
- **Export View**: Data export in multiple formats (CSV, JSON)
- **Advanced Filtering**: By product ID, category, date range, verification result

**Query Examples**:
```go
// GET /history?view=list&page=1&pageSize=20&category=REF
// GET /history?view=summary&dateRange=month
// GET /history?view=export&format=csv&productId=12345
```

## Frontend Application

### Architecture: Next.js 15 with React 18

The frontend is built as a modern React application using Next.js with TypeScript, featuring a component-based architecture with clear separation of concerns.

### Key Components

#### 1. New Verification Page (`/fe/src/components/new-verification-page.tsx`)

**Purpose**: Multi-step wizard for creating new product verifications.

**Steps**:
1. **Product Selection**: Choose category and product ID
2. **Overview Image**: Select from reference overview images  
3. **Label Image**: Select from reference label images
4. **Review**: Confirm selections before submission
5. **Results**: Display AI analysis with detailed explanations

**Key Features**:
- Real-time image loading from Catalog API
- Progressive image selection with visual feedback
- AI result parsing with confidence indicators
- Copy-to-clipboard functionality for analysis text
- Expandable detailed view modals

#### 2. History Page (`/fe/src/components/history-page.tsx`)

**Purpose**: Browse and analyze historical verification data.

**Features**:
- **Data Table**: Sortable, filterable transaction history
- **Real-time Search**: Debounced search across product IDs and transaction IDs
- **Advanced Filtering**: By category, result status, date ranges
- **Pagination**: Efficient handling of large datasets
- **Detailed View**: Modal with complete transaction information

#### 3. API Client (`/fe/src/lib/api-client.ts`)

**Purpose**: Centralized API communication layer with type safety.

**Key Functions**:
```typescript
// Authentication and configuration
export async function getApiEndpoint(): Promise<string>
export async function getApiKey(): Promise<string>

// Product catalog operations  
export async function getProducts(category: ProductCategory): Promise<Product[]>
export async function getOverviewImages(productId: string, category: string): Promise<ImageFile[]>
export async function getLabelImages(productId: string, category: string): Promise<ImageFile[]>

// Historical data operations
export async function getHistory(): Promise<LegacyTransactionData[]>
export async function getTransactionDetail(transactionId: string): Promise<TransactionDetail | null>
```

### Data Flow in Frontend

```typescript
// 1. Component Initialization - Load Products via Catalog API
useEffect(() => {
    const loadProducts = async () => {
        if (selectedCategory) {
            setIsLoadingProducts(true);
            try {
                const categoryCode = getCategoryCode(selectedCategory);
                // Calls GET /catalog?type=products&category={categoryCode}
                const products = await getProducts(categoryCode as ProductCategory);
                setAvailableProducts(products);
            } catch (error) {
                console.error('Failed to load products:', error);
                toast({
                    title: "Error Loading Products",
                    description: "Failed to load products for the selected category.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingProducts(false);
            }
        }
    };
    loadProducts();
}, [selectedCategory]);

// 2. Image Selection - Load Reference Images via Catalog API
useEffect(() => {
    const loadStepImages = async () => {
        if (!selectedProduct || !selectedCategory) return;
        
        const categoryCode = getCategoryCode(selectedCategory);
        
        if (currentStep === 2 && overviewImages.length === 0) {
            // Calls GET /catalog?type=images&folder=CHÍNH DIỆN
            setIsLoadingImages(true);
            try {
                const images = await getOverviewImages(selectedProduct.id, categoryCode);
                setOverviewImages(images);
            } catch (error) {
                console.error('Failed to load overview images:', error);
            } finally {
                setIsLoadingImages(false);
            }
        } else if (currentStep === 3 && labelImages.length === 0) {
            // Calls GET /catalog?type=images&folder=TEM NL
            setIsLoadingImages(true);
            try {
                const images = await getLabelImages(selectedProduct.id, categoryCode);
                setLabelImages(images);
            } catch (error) {
                console.error('Failed to load label images:', error);
            } finally {
                setIsLoadingImages(false);
            }
        }
    };
    loadStepImages();
}, [currentStep, selectedProduct, selectedCategory]);

// 3. Verification Submission - Core Python Lambda via POST /validate
const handleSubmit = async () => {
    if (!selectedProduct || !overviewImage || !labelImage || !selectedCategory) {
        toast({
            title: "Missing Information",
            description: "Please ensure all fields are selected before submitting.",
            variant: "destructive",
        });
        return;
    }
    
    setIsLoading(true);
    setProgressValue(0);
    setCurrentStep(wizardSteps.length);

    try {
        const categoryCode = getCategoryCode(selectedCategory);
        
        // Prepare request for Python Core Lambda
        const aiInput = {
            product_id: selectedProduct.id,
            product_category: categoryCode,
            uploaded_overview_image_key: overviewImage.key,
            uploaded_label_image_key: labelImage.key,
        };
        
        // Call POST /validate endpoint (Python Lambda)
        const result = await submitVerification(aiInput);
        
        // Parse and map AI response to frontend format
        let matchStatus: VerificationMatchStatus;
        const labelMatch = result.matchLabelToReference?.toLowerCase();
        const overviewMatch = result.matchOverviewToReference?.toLowerCase();
        
        if (labelMatch === 'yes' && overviewMatch === 'yes') {
            matchStatus = 'Correct';
        } else if (labelMatch === 'no' || overviewMatch === 'no') {
            matchStatus = 'Incorrect';
        } else {
            matchStatus = 'Uncertain';
        }
        
        const mappedResult: ExtendedVerificationResult = {
            matchStatus,
            confidenceScore: Math.max(
                result.matchLabelToReference_confidence || 0,
                result.matchOverviewToReference_confidence || 0
            ),
            labelExplanation: result.label_explanation,
            overviewExplanation: result.overview_explanation,
            labelConfidence: result.matchLabelToReference_confidence || 0,
            overviewConfidence: result.matchOverviewToReference_confidence || 0,
            transactionId: result.transactionId,
            timestamp: new Date().toISOString()
        };
        
        setVerificationResult(mappedResult);
        
    } catch (error) {
        console.error("Verification Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to get verification result.";
        setSubmissionError(errorMessage);
    } finally {
        setIsLoading(false);
    }
};

// 4. History Retrieval - History API
const refreshData = useCallback(() => {
    setIsLoading(true);
    // Calls GET /history?view=list
    getHistory()
        .then(data => {
            setAllData(data);
        })
        .catch(err => {
            console.error("Failed to fetch history:", err);
            toast({
                title: "Error Fetching Data",
                description: "Could not retrieve verification history.",
                variant: "destructive",
            });
        })
        .finally(() => {
            setIsLoading(false);
        });
}, [toast]);

// 5. Transaction Detail Retrieval - Transaction API
const loadTransactionDetail = async (transactionId: string) => {
    try {
        // Calls GET /transaction/{transactionId}
        const detail = await getTransactionDetail(transactionId);
        if (detail) {
            setTransactionDetail(detail);
            setShowDetailModal(true);
        }
    } catch (error) {
        console.warn('Enhanced transaction details not available:', error);
        // Fallback to basic transaction display
    }
};
```

## Infrastructure

### AWS Services Architecture

The application leverages a fully serverless AWS architecture for scalability and cost-efficiency:

#### 1. **Amazon API Gateway**
- **Purpose**: Entry point for all API requests
- **Features**: Authentication, rate limiting, request/response transformation
- **Security**: API key-based authentication for all endpoints

#### 2. **AWS Lambda Functions**
- **Core Lambda (Python)**: Main verification engine
- **Catalog API (Go)**: Dataset browsing and discovery
- **Transaction API (Go)**: Individual transaction details
- **History API (Go)**: Historical data and analytics

#### 3. **Amazon S3**
- **Dataset Bucket**: Curated reference images organized by category/product/folder
- **Validation Bucket**: Temporarily stores uploaded images during verification
- **Organization Structure**:
  ```
  dataset/
  ├── REF/           # Refrigerators
  │   └── {product_id}/
  │       ├── TEM NL/        # Label images
  │       ├── CHÍNH DIỆN/    # Front view images  
  │       └── HÌNH WEB/      # Web images
  ├── WM/            # Washing Machines
  └── TV/            # Televisions
  ```

#### 4. **Amazon DynamoDB**
- **Purpose**: Persistent storage for all verification transactions
- **Schema**: Single table design with transaction ID as primary key
- **Data**: Complete AI responses, metadata, timestamps, product information

#### 5. **Amazon Bedrock**
- **Purpose**: AI/ML service for image analysis using Claude models
- **Usage**: Processes verification requests with uploaded and reference images
- **Output**: Structured JSON responses with confidence scores and explanations

### Infrastructure as Code

The infrastructure is managed through Terraform configuration located in `/infra/`:

```hcl
# Core infrastructure modules
module "vpc" { source = "./modules/vpc" }
module "ecs" { source = "./modules/ecs" }  
module "lambda" { source = "./modules/lambda" }
module "api_gateway" { source = "./modules/api_gateway" }
module "dynamodb" { source = "./modules/dynamodb" }
module "s3" { source = "./modules/s3" }
module "ecr" { source = "./modules/ecr" }
```

## Data Models

### Core Data Structures

#### 1. Verification Request
```typescript
interface VerificationRequest {
    product_id: string;           // e.g., "ABC-123"  
    product_category: string;     // "REF", "WM", "TV"
    uploaded_label_image_key: string;    // S3 key for label image
    uploaded_overview_image_key: string; // S3 key for overview image
}
```

#### 2. Verification Response  
```typescript
interface VerificationResponse {
    matchLabelToReference: "yes" | "no" | "uncertain";
    matchLabelToReference_confidence: number;        // 0.0 - 1.0
    label_explanation: string;
    matchOverviewToReference: "yes" | "no" | "uncertain";  
    matchOverviewToReference_confidence: number;     // 0.0 - 1.0
    overview_explanation: string;
    transactionId: string;                          // UUID
}
```

#### 3. Transaction Record (DynamoDB)
```typescript
interface TransactionRecord {
    id: string;                                     // Primary key (UUID)
    timestamp: string;                              // ISO 8601 format
    productId: string;
    productCategory: string; 
    uploadedLabelImageKey: string;
    uploadedOverviewImageKey: string;
    uploadedReferenceImageKey: string;              // Comma-separated
    bedrockResponse: BedrockResponse;               // Complete AI response
}
```

#### 4. Bedrock Response Structure
```typescript
interface BedrockResponse {
    role: string;
    model: string;                                  // e.g., "claude-3-sonnet"
    usage: TokenUsage;
    content: ContentItem[];
    stop_reason: string;
}

interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
}
```

## API Endpoints

### Complete API Reference

#### 1. Core Verification API (Python Lambda)
```
POST /validate
Content-Type: application/json
x-api-key: {API_KEY}

Description: Main verification endpoint that processes product image verification requests using AI analysis.

Request Body (Option 1 - S3 Keys):
{
    "product_id": "ABC-123",
    "product_category": "REF", 
    "uploaded_label_image_key": "validate/ABC-123/label.jpg",
    "uploaded_overview_image_key": "validate/ABC-123/overview.jpg"
}

Request Body (Option 2 - Direct Base64 Data):
{
    "product_id": "ABC-123",
    "product_category": "REF",
    "labelImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
    "overviewImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
}

Response:
{
    "matchLabelToReference": "yes",
    "matchLabelToReference_confidence": 0.95,
    "label_explanation": "The product code matches exactly with reference SKU ABC-123. Energy rating of 4.5 stars is correctly displayed. All mandatory information including capacity (350L) and power consumption (245 kWh/year) are accurately shown on the label.",
    "matchOverviewToReference": "yes", 
    "matchOverviewToReference_confidence": 0.89,
    "overview_explanation": "The product design and features align perfectly with reference images. Twin Inverter technology badge is visible, door configuration matches the 2-door bottom-freezer design, and glossy black finish is consistent with specifications.",
    "transactionId": "550e8400-e29b-41d4-a716-446655440000"
}

Error Responses:
400 Bad Request: Missing required parameters
404 Not Found: No reference images found for product
500 Internal Server Error: AI processing or database errors
502 Bad Gateway: Bedrock service failures
```

#### 2. Catalog API (Go Lambda)
```
GET /catalog?type=categories
GET /catalog?type=products&category={CATEGORY_CODE}
GET /catalog?type=images&category={CATEGORY}&productId={PRODUCT_ID}
GET /catalog?type=images&category={CATEGORY}&productId={PRODUCT_ID}&folder={FOLDER_NAME}
x-api-key: {API_KEY}

Description: Provides browsing and discovery capabilities for the product dataset.

Response Examples:
Categories: { "type": "categories", "data": [...], "metadata": {...} }
Products: { "type": "products", "data": [...], "metadata": {...} }  
Images: { "type": "images", "data": {"labelImages": [...], "overviewImages": [...]}, "metadata": {...} }
```

#### 3. Transaction API (Go Lambda)
```
GET /transaction/{transactionId}
x-api-key: {API_KEY}

Description: Retrieves detailed information about individual verification transactions.

Response:
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-15T10:30:00Z",
    "productId": "ABC-123",
    "productCategory": "REF",
    "verificationResult": "CORRECT",
    "overallConfidence": 0.92,
    "labelVerification": {...},
    "overviewVerification": {...},
    "imageAccess": {...},
    "aiAnalysis": {...}
}
```

#### 4. History API (Go Lambda)
```
GET /history?view=list&page=1&pageSize=20
GET /history?view=list&category=REF&result=Correct
GET /history?view=summary&dateRange=month  
GET /history?view=export&format=csv
x-api-key: {API_KEY}

Description: Provides comprehensive historical data and analytics for all verification transactions.

Response Structure:
{
    "view": "list",
    "data": [...],
    "pagination": {...},
    "metadata": {...}
}
```

## Security and Authentication

### 1. API Authentication
- **Method**: API Key-based authentication via `x-api-key` header
- **Scope**: All API Gateway endpoints require valid API key
- **Management**: API keys managed through AWS API Gateway

### 2. Data Security
- **Encryption**: All data encrypted at rest (S3, DynamoDB) and in transit (HTTPS)
- **Access Control**: IAM roles with least-privilege access principles
- **Presigned URLs**: Temporary, time-limited access to S3 objects (15-minute expiry)

### 3. Infrastructure Security
- **VPC**: Private networking for Lambda functions and RDS instances
- **Security Groups**: Restrictive inbound/outbound rules
- **WAF**: Web Application Firewall for API Gateway protection

## Deployment and Configuration

### 1. Environment Configuration

#### Backend Environment Variables
```bash
# Core Lambda (Python)
MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
VALIDATION_BUCKET=aqua-validation-images
DATASET_BUCKET=aqua-reference-dataset  
DYNAMO_TABLE=aqua-verification-results
MAX_REFERENCE_LABEL_IMAGES=5
MAX_REFERENCE_OVERVIEW_IMAGES=5
LOG_LEVEL=INFO

# Go APIs  
AWS_REGION=us-east-1
AWS_DATASET_BUCKET=aqua-reference-dataset
AWS_RESULT_TABLE=aqua-verification-results
AWS_IMPUT_IMG_VALIDATION_BUCKET=aqua-validation-images
PRESIGNED_URL_EXPIRY=15
```

#### Frontend Environment Variables
```bash
# Next.js Frontend
NEXT_PUBLIC_API_ENDPOINT=https://api.example.com
NEXT_PUBLIC_API_KEY=your-api-key
NEXT_PUBLIC_AWS_REGION=us-east-1
```

### 2. Deployment Process

#### Infrastructure Deployment (Terraform)
```bash
cd infra/
terraform init
terraform plan -var-file="terraform.tfvars"  
terraform apply -var-file="terraform.tfvars"
```

#### Lambda Deployment (Go APIs)
```bash
# Each API has its own deployment script
cd api/catalog/ && ./deploy.sh
cd api/transaction/ && ./deploy.sh  
cd api/history/ && ./deploy.sh
```

#### Frontend Deployment (Next.js)
```bash
cd fe/
npm install
npm run build
npm run start
```

### 3. Configuration Management
- **Terraform**: Infrastructure state managed in S3 backend
- **AWS Secrets Manager**: API keys and sensitive configuration
- **Environment-specific configs**: Development, staging, production environments

### 4. Monitoring and Logging
- **CloudWatch Logs**: Centralized logging for all Lambda functions
- **CloudWatch Metrics**: Performance monitoring and alerting
- **X-Ray Tracing**: Distributed tracing for request flow analysis

## Performance Considerations

### 1. Scalability
- **Serverless Architecture**: Auto-scaling Lambda functions based on demand
- **DynamoDB**: On-demand scaling for variable workloads
- **S3**: Virtually unlimited storage capacity
- **CDN**: CloudFront for global content delivery

### 2. Optimization Strategies
- **Connection Pooling**: Reuse of database and API connections
- **Caching**: Aggressive caching of reference images and API responses
- **Presigned URLs**: Offload image delivery to S3 direct access
- **Parallel Processing**: Concurrent S3 operations where possible

### 3. Cost Optimization
- **On-demand Pricing**: Pay only for actual usage across all services
- **Intelligent Tiering**: S3 storage optimization for infrequently accessed data
- **Reserved Capacity**: DynamoDB reserved capacity for predictable workloads

This architecture provides a robust, scalable, and cost-effective solution for AI-powered product verification while maintaining high security standards and operational excellence.