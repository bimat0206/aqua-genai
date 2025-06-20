#!/bin/bash

# Catalog API Test Script
# Tests all three operations: categories, products, and images discovery

set -e  # Exit on any error

# Configuration
export API_GATEWAY_ENDPOINT="https://p54uxywt9c.execute-api.ap-southeast-1.amazonaws.com/dev/catalog"
export API_KEY="5vBzBEoyZv2TgVkFFRsng92wCp4TRWtQ5qZOOPry"

# Test data
export PRODUCT_CATEGORY='REF'
export PRODUCT_ID='AQR-M466XA(GB)'

echo "==========================================="
echo "Testing Aqua Catalog API"
echo "Endpoint: $API_GATEWAY_ENDPOINT"
echo "==========================================="

# Test 1: Discover Categories
echo ""
echo "🔍 Test 1: Discovering Categories"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?type=categories" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Categories discovery test completed"

# Test 2: Discover Products in Category
echo ""
echo "🔍 Test 2: Discovering Products in Category: $PRODUCT_CATEGORY"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?type=products&category=$PRODUCT_CATEGORY" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Products discovery test completed"

# Test 3: Discover Images for Product
echo ""
echo "🔍 Test 3: Discovering Images for Product: $PRODUCT_CATEGORY/$PRODUCT_ID"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?type=images&category=$PRODUCT_CATEGORY&productId=$PRODUCT_ID" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Images discovery test completed"

echo ""
echo "==========================================="
echo "All Catalog API tests completed!"
echo "==========================================="
