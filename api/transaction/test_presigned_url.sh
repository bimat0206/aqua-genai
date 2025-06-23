#!/bin/bash

echo "Testing Transaction API Presigned URLs..."
echo "========================================"

# Get the API response
echo "1. Fetching transaction data..."
RESPONSE=$(curl -s "https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev/transaction/fb6b18e7-40e4-41df-aba7-3a66703ed1ec" \
  -H "x-api-key: obWsYLQ1jUvQ4xPxglh2ZXHNZUrJSb20")

echo "2. Extracting presigned URL..."
PRESIGNED_URL=$(echo "$RESPONSE" | jq -r '.imageAccess.uploadedLabelImage.presignedUrl' 2>/dev/null)

if [ "$PRESIGNED_URL" = "null" ] || [ -z "$PRESIGNED_URL" ]; then
    echo "❌ Failed to extract presigned URL"
    echo "API Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo "✅ Presigned URL extracted: ${PRESIGNED_URL:0:100}..."

echo "3. Testing presigned URL access..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRESIGNED_URL")

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ SUCCESS: Presigned URL is working correctly!"
elif [ "$HTTP_STATUS" = "403" ]; then
    echo "❌ FAILED: Still getting 403 Forbidden - signature issue persists"
elif [ "$HTTP_STATUS" = "404" ]; then
    echo "❌ FAILED: 404 Not Found - object doesn't exist"
else
    echo "❌ FAILED: Unexpected HTTP status $HTTP_STATUS"
fi

echo "========================================"
echo "Test completed."
