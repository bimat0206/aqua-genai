package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
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
)

// Configuration structure
type Config struct {
	ResultTable         string
	ExportBucket       string
	Region             string
	LogLevel           string
}

// Core data structures matching DynamoDB schema
type VerificationRecord struct {
	ID                         string            `json:"id" dynamodbav:"id"`
	Timestamp                  string            `json:"timestamp" dynamodbav:"timestamp"`
	ProductID                  string            `json:"productId" dynamodbav:"productId"`
	ProductCategory            string            `json:"productCategory" dynamodbav:"productCategory"`
	UploadedLabelImageKey      string            `json:"uploadedLabelImageKey" dynamodbav:"uploadedLabelImageKey"`
	UploadedOverviewImageKey   string            `json:"uploadedOverviewImageKey" dynamodbav:"uploadedOverviewImageKey"`
	BedrockResponse           BedrockResponse    `json:"bedrockResponse" dynamodbav:"bedrockResponse"`
}

type BedrockResponse struct {
	Model       string               `json:"model" dynamodbav:"model"`
	Usage       TokenUsage           `json:"usage" dynamodbav:"usage"`
	Content     []ContentItem        `json:"content" dynamodbav:"content"`
	StopReason  string              `json:"stop_reason" dynamodbav:"stop_reason"`
	ID          string              `json:"id" dynamodbav:"id"`
	Type        string              `json:"type" dynamodbav:"type"`
}

type TokenUsage struct {
	InputTokens  int `json:"input_tokens" dynamodbav:"input_tokens"`
	OutputTokens int `json:"output_tokens" dynamodbav:"output_tokens"`
}

type ContentItem struct {
	Type string `json:"type" dynamodbav:"type"`
	Text string `json:"text" dynamodbav:"text"`
}

// Parsed verification results from AI response
type VerificationResults struct {
	MatchLabelToReference       string  `json:"matchLabelToReference"`
	MatchLabelConfidence        float64 `json:"matchLabelToReference_confidence"`
	LabelExplanation           string  `json:"label_explanation"`
	MatchOverviewToReference    string  `json:"matchOverviewToReference"`
	MatchOverviewConfidence     float64 `json:"matchOverviewToReference_confidence"`
	OverviewExplanation        string  `json:"overview_explanation"`
}

// API Response structures
type HistoryResponse struct {
	View       string      `json:"view"`
	Data       interface{} `json:"data"`
	Pagination *Pagination `json:"pagination,omitempty"`
	Metadata   interface{} `json:"metadata"`
}

type HistoryItem struct {
	ID                         string      `json:"id"`
	Timestamp                  time.Time   `json:"timestamp"`
	ProductID                  string      `json:"productId"`
	ProductCategory            string      `json:"productCategory"`
	UploadedLabelImageKey      string      `json:"uploadedLabelImageKey"`
	UploadedOverviewImageKey   string      `json:"uploadedOverviewImageKey"`
	VerificationResult         string      `json:"verificationResult"`
	OverallConfidence          float64     `json:"overallConfidence"`
	LabelMatch                 MatchResult `json:"labelMatch"`
	OverviewMatch              MatchResult `json:"overviewMatch"`
	AIModel                    string      `json:"aiModel"`
	TokenUsage                TokenUsage   `json:"tokenUsage"`
}

type MatchResult struct {
	Result      string  `json:"result"`
	Confidence  float64 `json:"confidence"`
	Explanation string  `json:"explanation"`
}

type Pagination struct {
	CurrentPage     int  `json:"currentPage"`
	PageSize        int  `json:"pageSize"`
	TotalRecords    int  `json:"totalRecords"`
	TotalPages      int  `json:"totalPages"`
	HasNextPage     bool `json:"hasNextPage"`
	HasPreviousPage bool `json:"hasPreviousPage"`
}

type SummaryData struct {
	TotalVerifications   int                        `json:"totalVerifications"`
	SuccessRate         float64                    `json:"successRate"`
	AverageConfidence   float64                    `json:"averageConfidence"`
	CategoryBreakdown   map[string]CategoryStats   `json:"categoryBreakdown"`
	AIModelUsage        map[string]ModelStats      `json:"aiModelUsage"`
	ConfidenceDistribution ConfidenceStats         `json:"confidenceDistribution"`
	LabelAccuracy       AccuracyStats              `json:"labelAccuracy"`
	OverviewAccuracy    AccuracyStats              `json:"overviewAccuracy"`
}

type CategoryStats struct {
	Count         int     `json:"count"`
	SuccessRate   float64 `json:"successRate"`
	AvgConfidence float64 `json:"avgConfidence"`
}

type ModelStats struct {
	Verifications     int     `json:"verifications"`
	AvgInputTokens   int     `json:"avgInputTokens"`
	AvgOutputTokens  int     `json:"avgOutputTokens"`
	TotalCost        float64 `json:"totalCost"`
}

type ConfidenceStats struct {
	High   ConfidenceBucket `json:"high"`
	Medium ConfidenceBucket `json:"medium"`
	Low    ConfidenceBucket `json:"low"`
}

type ConfidenceBucket struct {
	Range      string  `json:"range"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

type AccuracyStats struct {
	AverageConfidence float64 `json:"averageConfidence"`
	SuccessRate      float64 `json:"successRate"`
}

type ExportData struct {
	DownloadURL  string    `json:"downloadUrl"`
	ExpiresAt    time.Time `json:"expiresAt"`
	Format       string    `json:"format"`
	RecordCount  int       `json:"recordCount"`
	FileSize     string    `json:"fileSize"`
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
	dynamoClient *dynamodb.Client
	s3Client     *s3.Client
	appConfig    *Config
)

// Initialize AWS services and configuration
func init() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load configuration from environment variables
	appConfig = &Config{
		ResultTable:  os.Getenv("AWS_RESULT_TABLE"),
		ExportBucket: os.Getenv("AWS_EXPORT_BUCKET"),
		Region:       os.Getenv("AWS_REGION"),
		LogLevel:     os.Getenv("LOG_LEVEL"),
	}

	if appConfig.ResultTable == "" {
		log.Fatal("AWS_RESULT_TABLE environment variable is required")
	}

	log.Printf("Initializing History API with config: table=%s, region=%s, logLevel=%s", 
		appConfig.ResultTable, appConfig.Region, appConfig.LogLevel)

	// Initialize AWS configuration
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(appConfig.Region))
	if err != nil {
		log.Fatalf("Failed to load AWS configuration: %v", err)
	}

	// Initialize AWS clients
	dynamoClient = dynamodb.NewFromConfig(cfg)
	s3Client = s3.NewFromConfig(cfg)

	log.Println("AWS DynamoDB and S3 clients initialized successfully")
}

// Main Lambda handler function
func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	requestID := request.RequestContext.RequestID
	log.Printf("Processing history request - RequestID: %s, Path: %s", requestID, request.Path)

	// Extract and validate query parameters
	queryParams := request.QueryStringParameters
	if queryParams == nil {
		queryParams = make(map[string]string)
	}

	viewType := queryParams["view"]
	if viewType == "" {
		viewType = "list" // Default to list view
	}

	log.Printf("RequestID: %s - Processing view type: %s", requestID, viewType)

	// Route to appropriate handler based on view type
	var response interface{}
	var err error

	switch viewType {
	case "list":
		response, err = handleHistoryList(ctx, requestID, queryParams)
	case "summary":
		response, err = handleSummaryView(ctx, requestID, queryParams)
	case "export":
		response, err = handleExportView(ctx, requestID, queryParams)
	default:
		log.Printf("RequestID: %s - Invalid view type: %s", requestID, viewType)
		return createErrorResponse(400, "INVALID_VIEW", fmt.Sprintf("Invalid 'view' parameter: %s. Valid values: list, summary, export", viewType))
	}

	if err != nil {
		log.Printf("RequestID: %s - Operation failed: %v", requestID, err)
		return createErrorResponse(500, "OPERATION_FAILED", "Internal server error during history operation")
	}

	// Serialize response to JSON
	responseBody, err := json.Marshal(response)
	if err != nil {
		log.Printf("RequestID: %s - JSON serialization failed: %v", requestID, err)
		return createErrorResponse(500, "SERIALIZATION_ERROR", "Failed to serialize response")
	}

	log.Printf("RequestID: %s - Operation completed successfully, response size: %d bytes", requestID, len(responseBody))

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

// Handle history list view with pagination and filtering
func handleHistoryList(ctx context.Context, requestID string, queryParams map[string]string) (*HistoryResponse, error) {
	log.Printf("RequestID: %s - Starting history list operation", requestID)

	// Parse pagination parameters
	page, _ := strconv.Atoi(queryParams["page"])
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(queryParams["pageSize"])
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	log.Printf("RequestID: %s - Pagination: page=%d, pageSize=%d", requestID, page, pageSize)

	// Build filter conditions
	filterExpression, filterValues, attributeNames := buildFilterConditions(queryParams)
	log.Printf("RequestID: %s - Applied filters: %s", requestID, filterExpression)

	// Query DynamoDB with filters
	records, totalCount, err := queryVerificationRecords(ctx, requestID, filterExpression, filterValues, attributeNames, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("failed to query verification records: %w", err)
	}

	log.Printf("RequestID: %s - Retrieved %d records out of %d total", requestID, len(records), totalCount)

	// Convert to API format
	historyItems := make([]HistoryItem, 0, len(records))
	for _, record := range records {
		item, err := convertToHistoryItem(requestID, record)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to convert record %s: %v", requestID, record.ID, err)
			continue
		}
		historyItems = append(historyItems, item)
	}

	// Calculate pagination
	totalPages := (totalCount + pageSize - 1) / pageSize
	pagination := &Pagination{
		CurrentPage:     page,
		PageSize:        pageSize,
		TotalRecords:    totalCount,
		TotalPages:      totalPages,
		HasNextPage:     page < totalPages,
		HasPreviousPage: page > 1,
	}

	response := &HistoryResponse{
		View:       "list",
		Data:       historyItems,
		Pagination: pagination,
		Metadata: map[string]interface{}{
			"scannedAt":      time.Now(),
			"appliedFilters": getAppliedFilters(queryParams),
		},
	}

	log.Printf("RequestID: %s - History list completed: %d items returned", requestID, len(historyItems))
	return response, nil
}

// Handle summary analytics view
func handleSummaryView(ctx context.Context, requestID string, queryParams map[string]string) (*HistoryResponse, error) {
	log.Printf("RequestID: %s - Starting summary analytics operation", requestID)

	// Parse date range
	dateFrom, dateTo := parseDateRange(queryParams)
	log.Printf("RequestID: %s - Summary date range: %s to %s", requestID, dateFrom.Format(time.RFC3339), dateTo.Format(time.RFC3339))

	// Query all records in date range
	records, err := queryAllRecordsInRange(ctx, requestID, dateFrom, dateTo)
	if err != nil {
		return nil, fmt.Errorf("failed to query records for summary: %w", err)
	}

	log.Printf("RequestID: %s - Processing %d records for analytics", requestID, len(records))

	// Calculate analytics
	summaryData := calculateSummaryAnalytics(requestID, records)

	response := &HistoryResponse{
		View: "summary",
		Data: summaryData,
		Metadata: map[string]interface{}{
			"dateRange": map[string]interface{}{
				"from": dateFrom,
				"to":   dateTo,
			},
			"scannedAt": time.Now(),
		},
	}

	log.Printf("RequestID: %s - Summary analytics completed: %d total verifications", requestID, summaryData.TotalVerifications)
	return response, nil
}

// Handle export functionality
func handleExportView(ctx context.Context, requestID string, queryParams map[string]string) (*HistoryResponse, error) {
	format := queryParams["format"]
	if format == "" {
		return nil, fmt.Errorf("missing required 'format' parameter")
	}

	log.Printf("RequestID: %s - Starting export operation, format: %s", requestID, format)

	// Query records with same filters as list view
	filterExpression, filterValues, attributeNames := buildFilterConditions(queryParams)
	records, _, err := queryVerificationRecords(ctx, requestID, filterExpression, filterValues, attributeNames, 1, 10000) // Export all matching records
	if err != nil {
		return nil, fmt.Errorf("failed to query records for export: %w", err)
	}

	log.Printf("RequestID: %s - Exporting %d records", requestID, len(records))

	// Generate export file
	exportData, err := generateExportFile(ctx, requestID, records, format)
	if err != nil {
		return nil, fmt.Errorf("failed to generate export file: %w", err)
	}

	response := &HistoryResponse{
		View: "export",
		Data: exportData,
		Metadata: map[string]interface{}{
			"exportedAt":     time.Now(),
			"appliedFilters": getAppliedFilters(queryParams),
		},
	}

	log.Printf("RequestID: %s - Export completed: %s", requestID, exportData.DownloadURL)
	return response, nil
}

// Build DynamoDB filter conditions based on query parameters
func buildFilterConditions(queryParams map[string]string) (string, map[string]types.AttributeValue, map[string]string) {
	var conditions []string
	filterValues := make(map[string]types.AttributeValue)
	attributeNames := make(map[string]string)

	if productID := queryParams["productId"]; productID != "" {
		conditions = append(conditions, "productId = :productId")
		filterValues[":productId"] = &types.AttributeValueMemberS{Value: productID}
	}

	if category := queryParams["category"]; category != "" {
		conditions = append(conditions, "productCategory = :category")
		filterValues[":category"] = &types.AttributeValueMemberS{Value: category}
	}

	if dateFrom := queryParams["dateFrom"]; dateFrom != "" {
		conditions = append(conditions, "#ts >= :dateFrom")
		filterValues[":dateFrom"] = &types.AttributeValueMemberS{Value: dateFrom}
		attributeNames["#ts"] = "timestamp" // Only add when used
	}

	if dateTo := queryParams["dateTo"]; dateTo != "" {
		conditions = append(conditions, "#ts <= :dateTo")
		filterValues[":dateTo"] = &types.AttributeValueMemberS{Value: dateTo}
		attributeNames["#ts"] = "timestamp" // Only add when used
	}

	filterExpression := strings.Join(conditions, " AND ")
	return filterExpression, filterValues, attributeNames
}

// Query verification records from DynamoDB
func queryVerificationRecords(ctx context.Context, requestID, filterExpression string, filterValues map[string]types.AttributeValue, attributeNames map[string]string, page, pageSize int) ([]VerificationRecord, int, error) {
	log.Printf("RequestID: %s - Querying DynamoDB with filter: %s", requestID, filterExpression)

	input := &dynamodb.ScanInput{
		TableName: aws.String(appConfig.ResultTable),
	}

	if filterExpression != "" {
		input.FilterExpression = aws.String(filterExpression)
		input.ExpressionAttributeValues = filterValues
		// Only set ExpressionAttributeNames if we have any
		if len(attributeNames) > 0 {
			input.ExpressionAttributeNames = attributeNames
		}
	}

	result, err := dynamoClient.Scan(ctx, input)
	if err != nil {
		return nil, 0, fmt.Errorf("DynamoDB scan failed: %w", err)
	}

	log.Printf("RequestID: %s - DynamoDB scan returned %d items", requestID, len(result.Items))

	// Unmarshal records
	var records []VerificationRecord
	for _, item := range result.Items {
		var record VerificationRecord
		err := attributevalue.UnmarshalMap(item, &record)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to unmarshal record: %v", requestID, err)
			continue
		}
		records = append(records, record)
	}

	// Sort by timestamp (newest first)
	sort.Slice(records, func(i, j int) bool {
		return records[i].Timestamp > records[j].Timestamp
	})

	totalCount := len(records)

	// Apply pagination
	start := (page - 1) * pageSize
	end := start + pageSize
	if start >= len(records) {
		records = []VerificationRecord{}
	} else if end > len(records) {
		records = records[start:]
	} else {
		records = records[start:end]
	}

	return records, totalCount, nil
}

// Convert DynamoDB record to API history item format
func convertToHistoryItem(requestID string, record VerificationRecord) (HistoryItem, error) {
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
		// Return item with default values
		return HistoryItem{
			ID:                       record.ID,
			Timestamp:               timestamp,
			ProductID:               record.ProductID,
			ProductCategory:         record.ProductCategory,
			UploadedLabelImageKey:   record.UploadedLabelImageKey,
			UploadedOverviewImageKey: record.UploadedOverviewImageKey,
			VerificationResult:      "UNCERTAIN",
			OverallConfidence:       0.0,
			LabelMatch: MatchResult{
				Result:      "unknown",
				Confidence:  0.0,
				Explanation: "Failed to parse AI response",
			},
			OverviewMatch: MatchResult{
				Result:      "unknown",
				Confidence:  0.0,
				Explanation: "Failed to parse AI response",
			},
			AIModel:    record.BedrockResponse.Model,
			TokenUsage: record.BedrockResponse.Usage,
		}, nil
	}

	// Calculate overall confidence and verification result
	overallConfidence := (verificationResults.MatchLabelConfidence + verificationResults.MatchOverviewConfidence) / 2
	verificationResult := determineVerificationResult(verificationResults, overallConfidence)

	return HistoryItem{
		ID:                       record.ID,
		Timestamp:               timestamp,
		ProductID:               record.ProductID,
		ProductCategory:         record.ProductCategory,
		UploadedLabelImageKey:   record.UploadedLabelImageKey,
		UploadedOverviewImageKey: record.UploadedOverviewImageKey,
		VerificationResult:      verificationResult,
		OverallConfidence:       overallConfidence,
		LabelMatch: MatchResult{
			Result:      verificationResults.MatchLabelToReference,
			Confidence:  verificationResults.MatchLabelConfidence,
			Explanation: verificationResults.LabelExplanation,
		},
		OverviewMatch: MatchResult{
			Result:      verificationResults.MatchOverviewToReference,
			Confidence:  verificationResults.MatchOverviewConfidence,
			Explanation: verificationResults.OverviewExplanation,
		},
		AIModel:    record.BedrockResponse.Model,
		TokenUsage: record.BedrockResponse.Usage,
	}, nil
}

// Parse verification results from Bedrock response content
func parseVerificationResults(requestID string, bedrockResponse BedrockResponse) (VerificationResults, error) {
	if len(bedrockResponse.Content) == 0 {
		return VerificationResults{}, fmt.Errorf("empty content array in bedrock response")
	}

	contentText := bedrockResponse.Content[0].Text
	log.Printf("RequestID: %s - Parsing bedrock content text length: %d", requestID, len(contentText))

	// Handle JSON wrapper removal
	if strings.HasPrefix(contentText, "```") {
		contentText = strings.TrimPrefix(contentText, "```json\n")
		contentText = strings.TrimSuffix(contentText, "\n```")
	}

	var results VerificationResults
	err := json.Unmarshal([]byte(contentText), &results)
	if err != nil {
		log.Printf("RequestID: %s - Failed to parse verification JSON: %v", requestID, err)
		return VerificationResults{}, fmt.Errorf("failed to parse verification results JSON: %w", err)
	}

	log.Printf("RequestID: %s - Parsed verification results: label=%s (%.2f), overview=%s (%.2f)", 
		requestID, results.MatchLabelToReference, results.MatchLabelConfidence, 
		results.MatchOverviewToReference, results.MatchOverviewConfidence)

	return results, nil
}

// Determine verification result based on AI analysis
func determineVerificationResult(results VerificationResults, overallConfidence float64) string {
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

// Query all records within date range for analytics
func queryAllRecordsInRange(ctx context.Context, requestID string, dateFrom, dateTo time.Time) ([]VerificationRecord, error) {
	log.Printf("RequestID: %s - Querying all records from %s to %s", requestID, dateFrom.Format(time.RFC3339), dateTo.Format(time.RFC3339))

	input := &dynamodb.ScanInput{
		TableName:        aws.String(appConfig.ResultTable),
		FilterExpression: aws.String("#ts BETWEEN :dateFrom AND :dateTo"),
		ExpressionAttributeNames: map[string]string{
			"#ts": "timestamp",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":dateFrom": &types.AttributeValueMemberS{Value: dateFrom.Format(time.RFC3339)},
			":dateTo":   &types.AttributeValueMemberS{Value: dateTo.Format(time.RFC3339)},
		},
	}

	result, err := dynamoClient.Scan(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to scan records for analytics: %w", err)
	}

	var records []VerificationRecord
	for _, item := range result.Items {
		var record VerificationRecord
		err := attributevalue.UnmarshalMap(item, &record)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to unmarshal analytics record: %v", requestID, err)
			continue
		}
		records = append(records, record)
	}

	log.Printf("RequestID: %s - Retrieved %d records for analytics", requestID, len(records))
	return records, nil
}

// Calculate comprehensive analytics from verification records
func calculateSummaryAnalytics(requestID string, records []VerificationRecord) SummaryData {
	log.Printf("RequestID: %s - Calculating analytics for %d records", requestID, len(records))

	if len(records) == 0 {
		return SummaryData{
			TotalVerifications:     0,
			SuccessRate:           0.0,
			AverageConfidence:     0.0,
			CategoryBreakdown:     make(map[string]CategoryStats),
			AIModelUsage:          make(map[string]ModelStats),
			ConfidenceDistribution: ConfidenceStats{},
			LabelAccuracy:         AccuracyStats{},
			OverviewAccuracy:      AccuracyStats{},
		}
	}

	var totalConfidence, labelConfidenceSum, overviewConfidenceSum float64
	var correctCount, labelSuccessCount, overviewSuccessCount int
	var highConfidenceCount, mediumConfidenceCount, lowConfidenceCount int

	categoryStats := make(map[string]CategoryStats)
	modelStats := make(map[string]ModelStats)

	for _, record := range records {
		// Parse verification results
		verificationResults, err := parseVerificationResults(requestID, record.BedrockResponse)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Skipping record %s due to parse error: %v", requestID, record.ID, err)
			continue
		}

		overallConfidence := (verificationResults.MatchLabelConfidence + verificationResults.MatchOverviewConfidence) / 2
		verificationResult := determineVerificationResult(verificationResults, overallConfidence)

		// Accumulate totals
		totalConfidence += overallConfidence
		labelConfidenceSum += verificationResults.MatchLabelConfidence
		overviewConfidenceSum += verificationResults.MatchOverviewConfidence

		if verificationResult == "CORRECT" {
			correctCount++
		}

		if verificationResults.MatchLabelToReference == "yes" {
			labelSuccessCount++
		}

		if verificationResults.MatchOverviewToReference == "yes" {
			overviewSuccessCount++
		}

		// Confidence distribution
		if overallConfidence >= 0.85 {
			highConfidenceCount++
		} else if overallConfidence >= 0.70 {
			mediumConfidenceCount++
		} else {
			lowConfidenceCount++
		}

		// Category statistics
		if categoryStats[record.ProductCategory].Count == 0 {
			categoryStats[record.ProductCategory] = CategoryStats{}
		}
		stats := categoryStats[record.ProductCategory]
		stats.Count++
		if verificationResult == "CORRECT" {
			stats.SuccessRate++
		}
		stats.AvgConfidence += overallConfidence
		categoryStats[record.ProductCategory] = stats

		// Model statistics
		modelName := record.BedrockResponse.Model
		if modelStats[modelName].Verifications == 0 {
			modelStats[modelName] = ModelStats{}
		}
		mStats := modelStats[modelName]
		mStats.Verifications++
		mStats.AvgInputTokens += record.BedrockResponse.Usage.InputTokens
		mStats.AvgOutputTokens += record.BedrockResponse.Usage.OutputTokens
		modelStats[modelName] = mStats
	}

	totalRecords := len(records)

	// Finalize category statistics
	for category, stats := range categoryStats {
		stats.SuccessRate = (stats.SuccessRate / float64(stats.Count)) * 100
		stats.AvgConfidence = stats.AvgConfidence / float64(stats.Count)
		categoryStats[category] = stats
	}

	// Finalize model statistics
	for model, stats := range modelStats {
		stats.AvgInputTokens = stats.AvgInputTokens / stats.Verifications
		stats.AvgOutputTokens = stats.AvgOutputTokens / stats.Verifications
		// Estimate cost (example rates for Claude)
		stats.TotalCost = float64(stats.AvgInputTokens)*0.000003 + float64(stats.AvgOutputTokens)*0.000015
		modelStats[model] = stats
	}

	summaryData := SummaryData{
		TotalVerifications: totalRecords,
		SuccessRate:       (float64(correctCount) / float64(totalRecords)) * 100,
		AverageConfidence: totalConfidence / float64(totalRecords),
		CategoryBreakdown: categoryStats,
		AIModelUsage:      modelStats,
		ConfidenceDistribution: ConfidenceStats{
			High: ConfidenceBucket{
				Range:      "0.85-1.0",
				Count:      highConfidenceCount,
				Percentage: (float64(highConfidenceCount) / float64(totalRecords)) * 100,
			},
			Medium: ConfidenceBucket{
				Range:      "0.70-0.84",
				Count:      mediumConfidenceCount,
				Percentage: (float64(mediumConfidenceCount) / float64(totalRecords)) * 100,
			},
			Low: ConfidenceBucket{
				Range:      "0.0-0.69",
				Count:      lowConfidenceCount,
				Percentage: (float64(lowConfidenceCount) / float64(totalRecords)) * 100,
			},
		},
		LabelAccuracy: AccuracyStats{
			AverageConfidence: labelConfidenceSum / float64(totalRecords),
			SuccessRate:      (float64(labelSuccessCount) / float64(totalRecords)) * 100,
		},
		OverviewAccuracy: AccuracyStats{
			AverageConfidence: overviewConfidenceSum / float64(totalRecords),
			SuccessRate:      (float64(overviewSuccessCount) / float64(totalRecords)) * 100,
		},
	}

	log.Printf("RequestID: %s - Analytics calculated: %d total, %.1f%% success rate, %.2f avg confidence", 
		requestID, summaryData.TotalVerifications, summaryData.SuccessRate, summaryData.AverageConfidence)

	return summaryData
}

// Generate export file and upload to S3
func generateExportFile(ctx context.Context, requestID string, records []VerificationRecord, format string) (ExportData, error) {
	log.Printf("RequestID: %s - Generating export file in format: %s", requestID, format)

	if format != "csv" && format != "json" && format != "pdf" {
		return ExportData{}, fmt.Errorf("unsupported export format: %s", format)
	}

	// Convert records to export format
	var exportContent string

	switch format {
	case "csv":
		exportContent = generateCSV(requestID, records)
	case "json":
		exportContent = generateJSON(requestID, records)
	case "pdf":
		return ExportData{}, fmt.Errorf("PDF export not implemented yet")
	}

	// Generate filename
	filename := fmt.Sprintf("history-export-%s.%s", time.Now().Format("20060102-150405"), format)
	
	// Mock S3 upload for this example (in production, upload to actual S3)
	downloadURL := fmt.Sprintf("https://s3.amazonaws.com/%s/exports/%s", appConfig.ExportBucket, filename)
	
	exportData := ExportData{
		DownloadURL: downloadURL,
		ExpiresAt:   time.Now().Add(24 * time.Hour),
		Format:      format,
		RecordCount: len(records),
		FileSize:    fmt.Sprintf("%.1fKB", float64(len(exportContent))/1024),
	}

	log.Printf("RequestID: %s - Export file generated: %s, size: %s", requestID, filename, exportData.FileSize)
	return exportData, nil
}

// Generate CSV export content
func generateCSV(requestID string, records []VerificationRecord) string {
	log.Printf("RequestID: %s - Generating CSV export for %d records", requestID, len(records))

	var lines []string
	lines = append(lines, "ID,Timestamp,Product ID,Category,Verification Result,Overall Confidence,Label Match,Label Confidence,Overview Match,Overview Confidence,AI Model")

	for _, record := range records {
		verificationResults, err := parseVerificationResults(requestID, record.BedrockResponse)
		if err != nil {
			continue
		}

		overallConfidence := (verificationResults.MatchLabelConfidence + verificationResults.MatchOverviewConfidence) / 2
		verificationResult := determineVerificationResult(verificationResults, overallConfidence)

		line := fmt.Sprintf("%s,%s,%s,%s,%s,%.3f,%s,%.3f,%s,%.3f,%s",
			record.ID,
			record.Timestamp,
			record.ProductID,
			record.ProductCategory,
			verificationResult,
			overallConfidence,
			verificationResults.MatchLabelToReference,
			verificationResults.MatchLabelConfidence,
			verificationResults.MatchOverviewToReference,
			verificationResults.MatchOverviewConfidence,
			record.BedrockResponse.Model,
		)
		lines = append(lines, line)
	}

	return strings.Join(lines, "\n")
}

// Generate JSON export content
func generateJSON(requestID string, records []VerificationRecord) string {
	log.Printf("RequestID: %s - Generating JSON export for %d records", requestID, len(records))

	var historyItems []HistoryItem
	for _, record := range records {
		item, err := convertToHistoryItem(requestID, record)
		if err != nil {
			continue
		}
		historyItems = append(historyItems, item)
	}

	exportData := map[string]interface{}{
		"exportedAt": time.Now(),
		"totalRecords": len(historyItems),
		"records": historyItems,
	}

	jsonBytes, _ := json.MarshalIndent(exportData, "", "  ")
	return string(jsonBytes)
}

// Parse date range from query parameters
func parseDateRange(queryParams map[string]string) (time.Time, time.Time) {
	now := time.Now()
	
	if dateRange := queryParams["dateRange"]; dateRange != "" {
		switch dateRange {
		case "today":
			return now.Truncate(24 * time.Hour), now
		case "week":
			return now.AddDate(0, 0, -7), now
		case "month":
			return now.AddDate(0, -1, 0), now
		case "quarter":
			return now.AddDate(0, -3, 0), now
		}
	}

	// Custom date range
	dateFrom := now.AddDate(0, -1, 0) // Default: 1 month ago
	dateTo := now

	if from := queryParams["dateFrom"]; from != "" {
		if parsed, err := time.Parse(time.RFC3339, from); err == nil {
			dateFrom = parsed
		}
	}

	if to := queryParams["dateTo"]; to != "" {
		if parsed, err := time.Parse(time.RFC3339, to); err == nil {
			dateTo = parsed
		}
	}

	return dateFrom, dateTo
}

// Get applied filters for metadata
func getAppliedFilters(queryParams map[string]string) map[string]interface{} {
	filters := make(map[string]interface{})
	
	if productID := queryParams["productId"]; productID != "" {
		filters["productId"] = productID
	}
	if category := queryParams["category"]; category != "" {
		filters["category"] = category
	}
	if result := queryParams["result"]; result != "" {
		filters["result"] = result
	}
	if dateFrom := queryParams["dateFrom"]; dateFrom != "" {
		filters["dateFrom"] = dateFrom
	}
	if dateTo := queryParams["dateTo"]; dateTo != "" {
		filters["dateTo"] = dateTo
	}
	
	return filters
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
	log.Println("Starting Aqua History API Lambda function")
	lambda.Start(handler)
}
