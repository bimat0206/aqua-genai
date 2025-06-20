Based on the current Aqua Product Display GenAI solution architecture and the fact that product categories and products exist only as S3 folder structures without metadata databases, here's the updated API design for S3-based discovery:

## **Updated API Gateway Structure for S3-Based Discovery**

### **Core API Endpoints (4 paths)**

```
/api/v1
├── /validate                    # POST - Submit verification (existing)
├── /catalog                     # GET - S3-based catalog discovery  
├── /history                     # GET - History, search, and analytics
└── /transaction/{id}            # GET/POST - Transaction details and actions
```

## **Updated Catalog Endpoint Specification**

### **GET /api/v1/catalog**

**S3 Discovery Operations via Query Parameters:**

#### **1. Discover Categories**
```
GET /api/v1/catalog?type=categories
```
**Response:**
```json
{
  "type": "categories",
  "data": [
    {
      "id": "REF",
      "name": "Refrigerators",
      "icon": "❄️",
      "s3Prefix": "dataset/REF/",
      "productCount": 23,
      "lastScanned": "2025-06-18T08:10:23Z"
    },
    {
      "id": "WM", 
      "name": "Washing Machines",
      "icon": "🧽",
      "s3Prefix": "dataset/WM/",
      "productCount": 15,
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

#### **2. Discover Products in Category**
```
GET /api/v1/catalog?type=products&category=REF
```
**Response:**
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

#### **3. Discover Images for Product**
```
GET /api/v1/catalog?type=images&category=REF&productId=AQR-B360MA(SLB)
```
**Response:**
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
        "presignedUrl": "https://s3.amazonaws.com/..."
      }
    ],
    "overviewImages": [
      {
        "key": "dataset/REF/AQR-B360MA(SLB)/HÌNH WEB/overview1.jpg",
        "filename": "overview1.jpg",
        "size": 1048576, 
        "lastModified": "2025-06-17T14:30:00Z",
        "presignedUrl": "https://s3.amazonaws.com/..."
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

## **Backend Implementation Strategy**

### **S3 Discovery Logic**

**For Categories Discovery:**
```python
def discover_categories(s3_client, bucket_name):
    # List all prefixes under "dataset/" 
    response = s3_client.list_objects_v2(
        Bucket=bucket_name,
        Prefix="dataset/",
        Delimiter="/"
    )
    
    categories = []
    for prefix in response.get('CommonPrefixes', []):
        category_id = prefix['Prefix'].split('/')[-2]  # Extract REF, WM, etc.
        if category_id in ['REF', 'WM', 'TV', 'OTHER']:
            categories.append({
                'id': category_id,
                'name': get_category_name(category_id),
                'icon': get_category_icon(category_id),
                's3Prefix': prefix['Prefix'],
                'productCount': count_products_in_category(s3_client, bucket_name, prefix['Prefix'])
            })
    
    return categories
```

**For Products Discovery:**
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
        
        # Check for required folders
        has_label = check_folder_exists(s3_client, bucket_name, f"{prefix['Prefix']}TEM NL/")
        has_overview = (
            check_folder_exists(s3_client, bucket_name, f"{prefix['Prefix']}CHÍNH DIỆN/") or
            check_folder_exists(s3_client, bucket_name, f"{prefix['Prefix']}HÌNH WEB/")
        )
        
        products.append({
            'id': product_id,
            'category': category,
            's3Prefix': prefix['Prefix'], 
            'hasLabelFolder': has_label,
            'hasOverviewFolder': has_overview,
            'labelFolders': get_label_folders(s3_client, bucket_name, prefix['Prefix']),
            'overviewFolders': get_overview_folders(s3_client, bucket_name, prefix['Prefix'])
        })
    
    return products
```

**For Images Discovery:**
```python
def discover_images(s3_client, bucket_name, category, product_id):
    base_prefix = f"dataset/{category}/{product_id}/"
    
    # Discover label images
    label_images = []
    label_prefix = f"{base_prefix}TEM NL/"
    label_objects = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=label_prefix)
    
    for obj in label_objects.get('Contents', []):
        if obj['Key'].lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            label_images.append({
                'key': obj['Key'],
                'filename': obj['Key'].split('/')[-1],
                'size': obj['Size'],
                'lastModified': obj['LastModified'].isoformat(),
                'presignedUrl': generate_presigned_url(s3_client, bucket_name, obj['Key'])
            })
    
    # Discover overview images (check both folders)
    overview_images = []
    for folder in ['CHÍNH DIỆN', 'HÌNH WEB']:
        overview_prefix = f"{base_prefix}{folder}/"
        overview_objects = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=overview_prefix)
        
        for obj in overview_objects.get('Contents', []):
            if obj['Key'].lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                overview_images.append({
                    'key': obj['Key'],
                    'filename': obj['Key'].split('/')[-1],
                    'size': obj['Size'],
                    'lastModified': obj['LastModified'].isoformat(),
                    'presignedUrl': generate_presigned_url(s3_client, bucket_name, obj['Key'])
                })
    
    return {'labelImages': label_images, 'overviewImages': overview_images}
```

## **Updated Frontend User Flow**

### **Step 1: Category Selection**
- Frontend calls `GET /api/v1/catalog?type=categories`
- Displays available categories (REF, WM, TV, OTHER) with product counts
- User selects a category

### **Step 2: Product Selection** 
- Frontend calls `GET /api/v1/catalog?type=products&category=REF`
- Displays products available in selected category
- Shows indicators for missing label/overview folders
- User selects a product

### **Step 3: Image Selection**
- Frontend calls `GET /api/v1/catalog?type=images&category=REF&productId=AQR-B360MA(SLB)`
- Displays available images with thumbnails using presigned URLs
- User selects one label image and one overview image

### **Step 4: Verification**
- Frontend calls `POST /api/v1/validate` with selected image keys
- System processes verification as before

## **Performance Optimizations**

### **Caching Strategy**
- **Categories:** Cache for 1 hour (rarely changes)
- **Products:** Cache for 30 minutes per category  
- **Images:** Cache for 10 minutes per product
- Use Lambda memory or DynamoDB for caching

### **Batch Operations**
- Implement pagination for large product lists
- Use S3 list operations efficiently with proper prefixes
- Generate presigned URLs in batches

### **Error Handling**
- Handle empty categories/products gracefully
- Provide fallback when S3 structure is inconsistent
- Clear error messages when required folders are missing

This updated design works entirely with your existing S3 bucket structure without requiring additional metadata storage, while providing a user-friendly discovery interface for the frontend application.

[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/d771da3c-6417-4f7b-92c9-189cfb6d6842/s3_service.py
[2] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/35c37a0e-d404-43f8-98da-8e3d80a5031f/dynamodb_service.py
[3] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/173ba565-08a7-4315-bcc9-58d6c32291ba/bedrock_service.py
[4] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/17fe6dcb-bbe9-47f9-afca-d504aa6f7eae/logger_config.py
[5] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/d88dd528-a547-45e2-9af5-f31b3b43ad51/index.py
[6] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/abb9b6ed-cff5-41d9-b477-b4fdda8eb868/config.py
[7] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/68d4f011-af7c-4260-b5fd-67184ef5d459/readme.md
[8] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/0205737e-7e1f-4c00-90ac-d257a0323cd2/test.sh
[9] https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html
[10] https://www.servicenow.com/docs/bundle/yokohama-it-operations-management/page/product/service-mapping/concept/aws-s3-discovery.html
[11] https://docs.aws.amazon.com/AmazonS3/latest/API/s3-api.pdf
[12] https://stackoverflow.com/questions/29610354/discovery-pattern-for-rest-api-endpoint
[13] https://s3fs.readthedocs.io/en/latest/api.html
[14] https://cloudian.com/blog/s3-api-actions-authentication-and-code-examples/
[15] https://www.youtube.com/watch?v=kc9XqcBLstw
[16] https://hevodata.com/learn/amazon-s3-rest-api-integration/
[17] https://dev.to/hoomanbahreini/working-with-files-and-folders-in-s3-using-aws-sdk-for-net-205
[18] https://www.youtube.com/watch?v=fWgiG6A5ixI