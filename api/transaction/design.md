# Updated API Design for GET /api/v1/transaction/{transactionId}

## **Overview**

The GET /api/v1/transaction/{transactionId} endpoint provides detailed access to individual verification transaction records from the Aqua Product Display GenAI system. This endpoint focuses solely on retrieving comprehensive transaction details, including parsed AI analysis results, image access URLs, and metadata.

## **Endpoint Specification**

**Base URL:** `GET /api/v1/transaction/{transactionId}`

**Authentication:** API Key required via `x-api-key` header

**Content Type:** `application/json`

## **URL Parameters**

- `{transactionId}` (string, required) - UUID of the verification transaction (e.g., "15d44dda-90d8-41ea-ae04-7c0085766d2a")

## **GET Operation - Retrieve Transaction Details**

### **Request**
```
GET /api/v1/transaction/15d44dda-90d8-41ea-ae04-7c0085766d2a
```

### **Response Structure**
Based on the actual DynamoDB record structure from the existing system:

```json
{
  "id": "15d44dda-90d8-41ea-ae04-7c0085766d2a",
  "timestamp": "2025-06-18T08:01:13.680325Z",
  "productId": "AQR-M466XA(GB)",
  "productCategory": "REF",
  "uploadedLabelImageKey": "dataset/REF/AQR-M466XA(GB)/TEM NL/22ab3ab6-ed75-4999-b3dc-1b7aaf9cb070-image_1731580040127.jpg",
  "uploadedOverviewImageKey": "dataset/REF/AQR-M466XA(GB)/CHÍNH DIỆN/20ffd946-63eb-4b55-95a8-790e358c5d00-image_1731580061456.jpg",
  "uploadedReferenceImageKey": "dataset/REF/AQR-M466XA(GB)/HÌNH WEB/reference-image-12345.jpg",
  "verificationResult": "CORRECT",
  "overallConfidence": 0.935,
  "labelVerification": {
    "result": "yes",
    "confidence": 0.95,
    "explanation": "The uploaded label image shows an exact match to the reference labels for Product ID AQR-M466XA(GB). Key matching elements include: Product model code 'AQR-M466XA', capacity of 410L, energy consumption of 503.1 kWh/năm, power rating of 94W, energy efficiency rating of 1.48, manufacturer 'HAIER OVERSEAS ELECTRIC APPLIANCES CORP. LTD'..."
  },
  "overviewVerification": {
    "result": "yes",
    "confidence": 0.92,
    "explanation": "The uploaded overview image shows a four-door refrigerator that matches the reference overview images for Product ID AQR-M466XA(GB). Key matching features include: Four-door configuration with French doors on top and two bottom freezer drawers, glossy black exterior finish, AQUA logo positioned on the upper right section..."
  },
  "imageAccess": {
    "uploadedLabelImage": {
      "key": "dataset/REF/AQR-M466XA(GB)/TEM NL/22ab3ab6-ed75-4999-b3dc-1b7aaf9cb070-image_1731580040127.jpg",
      "presignedUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
      "expiresAt": "2025-06-18T09:01:13Z"
    },
    "uploadedOverviewImage": {
      "key": "dataset/REF/AQR-M466XA(GB)/CHÍNH DIỆN/20ffd946-63eb-4b55-95a8-790e358c5d00-image_1731580061456.jpg",
      "presignedUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
      "expiresAt": "2025-06-18T09:01:13Z"
    },
    "uploadedReferenceImage": {
      "key": "dataset/REF/AQR-M466XA(GB)/HÌNH WEB/reference-image-12345.jpg",
      "presignedUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
      "expiresAt": "2025-06-18T09:01:13Z"
    }
  },
  "aiAnalysis": {
    "model": "claude-sonnet-4-20250514",
    "modelId": "msg_bdrk_01PMf7KXEDz588YoXUZffe72",
    "stopReason": "end_turn",
    "tokenUsage": {
      "inputTokens": 10024,
      "outputTokens": 443,
      "cacheCreationInputTokens": 0,
      "cacheReadInputTokens": 0
    },
    "estimatedCost": 0.0502
  },
  "rawResponse": {
    "bedrockResponse": {
      "role": "assistant",
      "type": "message",
      "id": "msg_bdrk_01PMf7KXEDz588YoXUZffe72",
      "model": "claude-sonnet-4-20250514",
      "stopReason": "end_turn",
      "usage": {
        "inputTokens": 10024,
        "outputTokens": 443,
        "cacheCreationInputTokens": 0,
        "cacheReadInputTokens": 0
      },
      "content": [
        {
          "type": "text",
          "text": {
            "matchLabelToReference": "yes",
            "matchLabelToReference_confidence": 0.95,
            "label_explanation": "...",
            "matchOverviewToReference": "yes",
            "matchOverviewToReference_confidence": 0.92,
            "overview_explanation": "..."
          }
        }
      ]
    }
  },
  "metadata": {
    "retrievedAt": "2025-06-18T10:26:00Z",
    "presignedUrlExpiry": "15 minutes",
    "apiVersion": "v1"
  }
}
```

## **Implementation Architecture**

### **DynamoDB Query Strategy**

Based on the existing DynamoDB structure from the search results:

```python
def get_transaction_by_id(transaction_id: str) -> dict:
    """
    Retrieve transaction record using the existing DynamoDB structure
    """
    response = dynamodb_client.get_item(
        TableName=Config.AWS_RESULT_TABLE,
        Key={'id': {'S': transaction_id}}
    )
    
    if 'Item' not in response:
        raise TransactionNotFoundError(f"Transaction {transaction_id} not found")
    
    return response['Item']
```

### **Response Processing Logic**

Integration with existing services from the codebase:

```python
def parse_transaction_details(dynamo_item: dict) -> dict:
    """
    Parse DynamoDB item using existing system structure
    """
    # Extract basic fields (matching existing DynamoDB structure)
    transaction = {
        'id': dynamo_item['id']['S'],
        'timestamp': dynamo_item['timestamp']['S'],
        'productId': dynamo_item['productId']['S'],
        'productCategory': dynamo_item['productCategory']['S'],
        'uploadedLabelImageKey': dynamo_item['uploadedLabelImageKey']['S'],
        'uploadedOverviewImageKey': dynamo_item['uploadedOverviewImageKey']['S']
    }
    
    # Parse nested Bedrock response (matching existing structure)
    bedrock_response = dynamo_item['bedrockResponse']['M']
    
    # Extract content text (same format as existing system)
    content_text = bedrock_response['content']['L'][0]['M']['text']['S']
    
    # Handle JSON wrapper removal (same as existing parsing)
    if content_text.startswith('```
        content_text = content_text.replace('```json\n', '').replace('\n```
    
    verification_results = json.loads(content_text)
    
    # Calculate overall confidence and result (same logic as existing system)
    overall_confidence = (
        verification_results.get('matchLabelToReference_confidence', 0) + 
        verification_results.get('matchOverviewToReference_confidence', 0)
    ) / 2
    
    verification_result = determine_verification_result(verification_results, overall_confidence)
    
    # Build comprehensive response
    transaction.update({
        'verificationResult': verification_result,
        'overallConfidence': overall_confidence,
        'labelVerification': {
            'result': verification_results.get('matchLabelToReference'),
            'confidence': verification_results.get('matchLabelToReference_confidence'),
            'explanation': verification_results.get('label_explanation')
        },
        'overviewVerification': {
            'result': verification_results.get('matchOverviewToReference'),
            'confidence': verification_results.get('matchOverviewToReference_confidence'),
            'explanation': verification_results.get('overview_explanation')
        },
        'aiAnalysis': {
            'model': bedrock_response['model']['S'],
            'modelId': bedrock_response['id']['S'],
            'stopReason': bedrock_response['stop_reason']['S'],
            'tokenUsage': {
                'inputTokens': int(bedrock_response['usage']['M']['input_tokens']['N']),
                'outputTokens': int(bedrock_response['usage']['M']['output_tokens']['N']),
                'cacheCreationInputTokens': int(bedrock_response['usage']['M']['cache_creation_input_tokens']['N']),
                'cacheReadInputTokens': int(bedrock_response['usage']['M']['cache_read_input_tokens']['N'])
            }
        }
    })
    
    return transaction
```

### **Image Access Management**

Integration with existing S3Service:

```
def generate_image_access_urls(transaction: dict, s3_service: S3Service) -> dict:
    """
    Generate presigned URLs using existing S3Service
    """
    label_key = transaction.get('uploadedLabelImageKey')
    overview_key = transaction.get('uploadedOverviewImageKey')
    
    image_access = {}
    
    if label_key:
        try:
            # Use existing S3Service method (need to add presigned URL generation)
            presigned_url = s3_service.generate_presigned_url(label_key)
            image_access['uploadedLabelImage'] = {
                'key': label_key,
                'presignedUrl': presigned_url,
                'expiresAt': (datetime.now() + timedelta(minutes=15)).isoformat()
            }
        except Exception as e:
            logger.warning(f"Failed to generate presigned URL for label image: {e}")
    
    if overview_key:
        try:
            presigned_url = s3_service.generate_presigned_url(overview_key)
            image_access['uploadedOverviewImage'] = {
                'key': overview_key,
                'presignedUrl': presigned_url,
                'expiresAt': (datetime.now() + timedelta(minutes=15)).isoformat()
            }
        except Exception as e:
            logger.warning(f"Failed to generate presigned URL for overview image: {e}")
    
    return image_access
```

## **Error Handling & HTTP Status Codes**

### **Standard Error Response Format**
```
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaction with ID '15d44dda-90d8-41ea-ae04-7c0085766d2a' was not found",
    "timestamp": "2025-06-18T08:01:13Z"
  }
}
```

### **HTTP Status Codes**
- **200 OK**: Successful transaction retrieval
- **400 Bad Request**: Invalid transaction ID format
- **404 Not Found**: Transaction not found in database
- **500 Internal Server Error**: Database access failures or system errors

### **Specific Error Scenarios**
- **Invalid UUID format**: Returns 400 with error code `INVALID_TRANSACTION_ID`
- **Transaction not found**: Returns 404 with error code `TRANSACTION_NOT_FOUND`
- **Corrupted Bedrock response**: Returns 500 with error code `DATA_PARSE_ERROR`
- **S3 access failures**: Returns 500 with error code `IMAGE_ACCESS_FAILED`

## **Integration with Existing Codebase**

### **Service Dependencies**
The transaction API will integrate with existing services:
- **DynamoDBService**: For retrieving transaction records
- **S3Service**: For generating presigned URLs (needs enhancement)
- **Config**: For environment variables and bucket names
- **Logger**: For consistent logging format

### **Required S3Service Enhancement**
Add presigned URL generation to existing S3Service:

```
# Addition to existing s3_service.py
def generate_presigned_url(self, key, expires_in=900):
    """
    Generate presigned URL for S3 object access
    """
    try:
        response = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=expires_in
        )
        logger.debug(f"Generated presigned URL for key: {key}")
        return response
    except Exception as e:
        logger.error(f"Failed to generate presigned URL for key '{key}': {e}")
        raise
```

## **Performance Optimizations**

### **Caching Strategy**
- **Transaction details**: Cache for 5 minutes for frequently accessed transactions
- **Presigned URLs**: Generate on-demand to ensure valid expiration times
- **Connection pooling**: Reuse DynamoDB and S3 client connections

### **Response Optimization**
- **Lazy loading**: Only generate presigned URLs when requested
- **Compression**: Gzip large response bodies
- **Field selection**: Optional query parameters to return specific fields only

## **Security Considerations**

### **Access Control**
- **API key validation**: Ensure valid API key for transaction access
- **Transaction isolation**: Only return transactions accessible to the requesting API key
- **Presigned URL security**: Short expiration times (15 minutes maximum)

### **Data Privacy**
- **Sensitive data**: Mask sensitive information based on access level
- **Audit logging**: Track all transaction access requests
- **Rate limiting**: Prevent abuse of transaction detail queries

