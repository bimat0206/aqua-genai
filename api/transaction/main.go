package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// Configuration structure
type Config struct {
	ResultTable        string
	DatasetBucket      string
	ValidationBucket   string
	Region             string
	PresignedURLExpiry time.Duration
	LogLevel           string
}

// Core data structures matching existing DynamoDB schema
type TransactionRecord struct {
	ID                        string          `json:"id" dynamodbav:"id"`
	Timestamp                 string          `json:"timestamp" dynamodbav:"timestamp"`
	ProductID                 string          `json:"productId" dynamodbav:"productId"`
	ProductCategory           string          `json:"productCategory" dynamodbav:"productCategory"`
	UploadedLabelImageKey     string          `json:"uploadedLabelImageKey" dynamodbav:"uploadedLabelImageKey"`
	UploadedOverviewImageKey  string          `json:"uploadedOverviewImageKey" dynamodbav:"uploadedOverviewImageKey"`
	UploadedReferenceImageKey string          `json:"uploadedReferenceImageKey" dynamodbav:"uploadedReferenceImageKey"`
	BedrockResponse           BedrockResponse `json:"bedrockResponse" dynamodbav:"bedrockResponse"`
}

// BedrockResponse matches the existing DynamoDB structure exactly
type BedrockResponse struct {
	Role         string        `json:"role" dynamodbav:"role"`
	StopSequence *string       `json:"stop_sequence" dynamodbav:"stop_sequence"`
	Usage        TokenUsage    `json:"usage" dynamodbav:"usage"`
	StopReason   string        `json:"stop_reason" dynamodbav:"stop_reason"`
	Model        string        `json:"model" dynamodbav:"model"`
	ID           string        `json:"id" dynamodbav:"id"`
	Type         string        `json:"type" dynamodbav:"type"`
	Content      []ContentItem `json:"content" dynamodbav:"content"`
}

type TokenUsage struct {
	OutputTokens             int `json:"output_tokens" dynamodbav:"output_tokens"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens" dynamodbav:"cache_creation_input_tokens"`
	InputTokens              int `json:"input_tokens" dynamodbav:"input_tokens"`
	CacheReadInputTokens     int `json:"cache_read_input_tokens" dynamodbav:"cache_read_input_tokens"`
}

type ContentItem struct {
	Type string                 `json:"type" dynamodbav:"type"`
	Text map[string]interface{} `json:"text" dynamodbav:"text"`
}

// Parsed verification results from AI response
type VerificationResults struct {
	MatchLabelToReference    string  `json:"matchLabelToReference" dynamodbav:"matchLabelToReference"`
	MatchLabelConfidence     float64 `json:"matchLabelToReference_confidence" dynamodbav:"matchLabelToReference_confidence"`
	LabelExplanation         string  `json:"label_explanation" dynamodbav:"label_explanation"`
	MatchOverviewToReference string  `json:"matchOverviewToReference" dynamodbav:"matchOverviewToReference"`
	MatchOverviewConfidence  float64 `json:"matchOverviewToReference_confidence" dynamodbav:"matchOverviewToReference_confidence"`
	OverviewExplanation      string  `json:"overview_explanation" dynamodbav:"overview_explanation"`
}

// API Response structures
type TransactionResponse struct {
	ID                        string              `json:"id"`
	Timestamp                 time.Time           `json:"timestamp"`
	ProductID                 string              `json:"productId"`
	ProductCategory           string              `json:"productCategory"`
	UploadedLabelImageKey     string              `json:"uploadedLabelImageKey"`
	UploadedOverviewImageKey  string              `json:"uploadedOverviewImageKey"`
	UploadedReferenceImageKey string              `json:"uploadedReferenceImageKey"`
	VerificationResult        string              `json:"verificationResult"`
	OverallConfidence         float64             `json:"overallConfidence"`
	LabelVerification         VerificationDetail  `json:"labelVerification"`
	OverviewVerification      VerificationDetail  `json:"overviewVerification"`
	ImageAccess               ImageAccessData     `json:"imageAccess"`
	AIAnalysis                AIAnalysisData      `json:"aiAnalysis"`
	RawResponse               BedrockResponse     `json:"rawResponse"`
	Metadata                  TransactionMetadata `json:"metadata"`
}

type VerificationDetail struct {
	Result      string  `json:"result"`
	Confidence  float64 `json:"confidence"`
	Explanation string  `json:"explanation"`
}

type ImageAccessData struct {
	UploadedLabelImage     *ImageAccess `json:"uploadedLabelImage,omitempty"`
	UploadedOverviewImage  *ImageAccess `json:"uploadedOverviewImage,omitempty"`
	UploadedReferenceImage *ImageAccess `json:"uploadedReferenceImage,omitempty"`
}

type ImageAccess struct {
	Key          string    `json:"key"`
	PresignedURL string    `json:"presignedUrl"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type AIAnalysisData struct {
	Model         string     `json:"model"`
	ModelID       string     `json:"modelId"`
	StopReason    string     `json:"stopReason"`
	TokenUsage    TokenUsage `json:"tokenUsage"`
	EstimatedCost float64    `json:"estimatedCost"`
}

type TransactionMetadata struct {
	RetrievedAt        time.Time `json:"retrievedAt"`
	PresignedURLExpiry string    `json:"presignedUrlExpiry"`
	APIVersion         string    `json:"apiVersion"`
}

type ErrorResponse struct {
	Error struct {
		Code      string    `json:"code"`
		Message   string    `json:"message"`
		Timestamp time.Time `json:"timestamp"`
	} `json:"error"`
}

// Global variables
var (
	dynamoClient  *dynamodb.Client
	s3Client      *s3.Client
	presignClient *s3.PresignClient
	appConfig     *Config
	awsConfig     aws.Config
)

// Initialize AWS services and configuration
func init() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load configuration from environment variables
	appConfig = &Config{
		ResultTable:        os.Getenv("AWS_RESULT_TABLE"),
		DatasetBucket:      os.Getenv("AWS_DATASET_BUCKET"),
		ValidationBucket:   os.Getenv("AWS_IMPUT_IMG_VALIDATION_BUCKET"),
		Region:             os.Getenv("AWS_REGION"),
		PresignedURLExpiry: 15 * time.Minute, // Default 15 minutes
		LogLevel:           os.Getenv("LOG_LEVEL"),
	}

	if appConfig.ResultTable == "" {
		log.Fatal("AWS_RESULT_TABLE environment variable is required")
	}

	if appConfig.DatasetBucket == "" {
		log.Fatal("AWS_DATASET_BUCKET environment variable is required")
	}

	if appConfig.ValidationBucket == "" {
		log.Fatal("AWS_IMPUT_IMG_VALIDATION_BUCKET environment variable is required")
	}

	log.Printf("Initializing Transaction API with config: table=%s, datasetBucket=%s, validationBucket=%s, region=%s",
		appConfig.ResultTable, appConfig.DatasetBucket, appConfig.ValidationBucket, appConfig.Region)

	// Initialize AWS configuration
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(appConfig.Region))
	if err != nil {
		log.Fatalf("Failed to load AWS configuration: %v", err)
	}

	// Store AWS config globally for manual presigning
	awsConfig = cfg

	// Initialize AWS clients
	dynamoClient = dynamodb.NewFromConfig(cfg)
	s3Client = s3.NewFromConfig(cfg)
	presignClient = s3.NewPresignClient(s3Client)

	log.Println("AWS DynamoDB and S3 clients initialized successfully")
}

// Main Lambda handler function
func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	requestID := request.RequestContext.RequestID
	log.Printf("Processing transaction request - RequestID: %s, Path: %s", requestID, request.Path)

	// Extract transaction ID from path parameters
	transactionID := request.PathParameters["transactionId"]
	if transactionID == "" {
		log.Printf("RequestID: %s - Missing transactionId in path parameters", requestID)
		return createErrorResponse(400, "MISSING_TRANSACTION_ID", "Transaction ID is required in path")
	}

	// Validate UUID format
	if _, err := uuid.Parse(transactionID); err != nil {
		log.Printf("RequestID: %s - Invalid UUID format for transactionId: %s", requestID, transactionID)
		return createErrorResponse(400, "INVALID_TRANSACTION_ID", "Transaction ID must be a valid UUID")
	}

	log.Printf("RequestID: %s - Processing transaction ID: %s", requestID, transactionID)

	// Retrieve transaction from DynamoDB
	transactionRecord, err := getTransactionRecord(ctx, requestID, transactionID)
	if err != nil {
		if err.Error() == "transaction not found" {
			log.Printf("RequestID: %s - Transaction not found: %s", requestID, transactionID)
			return createErrorResponse(404, "TRANSACTION_NOT_FOUND", fmt.Sprintf("Transaction with ID '%s' was not found", transactionID))
		}
		log.Printf("RequestID: %s - Failed to retrieve transaction: %v", requestID, err)
		return createErrorResponse(500, "DATABASE_ERROR", "Failed to retrieve transaction from database")
	}

	log.Printf("RequestID: %s - Transaction record retrieved successfully", requestID)

	// Parse and build comprehensive response
	response, err := buildTransactionResponse(ctx, requestID, transactionRecord)
	if err != nil {
		log.Printf("RequestID: %s - Failed to build transaction response: %v", requestID, err)
		return createErrorResponse(500, "RESPONSE_BUILD_ERROR", "Failed to process transaction data")
	}

	// Serialize response to JSON
	responseBody, err := json.Marshal(response)
	if err != nil {
		log.Printf("RequestID: %s - JSON serialization failed: %v", requestID, err)
		return createErrorResponse(500, "SERIALIZATION_ERROR", "Failed to serialize response")
	}

	log.Printf("RequestID: %s - Transaction processing completed successfully, response size: %d bytes", requestID, len(responseBody))

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, x-api-key",
		},
		Body: string(responseBody),
	}, nil
}

// Retrieve transaction record from DynamoDB
func getTransactionRecord(ctx context.Context, requestID, transactionID string) (*TransactionRecord, error) {
	log.Printf("RequestID: %s - Querying DynamoDB for transaction: %s", requestID, transactionID)

	input := &dynamodb.GetItemInput{
		TableName: aws.String(appConfig.ResultTable),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: transactionID},
		},
	}

	result, err := dynamoClient.GetItem(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("DynamoDB GetItem failed: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("transaction not found")
	}

	log.Printf("RequestID: %s - DynamoDB item retrieved successfully", requestID)

	// Unmarshal DynamoDB item to struct
	var record TransactionRecord
	err = attributevalue.UnmarshalMap(result.Item, &record)
	if err != nil {
		log.Printf("RequestID: %s - Failed to unmarshal DynamoDB item: %v", requestID, err)
		return nil, fmt.Errorf("failed to unmarshal transaction record: %w", err)
	}

	log.Printf("RequestID: %s - Transaction record unmarshaled: ProductID=%s, Category=%s",
		requestID, record.ProductID, record.ProductCategory)

	return &record, nil
}

// Build comprehensive transaction response
func buildTransactionResponse(ctx context.Context, requestID string, record *TransactionRecord) (*TransactionResponse, error) {
	log.Printf("RequestID: %s - Building comprehensive transaction response", requestID)

	// Parse timestamp
	timestamp, err := time.Parse(time.RFC3339, strings.Replace(record.Timestamp, "Z", "", 1)+"Z")
	if err != nil {
		timestamp = time.Now()
		log.Printf("RequestID: %s - Warning: Failed to parse timestamp %s: %v", requestID, record.Timestamp, err)
	}

	// Parse verification results from Bedrock response
	verificationResults, err := parseVerificationResults(requestID, record.BedrockResponse)
	if err != nil {
		log.Printf("RequestID: %s - Warning: Failed to parse verification results: %v", requestID, err)
		// Continue with default values
		verificationResults = &VerificationResults{
			MatchLabelToReference:    "unknown",
			MatchLabelConfidence:     0.0,
			LabelExplanation:         "Failed to parse AI response",
			MatchOverviewToReference: "unknown",
			MatchOverviewConfidence:  0.0,
			OverviewExplanation:      "Failed to parse AI response",
		}
	}

	// Calculate overall confidence and verification result
	overallConfidence := (verificationResults.MatchLabelConfidence + verificationResults.MatchOverviewConfidence) / 2
	verificationResult := determineVerificationResult(verificationResults, overallConfidence)

	log.Printf("RequestID: %s - Verification analysis: Result=%s, Confidence=%.3f, Label=%.3f, Overview=%.3f",
		requestID, verificationResult, overallConfidence,
		verificationResults.MatchLabelConfidence, verificationResults.MatchOverviewConfidence)

	// Generate presigned URLs for image access
	imageAccess, err := generateImageAccessURLs(ctx, requestID, record)
	if err != nil {
		log.Printf("RequestID: %s - Warning: Failed to generate some presigned URLs: %v", requestID, err)
		// Continue with partial image access
	}

	// Calculate estimated cost (basic estimation based on token usage)
	estimatedCost := calculateEstimatedCost(record.BedrockResponse.Usage)

	// Build response
	response := &TransactionResponse{
		ID:                        record.ID,
		Timestamp:                 timestamp,
		ProductID:                 record.ProductID,
		ProductCategory:           record.ProductCategory,
		UploadedLabelImageKey:     record.UploadedLabelImageKey,
		UploadedOverviewImageKey:  record.UploadedOverviewImageKey,
		UploadedReferenceImageKey: record.UploadedReferenceImageKey,
		VerificationResult:        verificationResult,
		OverallConfidence:         overallConfidence,
		LabelVerification: VerificationDetail{
			Result:      verificationResults.MatchLabelToReference,
			Confidence:  verificationResults.MatchLabelConfidence,
			Explanation: verificationResults.LabelExplanation,
		},
		OverviewVerification: VerificationDetail{
			Result:      verificationResults.MatchOverviewToReference,
			Confidence:  verificationResults.MatchOverviewConfidence,
			Explanation: verificationResults.OverviewExplanation,
		},
		ImageAccess: imageAccess,
		AIAnalysis: AIAnalysisData{
			Model:         record.BedrockResponse.Model,
			ModelID:       record.BedrockResponse.ID,
			StopReason:    record.BedrockResponse.StopReason,
			TokenUsage:    record.BedrockResponse.Usage,
			EstimatedCost: estimatedCost,
		},
		RawResponse: record.BedrockResponse,
		Metadata: TransactionMetadata{
			RetrievedAt:        time.Now(),
			PresignedURLExpiry: "15 minutes",
			APIVersion:         "v1",
		},
	}

	log.Printf("RequestID: %s - Transaction response built successfully", requestID)
	return response, nil
}

// Parse verification results from Bedrock response content (matching actual DynamoDB structure)
func parseVerificationResults(requestID string, bedrockResponse BedrockResponse) (*VerificationResults, error) {
	if len(bedrockResponse.Content) == 0 {
		return nil, fmt.Errorf("empty content array in bedrock response")
	}

	// Extract the text map from the first content item
	textMap := bedrockResponse.Content[0].Text
	log.Printf("RequestID: %s - Extracted text map from content: %+v", requestID, textMap)

	results := &VerificationResults{}
	
	// Parse string fields from the map
	if val, ok := textMap["matchLabelToReference"].(string); ok {
		results.MatchLabelToReference = val
	}
	if val, ok := textMap["label_explanation"].(string); ok {
		results.LabelExplanation = val
	}
	if val, ok := textMap["matchOverviewToReference"].(string); ok {
		results.MatchOverviewToReference = val
	}
	if val, ok := textMap["overview_explanation"].(string); ok {
		results.OverviewExplanation = val
	}
	
	// Parse numeric confidence values - they come as float64 from DynamoDB unmarshaling
	if val, ok := textMap["matchLabelToReference_confidence"].(float64); ok {
		results.MatchLabelConfidence = val
	}
	if val, ok := textMap["matchOverviewToReference_confidence"].(float64); ok {
		results.MatchOverviewConfidence = val
	}

	log.Printf("RequestID: %s - Parsed verification results: label=%s (%.2f), overview=%s (%.2f)",
		requestID, results.MatchLabelToReference, results.MatchLabelConfidence,
		results.MatchOverviewToReference, results.MatchOverviewConfidence)

	return results, nil
}

// Determine verification result based on AI analysis (matching existing system logic)
func determineVerificationResult(results *VerificationResults, overallConfidence float64) string {
	labelMatch := results.MatchLabelToReference == "yes"
	overviewMatch := results.MatchOverviewToReference == "yes"

	if labelMatch && overviewMatch && overallConfidence >= 0.85 {
		return "CORRECT"
	} else if overallConfidence < 0.60 {
		return "INCORRECT"
	} else {
		return "UNCERTAIN"
	}
}

// Generate presigned URLs for image access
func generateImageAccessURLs(ctx context.Context, requestID string, record *TransactionRecord) (ImageAccessData, error) {
	log.Printf("RequestID: %s - Generating presigned URLs for images", requestID)

	imageAccess := ImageAccessData{}
	expiresAt := time.Now().Add(appConfig.PresignedURLExpiry)

	// Generate presigned URL for label image
	if record.UploadedLabelImageKey != "" {
		labelURL, err := generatePresignedURL(ctx, requestID, record.UploadedLabelImageKey)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to generate presigned URL for label image: %v", requestID, err)
		} else {
			imageAccess.UploadedLabelImage = &ImageAccess{
				Key:          record.UploadedLabelImageKey,
				PresignedURL: labelURL,
				ExpiresAt:    expiresAt,
			}
			log.Printf("RequestID: %s - Generated presigned URL for label image", requestID)
		}
	}

	// Generate presigned URL for overview image
	if record.UploadedOverviewImageKey != "" {
		overviewURL, err := generatePresignedURL(ctx, requestID, record.UploadedOverviewImageKey)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to generate presigned URL for overview image: %v", requestID, err)
		} else {
			imageAccess.UploadedOverviewImage = &ImageAccess{
				Key:          record.UploadedOverviewImageKey,
				PresignedURL: overviewURL,
				ExpiresAt:    expiresAt,
			}
			log.Printf("RequestID: %s - Generated presigned URL for overview image", requestID)
		}
	}

	// Generate presigned URL for reference image (handle comma-separated values)
	if record.UploadedReferenceImageKey != "" {
		// Split comma-separated reference image keys and use the first one
		referenceKeys := strings.Split(record.UploadedReferenceImageKey, ",")
		if len(referenceKeys) > 0 {
			firstReferenceKey := strings.TrimSpace(referenceKeys[0])
			referenceURL, err := generatePresignedURL(ctx, requestID, firstReferenceKey)
			if err != nil {
				log.Printf("RequestID: %s - Warning: Failed to generate presigned URL for reference image: %v", requestID, err)
			} else {
				imageAccess.UploadedReferenceImage = &ImageAccess{
					Key:          firstReferenceKey,
					PresignedURL: referenceURL,
					ExpiresAt:    expiresAt,
				}
				log.Printf("RequestID: %s - Generated presigned URL for reference image (using first of %d images)", requestID, len(referenceKeys))
			}
		}
	}

	return imageAccess, nil
}

// Generate presigned URL for S3 object
func generatePresignedURL(ctx context.Context, requestID, key string) (string, error) {
	log.Printf("RequestID: %s - Generating presigned URL for key: %s", requestID, key)

	// Determine bucket based on key prefix (matching existing system logic)
	var bucket string
	if strings.HasPrefix(key, "dataset/") {
		bucket = appConfig.DatasetBucket
	} else {
		bucket = appConfig.ValidationBucket
	}

	// Use the standard AWS SDK approach but create a fresh presign client
	// to ensure clean configuration
	freshPresignClient := s3.NewPresignClient(s3Client)

	request, err := freshPresignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = appConfig.PresignedURLExpiry
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	log.Printf("RequestID: %s - Presigned URL generated successfully for bucket: %s", requestID, bucket)
	return request.URL, nil
}

// Calculate estimated cost based on token usage (basic estimation)
func calculateEstimatedCost(usage TokenUsage) float64 {
	// Example rates for Claude (adjust based on actual pricing)
	inputTokenCost := 0.000003  // $0.000003 per input token
	outputTokenCost := 0.000015 // $0.000015 per output token

	totalCost := float64(usage.InputTokens)*inputTokenCost + float64(usage.OutputTokens)*outputTokenCost
	return totalCost
}

// Create standardized error response
func createErrorResponse(statusCode int, errorCode, message string) (events.APIGatewayProxyResponse, error) {
	errorResp := ErrorResponse{}
	errorResp.Error.Code = errorCode
	errorResp.Error.Message = message
	errorResp.Error.Timestamp = time.Now()

	body, err := json.Marshal(errorResp)
	if err != nil {
		// Fallback to simple error message if JSON marshaling fails
		body = []byte(fmt.Sprintf(`{"error":{"code":"%s","message":"%s","timestamp":"%s"}}`,
			errorCode, message, time.Now().Format(time.RFC3339)))
	}

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, x-api-key",
		},
		Body: string(body),
	}, nil
}

// Main function to start Lambda
func main() {
	log.Println("Starting Aqua Transaction API Lambda function")
	lambda.Start(handler)
}
