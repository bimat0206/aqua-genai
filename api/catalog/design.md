# API Design for GET /api/v1/catalog

## **Overview**

The GET /api/v1/catalog endpoint serves as a unified S3-based discovery service for the Aqua Product Display GenAI system. This endpoint enables frontend applications to dynamically discover product categories, products within categories, and available images for verification without requiring a separate metadata database[1].

## **Endpoint Specification**

**Base URL:** `GET /api/v1/catalog`

**Authentication:** API Key required via `x-api-key` header

**Content Type:** `application/json`

## **Query Parameter Operations**

### **1. Category Discovery**

**Request:**
```
GET /api/v1/catalog?type=categories
```

**Purpose:** Discover all available product categories from S3 bucket structure

**Response Structure:**
```json
{
  "type": "categories",
  "data": [
    {
      "id": "REF",
      "name": "Refrigerators",
      "description": "Bottom-freezer and top-mount refrigerators",
      "icon": "❄️",
      "s3Prefix": "dataset/REF/",
      "productCount": 23,
      "lastScanned": "2025-06-18T08:10:23Z"
    },
    {
      "id": "WM", 
      "name": "Washing Machines",
      "description": "Front-load and top-load washing machines",
      "icon": "🧽",
      "s3Prefix": "dataset/WM/",
      "productCount": 15,
      "lastScanned": "2025-06-18T08:10:23Z"
    },
    {
      "id": "TV",
      "name": "Televisions", 
      "description": "Smart LED and Android TVs",
      "icon": "📺",
      "s3Prefix": "dataset/TV/",
      "productCount": 8,
      "lastScanned": "2025-06-18T08:10:23Z"
    },
    {
      "id": "OTHER",
      "name": "Other Products",
      "description": "General household appliances",
      "icon": "📦", 
      "s3Prefix": "dataset/OTHER/",
      "productCount": 5,
      "lastScanned": "2025-06-18T08:10:23Z"
    }
  ],
  "metadata": {
    "totalCategories": 4,
    "scannedAt": "2025-06-18T08:10:23Z",
    "bucket": "aqua-dataset-bucket"
  }
}
```

### **2. Product Discovery**

**Request:**
```
GET /api/v1/catalog?type=products&category=REF
```

**Purpose:** Discover all products within a specific category

**Required Parameters:**
- `category`: One of REF, WM, TV, OTHER

**Response Structure:**
```json
{
  "type": "products", 
  "data": [
    {
      "id": "AQR-B360MA(SLB)",
      "category": "REF",
      "s3Prefix": "dataset/REF/AQR-B360MA(SLB)/",
      "hasLabelFolder": true,
      "hasOverviewFolder": true,
      "labelFolders": ["TEM NL"],
      "overviewFolders": ["CHÍNH DIỆN", "HÌNH WEB"],
      "lastModified": "2025-06-17T14:30:00Z"
    },
    {
      "id": "AQR-D270F",
      "category": "REF", 
      "s3Prefix": "dataset/REF/AQR-D270F/",
      "hasLabelFolder": true,
      "hasOverviewFolder": false,
      "labelFolders": ["TEM NL"],
      "overviewFolders": [],
      "lastModified": "2025-06-16T09:15:00Z"
    }
  ],
  "metadata": {
    "category": "REF",
    "totalProducts": 23,
    "scannedAt": "2025-06-18T08:10:23Z"
  }
}
```

### **3. Image Discovery**

**Request:**
```
GET /api/v1/catalog?type=images&category=REF&productId=AQR-B360MA(SLB)
```

**Purpose:** Discover all available images for a specific product

**Required Parameters:**
- `category`: Product category
- `productId`: Specific product identifier

**Response Structure:**
```json
{
  "type": "images",
  "data": {
    "labelImages": [
      {
        "key": "dataset/REF/AQR-B360MA(SLB)/TEM NL/image1.jpg",
        "filename": "image1.jpg", 
        "size": 245760,
        "lastModified": "2025-06-17T14:30:00Z",
        "presignedUrl": "https://s3.amazonaws.com/...",
        "contentType": "image/jpeg"
      }
    ],
    "overviewImages": [
      {
        "key": "dataset/REF/AQR-B360MA(SLB)/HÌNH WEB/overview1.jpg",
        "filename": "overview1.jpg",
        "size": 1048576, 
        "lastModified": "2025-06-17T14:30:00Z",
        "presignedUrl": "https://s3.amazonaws.com/...",
        "contentType": "image/jpeg"
      }
    ]
  },
  "metadata": {
    "productId": "AQR-B360MA(SLB)",
    "category": "REF", 
    "totalImages": 5,
    "scannedAt": "2025-06-18T08:10:23Z"
  }
}
```

## **Implementation Architecture**

### **S3 Discovery Logic**

The implementation leverages AWS S3's ListObjectsV2 API with delimiter-based prefix filtering to efficiently discover the folder hierarchy[2][3]. The discovery process follows these patterns:

**Categories Discovery:**
```python
def discover_categories(s3_client, bucket_name):
    response = s3_client.list_objects_v2(
        Bucket=bucket_name,
        Prefix="dataset/",
        Delimiter="/"
    )
    
    categories = []
    for prefix in response.get('CommonPrefixes', []):
        category_id = prefix['Prefix'].split('/')[-2]
        if category_id in ['REF', 'WM', 'TV', 'OTHER']:
            categories.append({
                'id': category_id,
                'name': get_category_name(category_id),
                'productCount': count_products_in_category(s3_client, bucket_name, prefix['Prefix'])
            })
    
    return categories
```

**Products Discovery:**
```python
def discover_products(s3_client, bucket_name, category):
    prefix = f"dataset/{category}/"
    response = s3_client.list_objects_v2(
        Bucket=bucket_name,
        Prefix=prefix,
        Delimiter="/"
    )
    
    products = []
    for prefix in response.get('CommonPrefixes', []):
        product_id = prefix['Prefix'].split('/')[-2]
        has_label = check_folder_exists(s3_client, bucket_name, f"{prefix['Prefix']}TEM NL/")
        has_overview = check_overview_folders(s3_client, bucket_name, prefix['Prefix'])
        
        products.append({
            'id': product_id,
            'hasLabelFolder': has_label,
            'hasOverviewFolder': has_overview
        })
    
    return products
```

### **Presigned URL Generation**

For secure image access, the API generates presigned URLs with configurable expiration times[1]. This approach ensures that sensitive S3 access credentials are not exposed to frontend clients while providing temporary access to image resources[4].

## **Error Handling & HTTP Status Codes**

### **Standard Error Response Format**
```json
{
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "Category 'INVALID' is not supported. Valid categories are: REF, WM, TV, OTHER",
    "timestamp": "2025-06-18T08:10:23Z"
  }
}
```

### **HTTP Status Codes**
- **200 OK**: Successful discovery operation
- **400 Bad Request**: Missing or invalid query parameters  
- **404 Not Found**: Category or product not found in S3 structure
- **500 Internal Server Error**: S3 access failures or system errors

### **Specific Error Scenarios**
- **Missing type parameter**: Returns 400 with error code `MISSING_TYPE`
- **Invalid category**: Returns 400 with error code `INVALID_CATEGORY`
- **Product not found**: Returns 404 with error code `PRODUCT_NOT_FOUND`
- **Empty S3 bucket**: Returns 404 with error code `NO_DATA_FOUND`

## **Performance Optimizations**

### **Caching Strategy**
Given the relatively static nature of product catalogs, implement multi-level caching[5]:

- **Categories**: Cache for 60 minutes (rarely change)
- **Products**: Cache for 30 minutes per category
- **Images**: Cache for 10 minutes per product
- **Presigned URLs**: Cache for 5 minutes (balance security vs performance)

### **Pagination Support**
For large product catalogs, implement pagination using S3's continuation tokens[2]:

```
GET /api/v1/catalog?type=products&category=REF&page=2&pageSize=50
```

### **Concurrent S3 Operations**
Use asynchronous S3 operations to improve response times when checking multiple folder paths simultaneously[3].

## **Security Considerations**

### **Input Validation**
- Validate `category` parameter against allowed values (REF, WM, TV, OTHER)
- Sanitize `productId` parameter to prevent path traversal attacks
- Implement rate limiting to prevent abuse

### **S3 Access Control**
- Use IAM roles with minimal S3 read-only permissions
- Implement bucket policies restricting access to dataset prefix only
- Generate presigned URLs with short expiration times (15 minutes maximum)

## **Monitoring & Logging**

### **Key Metrics**
- API response times by operation type
- S3 operation latency and error rates  
- Cache hit/miss ratios
- Failed discovery operations by error type

### **Structured Logging**
```json
{
  "timestamp": "2025-06-18T08:10:23Z",
  "operation": "discover_products",
  "category": "REF", 
  "duration_ms": 245,
  "s3_operations": 3,
  "cache_hit": false,
  "status": "success"
}
```

This design provides a robust, scalable catalog API that efficiently discovers product information from S3 bucket structure while maintaining security and performance standards[1][2][3].

[1] https://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-s3.html
[2] https://www.baeldung.com/java-aws-s3-list-bucket-objects
[3] https://fig.io/manual/aws/s3api/list-objects
[4] https://github.com/NetAppDocs/storagegrid-117/blob/main/s3/recommendations-for-implementing-s3-rest-api.adoc
[5] https://docs.netapp.com/us-en/storagegrid-115/s3/recommendations-for-implementing-s3-rest-api.html
[6] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/d771da3c-6417-4f7b-92c9-189cfb6d6842/s3_service.py
[7] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/35c37a0e-d404-43f8-98da-8e3d80a5031f/dynamodb_service.py
[8] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/173ba565-08a7-4315-bcc9-58d6c32291ba/bedrock_service.py
[9] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/17fe6dcb-bbe9-47f9-afca-d504aa6f7eae/logger_config.py
[10] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/d88dd528-a547-45e2-9af5-f31b3b43ad51/index.py
[11] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/abb9b6ed-cff5-41d9-b477-b4fdda8eb868/config.py
[12] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/68d4f011-af7c-4260-b5fd-67184ef5d459/readme.md
[13] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/0205737e-7e1f-4c00-90ac-d257a0323cd2/test.sh
[14] https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-integrating-open-source.html
[15] https://stackoverflow.com/questions/29610354/discovery-pattern-for-rest-api-endpoint
[16] https://docs.netapp.com/us-en/storagegrid-118/s3/
[17] https://www.servicenow.com/docs/bundle/yokohama-it-operations-management/page/product/service-mapping/concept/aws-s3-discovery.html
[18] https://dlthub.com/docs/pipelines/rest_api/load-data-with-python-from-rest_api-to-filesystem-aws