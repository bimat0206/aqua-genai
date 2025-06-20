package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	//"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	//"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Configuration structure
type Config struct {
	DatasetBucket       string
	Region              string
	PresignedURLExpiry  time.Duration
	LogLevel            string
}

// Response structures
type CatalogResponse struct {
	Type     string      `json:"type"`
	Data     interface{} `json:"data"`
	Metadata interface{} `json:"metadata"`
}

type Category struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Icon         string    `json:"icon"`
	S3Prefix     string    `json:"s3Prefix"`
	ProductCount int       `json:"productCount"`
	LastScanned  time.Time `json:"lastScanned"`
}

type Product struct {
	ID                string    `json:"id"`
	Category          string    `json:"category"`
	S3Prefix          string    `json:"s3Prefix"`
	HasLabelFolder    bool      `json:"hasLabelFolder"`
	HasOverviewFolder bool      `json:"hasOverviewFolder"`
	LabelFolders      []string  `json:"labelFolders"`
	OverviewFolders   []string  `json:"overviewFolders"`
	LastModified      time.Time `json:"lastModified"`
}

type ImageData struct {
	Key          string    `json:"key"`
	Filename     string    `json:"filename"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"lastModified"`
	PresignedURL string    `json:"presignedUrl"`
	ContentType  string    `json:"contentType"`
}

type ImagesData struct {
	LabelImages    []ImageData `json:"labelImages"`
	OverviewImages []ImageData `json:"overviewImages"`
}

type CategoriesMetadata struct {
	TotalCategories int       `json:"totalCategories"`
	ScannedAt       time.Time `json:"scannedAt"`
	Bucket          string    `json:"bucket"`
}

type ProductsMetadata struct {
	Category      string    `json:"category"`
	TotalProducts int       `json:"totalProducts"`
	ScannedAt     time.Time `json:"scannedAt"`
}

type ImagesMetadata struct {
	ProductID   string    `json:"productId"`
	Category    string    `json:"category"`
	TotalImages int       `json:"totalImages"`
	ScannedAt   time.Time `json:"scannedAt"`
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
	s3Client      *s3.Client
	presignClient *s3.PresignClient
	appConfig     *Config
)

// Category definitions matching the existing system
var categoryDefinitions = map[string]Category{
	"REF": {
		ID:          "REF",
		Name:        "Refrigerators",
		Description: "Bottom-freezer and top-mount refrigerators",
		Icon:        "❄️",
		S3Prefix:    "dataset/REF/",
	},
	"WM": {
		ID:          "WM",
		Name:        "Washing Machines",
		Description: "Front-load and top-load washing machines",
		Icon:        "🧽",
		S3Prefix:    "dataset/WM/",
	},
	"TV": {
		ID:          "TV",
		Name:        "Televisions",
		Description: "Smart LED and Android TVs",
		Icon:        "📺",
		S3Prefix:    "dataset/TV/",
	},
	"OTHER": {
		ID:          "OTHER",
		Name:        "Other Products",
		Description: "General household appliances",
		Icon:        "📦",
		S3Prefix:    "dataset/OTHER/",
	},
}

// Initialize AWS services and configuration
func init() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	
	// Load configuration from environment variables
	appConfig = &Config{
		DatasetBucket:      os.Getenv("AWS_DATASET_BUCKET"),
		Region:             os.Getenv("AWS_REGION"),
		PresignedURLExpiry: 15 * time.Minute, // Default 15 minutes
		LogLevel:           os.Getenv("LOG_LEVEL"),
	}

	if appConfig.DatasetBucket == "" {
		log.Fatal("AWS_DATASET_BUCKET environment variable is required")
	}

	if expiry := os.Getenv("PRESIGNED_URL_EXPIRY"); expiry != "" {
		if minutes, err := strconv.Atoi(expiry); err == nil {
			appConfig.PresignedURLExpiry = time.Duration(minutes) * time.Minute
		}
	}

	log.Printf("Initializing Catalog API with config: bucket=%s, region=%s, expiry=%v", 
		appConfig.DatasetBucket, appConfig.Region, appConfig.PresignedURLExpiry)

	// Initialize AWS configuration
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(appConfig.Region))
	if err != nil {
		log.Fatalf("Failed to load AWS configuration: %v", err)
	}

	// Initialize S3 clients
	s3Client = s3.NewFromConfig(cfg)
	presignClient = s3.NewPresignClient(s3Client)
	
	log.Println("AWS S3 clients initialized successfully")
}

// Main Lambda handler function
func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	requestID := request.RequestContext.RequestID
	log.Printf("Processing catalog request - RequestID: %s, Path: %s", requestID, request.Path)

	// Extract and validate query parameters
	queryParams := request.QueryStringParameters
	if queryParams == nil {
		queryParams = make(map[string]string)
	}

	operationType := queryParams["type"]
	if operationType == "" {
		log.Printf("RequestID: %s - Missing 'type' parameter", requestID)
		return createErrorResponse(400, "MISSING_TYPE", "Missing required 'type' query parameter. Valid values: categories, products, images")
	}

	log.Printf("RequestID: %s - Processing operation type: %s", requestID, operationType)

	// Route to appropriate handler based on operation type
	var response interface{}
	var err error

	switch operationType {
	case "categories":
		response, err = handleCategoriesDiscovery(ctx, requestID)
	case "products":
		response, err = handleProductsDiscovery(ctx, requestID, queryParams)
	case "images":
		response, err = handleImagesDiscovery(ctx, requestID, queryParams)
	default:
		log.Printf("RequestID: %s - Invalid operation type: %s", requestID, operationType)
		return createErrorResponse(400, "INVALID_TYPE", fmt.Sprintf("Invalid 'type' parameter: %s. Valid values: categories, products, images", operationType))
	}

	if err != nil {
		log.Printf("RequestID: %s - Operation failed: %v", requestID, err)
		return createErrorResponse(500, "OPERATION_FAILED", "Internal server error during catalog operation")
	}

	// Serialize response to JSON
	responseBody, err := json.Marshal(response)
	if err != nil {
		log.Printf("RequestID: %s - JSON serialization failed: %v", requestID, err)
		return createErrorResponse(500, "SERIALIZATION_ERROR", "Failed to serialize response")
	}

	log.Printf("RequestID: %s - Operation completed successfully", requestID)

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

// Handle categories discovery operation
func handleCategoriesDiscovery(ctx context.Context, requestID string) (*CatalogResponse, error) {
	log.Printf("RequestID: %s - Starting categories discovery", requestID)

	var categories []Category
	currentTime := time.Now()

	// Process each predefined category
	for categoryID, categoryDef := range categoryDefinitions {
		log.Printf("RequestID: %s - Processing category: %s", requestID, categoryID)

		// Count products in this category
		productCount, err := countProductsInCategory(ctx, requestID, categoryDef.S3Prefix)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to count products for category %s: %v", requestID, categoryID, err)
			productCount = 0 // Continue with 0 count rather than failing
		}

		category := categoryDef
		category.ProductCount = productCount
		category.LastScanned = currentTime
		categories = append(categories, category)

		log.Printf("RequestID: %s - Category %s processed: %d products found", requestID, categoryID, productCount)
	}

	response := &CatalogResponse{
		Type: "categories",
		Data: categories,
		Metadata: CategoriesMetadata{
			TotalCategories: len(categories),
			ScannedAt:       currentTime,
			Bucket:          appConfig.DatasetBucket,
		},
	}

	log.Printf("RequestID: %s - Categories discovery completed: %d categories found", requestID, len(categories))
	return response, nil
}

// Handle products discovery operation
func handleProductsDiscovery(ctx context.Context, requestID string, queryParams map[string]string) (*CatalogResponse, error) {
	category := queryParams["category"]
	if category == "" {
		return nil, fmt.Errorf("missing required 'category' parameter for products discovery")
	}

	log.Printf("RequestID: %s - Starting products discovery for category: %s", requestID, category)

	// Validate category
	categoryDef, exists := categoryDefinitions[category]
	if !exists {
		return nil, fmt.Errorf("invalid category: %s", category)
	}

	// Discover products using S3 prefix listing
	products, err := discoverProductsInCategory(ctx, requestID, categoryDef.S3Prefix, category)
	if err != nil {
		return nil, fmt.Errorf("failed to discover products in category %s: %w", category, err)
	}

	response := &CatalogResponse{
		Type: "products",
		Data: products,
		Metadata: ProductsMetadata{
			Category:      category,
			TotalProducts: len(products),
			ScannedAt:     time.Now(),
		},
	}

	log.Printf("RequestID: %s - Products discovery completed for category %s: %d products found", requestID, category, len(products))
	return response, nil
}

// Handle images discovery operation
func handleImagesDiscovery(ctx context.Context, requestID string, queryParams map[string]string) (*CatalogResponse, error) {
	category := queryParams["category"]
	productID := queryParams["productId"]

	if category == "" || productID == "" {
		return nil, fmt.Errorf("missing required 'category' and 'productId' parameters for images discovery")
	}

	log.Printf("RequestID: %s - Starting images discovery for product: %s/%s", requestID, category, productID)

	// Validate category
	if _, exists := categoryDefinitions[category]; !exists {
		return nil, fmt.Errorf("invalid category: %s", category)
	}

	// Discover images for the specific product
	imagesData, err := discoverProductImages(ctx, requestID, category, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to discover images for product %s/%s: %w", category, productID, err)
	}

	totalImages := len(imagesData.LabelImages) + len(imagesData.OverviewImages)

	response := &CatalogResponse{
		Type: "images",
		Data: imagesData,
		Metadata: ImagesMetadata{
			ProductID:   productID,
			Category:    category,
			TotalImages: totalImages,
			ScannedAt:   time.Now(),
		},
	}

	log.Printf("RequestID: %s - Images discovery completed for %s/%s: %d total images (%d label, %d overview)", 
		requestID, category, productID, totalImages, len(imagesData.LabelImages), len(imagesData.OverviewImages))
	return response, nil
}

// Count products in a category by listing S3 prefixes
func countProductsInCategory(ctx context.Context, requestID, categoryPrefix string) (int, error) {
	log.Printf("RequestID: %s - Counting products in prefix: %s", requestID, categoryPrefix)

	input := &s3.ListObjectsV2Input{
		Bucket:    aws.String(appConfig.DatasetBucket),
		Prefix:    aws.String(categoryPrefix),
		Delimiter: aws.String("/"),
	}

	result, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		return 0, fmt.Errorf("failed to list objects for counting: %w", err)
	}

	count := len(result.CommonPrefixes)
	log.Printf("RequestID: %s - Found %d products in category prefix %s", requestID, count, categoryPrefix)
	return count, nil
}

// Discover products in a specific category
func discoverProductsInCategory(ctx context.Context, requestID, categoryPrefix, category string) ([]Product, error) {
	log.Printf("RequestID: %s - Discovering products in category prefix: %s", requestID, categoryPrefix)

	input := &s3.ListObjectsV2Input{
		Bucket:    aws.String(appConfig.DatasetBucket),
		Prefix:    aws.String(categoryPrefix),
		Delimiter: aws.String("/"),
	}

	result, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list category objects: %w", err)
	}

	var products []Product

	for _, prefix := range result.CommonPrefixes {
		// Extract product ID from prefix path
		parts := strings.Split(strings.TrimSuffix(*prefix.Prefix, "/"), "/")
		if len(parts) < 3 {
			log.Printf("RequestID: %s - Warning: Invalid prefix structure: %s", requestID, *prefix.Prefix)
			continue
		}

		productID := parts[len(parts)-1]
		log.Printf("RequestID: %s - Processing product: %s", requestID, productID)

		// Check for required folders (label and overview)
		hasLabel, labelFolders := checkLabelFolders(ctx, requestID, *prefix.Prefix)
		hasOverview, overviewFolders := checkOverviewFolders(ctx, requestID, *prefix.Prefix)

		// Get last modified time for the product
		lastModified := getProductLastModified(ctx, requestID, *prefix.Prefix)

		product := Product{
			ID:                productID,
			Category:          category,
			S3Prefix:          *prefix.Prefix,
			HasLabelFolder:    hasLabel,
			HasOverviewFolder: hasOverview,
			LabelFolders:      labelFolders,
			OverviewFolders:   overviewFolders,
			LastModified:      lastModified,
		}

		products = append(products, product)
		log.Printf("RequestID: %s - Product %s processed: label=%t, overview=%t", requestID, productID, hasLabel, hasOverview)
	}

	return products, nil
}

// Check for label folders (TEM NL)
func checkLabelFolders(ctx context.Context, requestID, productPrefix string) (bool, []string) {
	labelPrefix := productPrefix + "TEM NL/"
	
	input := &s3.ListObjectsV2Input{
		Bucket:  aws.String(appConfig.DatasetBucket),
		Prefix:  aws.String(labelPrefix),
		MaxKeys: aws.Int32(1),
	}

	result, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		log.Printf("RequestID: %s - Warning: Failed to check label folder %s: %v", requestID, labelPrefix, err)
		return false, []string{}
	}

	hasImages := len(result.Contents) > 0
	folders := []string{}
	if hasImages {
		folders = append(folders, "TEM NL")
	}

	return hasImages, folders
}

// Check for overview folders (CHÍNH DIỆN, HÌNH WEB)
func checkOverviewFolders(ctx context.Context, requestID, productPrefix string) (bool, []string) {
	overviewFolderNames := []string{"CHÍNH DIỆN", "HÌNH WEB"}
	var foundFolders []string
	hasAnyImages := false

	for _, folderName := range overviewFolderNames {
		overviewPrefix := productPrefix + folderName + "/"
		
		input := &s3.ListObjectsV2Input{
			Bucket:  aws.String(appConfig.DatasetBucket),
			Prefix:  aws.String(overviewPrefix),
			MaxKeys: aws.Int32(1),
		}

		result, err := s3Client.ListObjectsV2(ctx, input)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to check overview folder %s: %v", requestID, overviewPrefix, err)
			continue
		}

		if len(result.Contents) > 0 {
			foundFolders = append(foundFolders, folderName)
			hasAnyImages = true
		}
	}

	return hasAnyImages, foundFolders
}

// Get the last modified time for a product by checking its most recent image
func getProductLastModified(ctx context.Context, requestID, productPrefix string) time.Time {
	input := &s3.ListObjectsV2Input{
		Bucket:  aws.String(appConfig.DatasetBucket),
		Prefix:  aws.String(productPrefix),
		MaxKeys: aws.Int32(10), // Check a few files to find the most recent
	}

	result, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		log.Printf("RequestID: %s - Warning: Failed to get last modified for product %s: %v", requestID, productPrefix, err)
		return time.Now()
	}

	var lastModified time.Time
	for _, obj := range result.Contents {
		if obj.LastModified != nil && obj.LastModified.After(lastModified) {
			lastModified = *obj.LastModified
		}
	}

	if lastModified.IsZero() {
		lastModified = time.Now()
	}

	return lastModified
}

// Discover images for a specific product
func discoverProductImages(ctx context.Context, requestID, category, productID string) (*ImagesData, error) {
	basePrefix := fmt.Sprintf("dataset/%s/%s/", category, productID)
	log.Printf("RequestID: %s - Discovering images with base prefix: %s", requestID, basePrefix)

	imagesData := &ImagesData{
		LabelImages:    []ImageData{},
		OverviewImages: []ImageData{},
	}

	// Discover label images
	labelImages, err := discoverImagesInFolder(ctx, requestID, basePrefix+"TEM NL/")
	if err != nil {
		log.Printf("RequestID: %s - Warning: Failed to discover label images: %v", requestID, err)
	} else {
		imagesData.LabelImages = labelImages
	}

	// Discover overview images from both possible folders
	overviewFolders := []string{"CHÍNH DIỆN", "HÌNH WEB"}
	for _, folder := range overviewFolders {
		folderPrefix := basePrefix + folder + "/"
		overviewImages, err := discoverImagesInFolder(ctx, requestID, folderPrefix)
		if err != nil {
			log.Printf("RequestID: %s - Warning: Failed to discover overview images in %s: %v", requestID, folder, err)
			continue
		}
		imagesData.OverviewImages = append(imagesData.OverviewImages, overviewImages...)
	}

	return imagesData, nil
}

// Discover images in a specific folder and generate presigned URLs
func discoverImagesInFolder(ctx context.Context, requestID, folderPrefix string) ([]ImageData, error) {
	log.Printf("RequestID: %s - Discovering images in folder: %s", requestID, folderPrefix)

	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(appConfig.DatasetBucket),
		Prefix: aws.String(folderPrefix),
	}

	var allImages []ImageData
	paginator := s3.NewListObjectsV2Paginator(s3Client, input)

	for paginator.HasMorePages() {
		result, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list images in folder %s: %w", folderPrefix, err)
		}

		for _, obj := range result.Contents {
			// Filter for image files only
			if !isImageFile(*obj.Key) {
				continue
			}

			// Generate presigned URL for the image
			presignedURL, err := generatePresignedURL(ctx, requestID, *obj.Key)
			if err != nil {
				log.Printf("RequestID: %s - Warning: Failed to generate presigned URL for %s: %v", requestID, *obj.Key, err)
				presignedURL = "" // Continue without presigned URL
			}

			// Extract filename from key
			parts := strings.Split(*obj.Key, "/")
			filename := parts[len(parts)-1]

			imageData := ImageData{
				Key:          *obj.Key,
				Filename:     filename,
				Size:         *obj.Size,
				LastModified: *obj.LastModified,
				PresignedURL: presignedURL,
				ContentType:  getContentType(*obj.Key),
			}

			allImages = append(allImages, imageData)
		}
	}

	log.Printf("RequestID: %s - Found %d images in folder %s", requestID, len(allImages), folderPrefix)
	return allImages, nil
}

// Generate presigned URL for S3 object
func generatePresignedURL(ctx context.Context, requestID, key string) (string, error) {
	log.Printf("RequestID: %s - Generating presigned URL for key: %s", requestID, key)

	request, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(appConfig.DatasetBucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = appConfig.PresignedURLExpiry
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return request.URL, nil
}

// Check if file is an image based on extension
func isImageFile(key string) bool {
	lowerKey := strings.ToLower(key)
	imageExtensions := []string{".jpg", ".jpeg", ".png", ".webp"}
	
	for _, ext := range imageExtensions {
		if strings.HasSuffix(lowerKey, ext) {
			return true
		}
	}
	return false
}

// Get content type based on file extension
func getContentType(key string) string {
	lowerKey := strings.ToLower(key)
	
	if strings.HasSuffix(lowerKey, ".jpg") || strings.HasSuffix(lowerKey, ".jpeg") {
		return "image/jpeg"
	} else if strings.HasSuffix(lowerKey, ".png") {
		return "image/png"
	} else if strings.HasSuffix(lowerKey, ".webp") {
		return "image/webp"
	}
	
	return "image/jpeg" // Default fallback
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
		body = []byte(fmt.Sprintf(`{"error":{"code":"%s","message":"%s"}}`, errorCode, message))
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
	log.Println("Starting Aqua Catalog API Lambda function")
	lambda.Start(handler)
}
