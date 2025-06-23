#!/bin/bash

# History API Test Script
# Tests all view types: list, summary, and export operations

set -e  # Exit on any error

# Configuration - Update the endpoint to point to history API
export API_GATEWAY_ENDPOINT="https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev/history"
export API_KEY="obWsYLQ1jUvQ4xPxglh2ZXHNZUrJSb4JZgTDZs20"

# Test data from the original script
export PRODUCT_ID='AQR-M466XA(GB)'
export PRODUCT_CATEGORY='REF'

echo "==========================================="
echo "Testing Aqua History API"
echo "Endpoint: $API_GATEWAY_ENDPOINT"
echo "==========================================="

# Test 1: Default List View (paginated history)
echo ""
echo "🔍 Test 1: Default History List View"
echo "-------------------------------------------"
curl -X GET \
  "$API_GATEWAY_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Default list view test completed"

# Test 2: List View with Pagination
echo ""
echo "🔍 Test 2: History List with Pagination"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&page=1&pageSize=10" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Pagination test completed"

# Test 3: List View with Product Filtering
echo ""
echo "🔍 Test 3: History List Filtered by Product"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&productId=$PRODUCT_ID" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Product filtering test completed"

# Test 4: List View with Category Filtering
echo ""
echo "🔍 Test 4: History List Filtered by Category"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&category=$PRODUCT_CATEGORY" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Category filtering test completed"

# Test 5: List View with Result Filtering
echo ""
echo "🔍 Test 5: History List Filtered by Result"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&result=CORRECT" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Result filtering test completed"

# Test 6: List View with Date Range Filtering
echo ""
echo "🔍 Test 6: History List with Date Range"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&dateFrom=2025-06-01T00:00:00Z&dateTo=2025-06-18T23:59:59Z" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Date range filtering test completed"

# Test 7: List View with Confidence Filtering
echo ""
echo "🔍 Test 7: History List with Minimum Confidence"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&minConfidence=0.85" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Confidence filtering test completed"

# Test 8: Summary Analytics View
echo ""
echo "📊 Test 8: Summary Analytics View"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=summary" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Summary analytics test completed"

# Test 9: Summary with Date Range
echo ""
echo "📊 Test 9: Summary Analytics with Date Range"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=summary&dateRange=week" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Summary with date range test completed"

# Test 10: Export View - CSV Format
echo ""
echo "📥 Test 10: Export History as CSV"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=export&format=csv" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ CSV export test completed"

# Test 11: Export View - JSON Format
echo ""
echo "📥 Test 11: Export History as JSON"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=export&format=json" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ JSON export test completed"

# Test 12: Combined Filters
echo ""
echo "🔍 Test 12: Combined Filters"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}?view=list&category=$PRODUCT_CATEGORY&result=CORRECT&minConfidence=0.8&pageSize=5" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Combined filters test completed"

echo ""
echo "==========================================="
echo "🎉 All History API tests completed!"
echo "==========================================="
