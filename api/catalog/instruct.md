# Comprehensive Prompt for Golang Catalog API Endpoint

## **Task: Generate Production-Ready Golang Code for GET /api/v1/catalog**

You are tasked with creating a comprehensive, production-ready Golang implementation for the unified catalog endpoint that serves the Aqua Product Display GenAI system. This endpoint must handle multiple catalog operations through query parameters while maintaining high performance and reliability.

## **System Context & Requirements**

### **Backend Integration Points**
The catalog endpoint must integrate with the existing Aqua Product Display infrastructure, which uses AWS S3 for image storage with a specific folder structure [1][2]. The system supports four product categories: REF (Refrigerators), WM (Washing Machines), TV (Televisions). The S3 dataset bucket contains reference images organized in Vietnamese folder paths including "TEM NL/" for labels and "CHÍNH DIỆN/" or "HÌNH WEB/" for overview images [1][3].

### **Unified Endpoint Specification**
```
GET /api/v1/catalog
```

**Query Parameter Operations:**
- `?type=categories` → Return all available product categories with metadata [2]
- `?type=products&category=REF` → Return products list for specified category [3]
- `?type=images&category=REF&productId=AQR-B360MA(SLB)` → Return available images for product selection [1]

### **AWS Infrastructure Requirements**
The implementation must utilize AWS SDK v2 for Go with proper IAM role integration [4][5]. S3 operations should include listing objects with prefix filtering, handling image file extensions (JPEG, PNG, WebP), and generating presigned URLs for frontend access [5][6]. DynamoDB integration may be needed for caching product metadata and improving response times [7].

## **Response Format Specifications**

### **Categories Response Structure**
```json
{
  "type": "categories",
  "data": [
    {
      "id": "REF",
      "name": "Refrigerators", 
      "description": "Bottom-freezer and top-mount refrigerators",
      "productCount": 156,
      "lastUpdated": "2025-06-18T08:10:00Z"
    }
  ],
  "metadata": {
    "totalCategories": 4,
    "timestamp": "2025-06-18T08:10:23Z"
  }
}
```

### **Products Response Structure**
```json
{
  "type": "products",
  "data": [
    {
      "id": "AQR-B360MA(SLB)",
      "name": "Bottom Freezer Refrigerator 292L",
      "category": "REF",
      "capacity": "292L",
      "hasLabelImages": true,
      "hasOverviewImages": true,
      "lastModified": "2025-06-17T14:30:00Z"
    }
  ],
  "metadata": {
    "category": "REF",
    "totalProducts": 156,
    "timestamp": "2025-06-18T08:10:23Z"
  }
}
```

### **Images Response Structure**
```json
{
  "type": "images",
  "data": {
    "labelImages": [
      {
        "key": "dataset/REF/AQR-B360MA(SLB)/TEM NL/image1.jpg",
        "presignedUrl": "https://s3.amazonaws.com/...",
        "lastModified": "2025-06-17T14:30:00Z",
        "size": 245760
      }
    ],
    "overviewImages": [
      {
        "key": "dataset/REF/AQR-B360MA(SLB)/HÌNH WEB/image1.jpg", 
        "presignedUrl": "https://s3.amazonaws.com/...",
        "lastModified": "2025-06-17T14:30:00Z",
        "size": 1048576
      }
    ]
  },
  "metadata": {
    "productId": "AQR-B360MA(SLB)",
    "category": "REF",
    "totalImages": 5,
    "timestamp": "2025-06-18T08:10:23Z"
  }
}
```

## **Implementation Requirements**

### **Core Golang Structure**
Create a handler function that follows Go HTTP best practices with proper error handling and JSON response encoding [8][9][10]. Use the standard `net/http` package with query parameter parsing and validation [11]. Implement proper struct definitions with JSON tags for response serialization [12][13].

### **AWS SDK v2 Integration**
Utilize the official AWS SDK v2 for Go to interact with S3 services [4][5]. Implement S3 client configuration with proper context handling and error management [5]. Use `ListObjectsV2` with pagination for efficient object listing [14][5]. Generate presigned URLs for secure image access with configurable expiration times [6].

### **Query Parameter Handling**
Parse and validate query parameters using `r.URL.Query()` method [11]. Implement parameter validation for `type`, `category`, and `productId` fields. Handle missing or invalid parameters with appropriate HTTP error responses [9][10].

### **Error Handling & Logging**
Implement comprehensive error handling for AWS service failures, invalid parameters, and missing resources [4]. Use structured logging with appropriate log levels for debugging and monitoring. Return meaningful HTTP status codes (400, 404, 500) with descriptive error messages [9][10].

### **Performance Optimization**
Implement connection pooling for AWS clients to reduce latency [4]. Use efficient S3 operations with appropriate prefix filtering and pagination [5]. Cache frequently accessed data like category definitions and product counts. Implement proper context handling with timeouts for AWS operations [5].

## **Code Structure Requirements**

### **Package Organization**
```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "strings"
    "time"
    
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)
```

### **Struct Definitions**
Define clear struct types for each response format with proper JSON tags [12][13]. Include metadata structs for consistent response formatting. Implement helper structs for internal data processing and S3 object information.

### **Handler Function Implementation**
Create a main handler function that routes requests based on the `type` query parameter [9][10]. Implement separate functions for each operation type (categories, products, images). Use proper HTTP response writing with JSON encoding [12].

### **AWS Service Integration**
Initialize AWS S3 client with proper configuration loading [4][5]. Implement helper functions for S3 operations like listing objects with prefixes and generating presigned URLs [5][6]. Handle AWS errors gracefully with appropriate HTTP responses.

## **Configuration & Environment**

### **Environment Variables**
- `AWS_DATASET_BUCKET` - S3 bucket containing reference images [1]
- `AWS_REGION` - AWS region for S3 operations [4]
- `PRESIGNED_URL_EXPIRY` - Expiration time for presigned URLs [6]
- `LOG_LEVEL` - Logging level for debugging [15]

### **Category Configuration**
Implement hardcoded category definitions with proper metadata:
- REF: Refrigerators with ❄️ icon
- WM: Washing Machines with 🧽 icon  
- TV: Televisions with 📺 icon
- OTHER: General products with 📦 icon

## **Testing & Quality Assurance**

### **Unit Testing Requirements**
Create comprehensive unit tests for each function with mock AWS services. Test all query parameter combinations and edge cases. Verify proper JSON response formatting and HTTP status codes [8][9].

### **Integration Testing**
Test actual AWS S3 integration with test buckets and objects [4][5]. Verify presigned URL generation and access permissions [6]. Test error scenarios like missing buckets or network failures.

### **Performance Testing**
Benchmark S3 operations with large object counts [5]. Test concurrent request handling and AWS client connection pooling [4]. Measure response times for different operation types.

## **Security Considerations**

### **Input Validation**
Validate all query parameters to prevent injection attacks [11]. Sanitize product IDs and category names before using in S3 operations [5]. Implement proper error messages without exposing internal system details [9].

### **AWS Permissions**
Configure minimal IAM permissions for S3 read-only access [4]. Use role-based authentication instead of hardcoded credentials [5]. Implement proper presigned URL expiration and access controls [6].

