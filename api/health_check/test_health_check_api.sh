#!/bin/bash

# Health Check API Test Script
set -e

# Configuration
API_ENDPOINT="${1:-https://your-api-gateway-url.execute-api.ap-southeast-1.amazonaws.com/dev}"
HEALTH_ENDPOINT="${API_ENDPOINT}/health"

echo "Testing Health Check API..."
echo "Endpoint: ${HEALTH_ENDPOINT}"
echo "----------------------------------------"

# Test GET /health endpoint
echo "Testing GET /health..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "${HEALTH_ENDPOINT}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$response"

# Extract HTTP status code
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$http_code" = "200" ]; then
    echo "✅ Health check test PASSED"
    
    # Parse JSON response to check status
    json_response=$(echo "$response" | sed '/HTTP_CODE:/d')
    status=$(echo "$json_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$status" = "healthy" ]; then
        echo "✅ Health status is 'healthy'"
    else
        echo "❌ Health status is not 'healthy': $status"
    fi
else
    echo "❌ Health check test FAILED with HTTP code: $http_code"
    exit 1
fi

echo "----------------------------------------"
echo "Health Check API test completed successfully!"
