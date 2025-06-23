## DynamoDB Table Structure Analysis and Fix

### Issue Found
The codebase had a mismatch with the DynamoDB table structure `aqua-genai-validate-result-f0wt`. The confidence values were returning as 0 because the code wasn't properly parsing the nested DynamoDB attribute values.

### DynamoDB Actual Structure
```json
{
  "bedrockResponse": {
    "M": {
      "content": {
        "L": [
          {
            "M": {
              "text": {
                "M": {
                  "matchLabelToReference_confidence": {
                    "N": "0.95"
                  },
                  "matchOverviewToReference_confidence": {
                    "N": "0.92"
                  },
                  // other fields...
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

### Code Changes Made

1. **Updated ContentItem struct** to use DynamoDB AttributeValue types:
```go
type ContentItem struct {
    Type string                               `json:"type" dynamodbav:"type"`
    Text map[string]types.AttributeValue `json:"text" dynamodbav:"text"`
}
```

2. **Updated parseVerificationResults function** to use DynamoDB's attributevalue.UnmarshalMap:
```go
func parseVerificationResults(requestID string, bedrockResponse BedrockResponse) (*VerificationResults, error) {
    // ... validation code ...
    
    // Use DynamoDB's attributevalue unmarshaling to properly handle the map
    results := &VerificationResults{}
    err := attributevalue.UnmarshalMap(textMap, results)
    if err != nil {
        log.Printf("RequestID: %s - Failed to unmarshal verification results: %v", requestID, err)
        return nil, fmt.Errorf("failed to unmarshal verification results: %w", err)
    }
    
    // ... logging code ...
}
```

3. **Added proper dynamodbav tags** to VerificationResults struct fields.

### Deployment Required
The code has been fixed locally and compiles successfully. However, the Lambda function needs to be redeployed with the updated code for the changes to take effect. The current Lambda is still running the old code as evidenced by the CloudWatch logs.

### Test Results (Before Deployment)
```bash
./test_transaction_api.sh
===========================================
Testing Aqua Transaction API
Endpoint: https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev/transaction
===========================================

🔍 Test: Get Transaction Details
Transaction ID: fb6b18e7-40e4-41df-aba7-3a66703ed1ec
-------------------------------------------
{
  "id": "fb6b18e7-40e4-41df-aba7-3a66703ed1ec",
  "timestamp": "2025-06-22T12:05:22.560081Z",
  "productId": "AQR-M536XA(GB)",
  "productCategory": "REF",
  "uploadedLabelImageKey": "dataset/REF/AQR-M536XA(GB)/TEM NL/f8ac9082-f6ff-4aea-a75b-50dab74e2626-image_1745631421236.jpg",
  "uploadedOverviewImageKey": "dataset/REF/AQR-M536XA(GB)/CHÍNH DIỆN/b547e0eb-3ec3-4238-bf15-14e630b0fd7a-image_1747129325772.jpg",
  "uploadedReferenceImageKey": "dataset/REF/AQR-M536XA(GB)/HÌNH WEB/M536-GB-Left_.webp,dataset/REF/AQR-M536XA(GB)/HÌNH WEB/M536-GB-Right_.webp",
  "verificationResult": "INCORRECT",
  "overallConfidence": 0,
  "labelVerification": {
    "result": "no",
    "confidence": 0,
    "explanation": ""
  },
  "overviewVerification": {
    "result": "yes",
    "confidence": 0,
    "explanation": ""
  },
  // ... rest of response ...
}
```

### Expected Results (After Deployment)
Based on the DynamoDB data, the API should return:
- `labelVerification.confidence`: 0.95
- `overviewVerification.confidence`: 0.92
- `overallConfidence`: 0.935 (average of the two)
- `verificationResult`: "CORRECT" (since both match and overall confidence >= 0.85)
- Proper explanations for both label and overview verifications