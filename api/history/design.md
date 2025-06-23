# Updated API Design for GET /api/v1/history

Based on the actual DynamoDB verification record structure from the `aqua-genai-validate-result-ncwy` table, here's the updated API design that accurately reflects the stored data format.

## **Endpoint Specification**

**Base URL:** `GET /api/v1/history`

**Authentication:** API Key required via `x-api-key` header

**Content Type:** `application/json`

## **Updated Data Structure Analysis**

### **Actual DynamoDB Record Fields**
Based on the verification record, the DynamoDB table contains:
- `id` - Transaction UUID
- `timestamp` - ISO 8601 timestamp
- `productId` - Product identifier
- `productCategory` - Product category (REF, WM, TV, OTHER)
- `uploadedLabelImageKey` - S3 key for uploaded label image
- `uploadedOverviewImageKey` - S3 key for uploaded overview image
- `uploadedReferenceImageKey` - S3 key for uploaded reference image
- `bedrockResponse` - Complete AI model response with nested structure

### **BedrockResponse Structure**
The `bedrockResponse` contains:
- `model` - AI model identifier (e.g., "claude-sonnet-4-20250514")
- `usage` - Token consumption metrics
- `content` - Array containing the AI analysis results
- `content.text` - JSON string with verification results

### **Parsed Verification Results**
The AI response includes:
- `matchLabelToReference` - "yes"/"no" for label match
- `matchLabelToReference_confidence` - Confidence score (0.0-1.0)
- `label_explanation` - Detailed label analysis
- `matchOverviewToReference` - "yes"/"no" for overview match
- `matchOverviewToReference_confidence` - Confidence score (0.0-1.0)
- `overview_explanation` - Detailed overview analysis

## **Updated Query Parameter Operations**

### **1. Standard History List**

**Request:**
```
GET /api/v1/history?view=list
```

**Updated Response Structure:**
```json
{
  "view": "list",
  "data": [
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
      "labelMatch": {
        "result": "yes",
        "confidence": 0.95,
        "explanation": "The uploaded label image shows an exact match to the reference labels for Product ID AQR-M466XA(GB)..."
      },
      "overviewMatch": {
        "result": "yes",
        "confidence": 0.92,
        "explanation": "The uploaded overview image shows a four-door refrigerator that matches the reference overview images..."
      },
      "aiModel": "claude-sonnet-4-20250514",
      "tokenUsage": {
        "inputTokens": 10024,
        "outputTokens": 443
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "metadata": {
    "scannedAt": "2025-06-18T10:26:00Z",
    "appliedFilters": {}
  }
}
```

### **2. Result Calculation Logic**

**Verification Result Determination:**
```python
def determine_verification_result(bedrock_response):
    # Parse the JSON from content[0].text
    content_text = bedrock_response['content'][0]['text']
    # Remove ```
    if content_text.startswith('```json'):
        content_text = content_text.replace('``````', '')
    
    parsed_content = json.loads(content_text)
    
    label_match = parsed_content.get('matchLabelToReference') == 'yes'
    label_confidence = parsed_content.get('matchLabelToReference_confidence', 0.0)
    overview_match = parsed_content.get('matchOverviewToReference') == 'yes'
    overview_confidence = parsed_content.get('matchOverviewToReference_confidence', 0.0)
    
    overall_confidence = (label_confidence + overview_confidence) / 2
    
    if label_match and overview_match and overall_confidence >= 0.85:
        return 'CORRECT', overall_confidence
    elif overall_confidence < 0.60:
        return 'INCORRECT', overall_confidence
    else:
        return 'UNCERTAIN', overall_confidence
```

### **3. Enhanced Analytics Summary**

**Request:**
```
GET /api/v1/history?view=summary
```

**Updated Response with Token Usage Analytics:**
```json
{
  "view": "summary",
  "data": {
    "totalVerifications": 1,
    "successRate": 100.0,
    "averageConfidence": 0.935,
    "categoryBreakdown": {
      "REF": { "count": 1, "successRate": 100.0, "avgConfidence": 0.935 }
    },
    "aiModelUsage": {
      "claude-sonnet-4-20250514": {
        "verifications": 1,
        "avgInputTokens": 10024,
        "avgOutputTokens": 443,
        "totalCost": 0.0502
      }
    },
    "confidenceDistribution": {
      "high": { "range": "0.85-1.0", "count": 1, "percentage": 100.0 },
      "medium": { "range": "0.70-0.84", "count": 0, "percentage": 0.0 },
      "low": { "range": "0.0-0.69", "count": 0, "percentage": 0.0 }
    },
    "labelAccuracy": {
      "averageConfidence": 0.95,
      "successRate": 100.0
    },
    "overviewAccuracy": {
      "averageConfidence": 0.92,
      "successRate": 100.0
    }
  },
  "metadata": {
    "dateRange": {
      "from": "2025-06-18T08:01:13Z",
      "to": "2025-06-18T08:01:13Z"
    },
    "scannedAt": "2025-06-18T10:26:00Z"
  }
}
```

## **Updated Implementation Architecture**

### **DynamoDB Query Strategy**

**Primary Table Structure:**
- **Partition Key:** `id` (transaction UUID)
- **Attributes:** `timestamp`, `productId`, `productCategory`, `uploadedLabelImageKey`, `uploadedOverviewImageKey`, `uploadedReferenceImageKey`, `bedrockResponse`

**Global Secondary Indexes:**
- **CategoryTimestampIndex:** `productCategory` (PK) + `timestamp` (SK)
- **ProductTimestampIndex:** `productId` (PK) + `timestamp` (SK)

### **Response Processing Logic**

**Parse Bedrock Response:**
```python
def parse_bedrock_response(dynamo_item):
    bedrock_response = dynamo_item['bedrockResponse']
    content_text = bedrock_response['content'][0]['text']
    
    # Handle JSON wrapper
    if content_text.startswith('```
        content_text = content_text.replace('```json\n', '').replace('\n```
    
    parsed_content = json.loads(content_text)
    
    return {
        'labelMatch': {
            'result': parsed_content.get('matchLabelToReference'),
            'confidence': parsed_content.get('matchLabelToReference_confidence'),
            'explanation': parsed_content.get('label_explanation')
        },
        'overviewMatch': {
            'result': parsed_content.get('matchOverviewToReference'),
            'confidence': parsed_content.get('matchOverviewToReference_confidence'),
            'explanation': parsed_content.get('overview_explanation')
        },
        'aiModel': bedrock_response.get('model'),
        'tokenUsage': {
            'inputTokens': bedrock_response['usage']['input_tokens'],
            'outputTokens': bedrock_response['usage']['output_tokens']
        }
    }
```

## **Enhanced Query Parameters**

### **Additional Filtering Options**
- `minLabelConfidence` (float) - Filter by minimum label confidence score
- `minOverviewConfidence` (float) - Filter by minimum overview confidence score
- `aiModel` (string) - Filter by specific AI model used
- `tokenRange` (string) - Filter by token usage ranges ("low", "medium", "high")

### **Example Filtered Query**
```
GET /api/v1/history?category=REF&minLabelConfidence=0.9&minOverviewConfidence=0.85
```

## **Error Handling Updates**

### **Bedrock Response Parsing Errors**
- Handle malformed JSON in `content[0].text`
- Gracefully handle missing confidence scores
- Default to safe values when parsing fails

### **Data Migration Considerations**
- Support both old and new response formats during transition
- Provide backward compatibility for existing records
- Implement data validation for confidence score ranges

This updated API design accurately reflects the actual DynamoDB structure and provides comprehensive access to all verification data including detailed AI analysis results, token usage metrics, and confidence scores for both label and overview verifications.

[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/d771da3c-6417-4f7b-92c9-189cfb6d6842/s3_service.py
[2] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/35c37a0e-d404-43f8-98da-8e3d80a5031f/dynamodb_service.py
[3] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/173ba565-08a7-4315-bcc9-58d6c32291ba/bedrock_service.py
[4] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/17fe6dcb-bbe9-47f9-afca-d504aa6f7eae/logger_config.py
[5] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/d88dd528-a547-45e2-9af5-f31b3b43ad51/index.py
[6] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/abb9b6ed-cff5-41d9-b477-b4fdda8eb868/config.py
[7] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/68d4f011-af7c-4260-b5fd-67184ef5d459/readme.md
[8] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/0205737e-7e1f-4c00-90ac-d257a0323cd2/test.sh
[9] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/65082869/ca75d736-4b39-411d-8961-afc59900718c/aqua-genai-validate-result-ncwy.json