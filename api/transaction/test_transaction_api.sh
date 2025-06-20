#!/bin/bash
# test_transaction_api.sh

# Configuration

export API_GATEWAY_ENDPOINT="https://p54uxywt9c.execute-api.ap-southeast-1.amazonaws.com/dev/transaction"
export API_KEY="5vBzBEoyZv2TgVkFFRsng92wCp4TRWtQ5qZOOPry"
# Test data from existing system
export TRANSACTION_ID="15d44dda-90d8-41ea-ae04-7c0085766d2a"

echo "==========================================="
echo "Testing Aqua Transaction API"
echo "Endpoint: $API_GATEWAY_ENDPOINT"
echo "==========================================="

# Test: Get Transaction Details
echo ""
echo "🔍 Test: Get Transaction Details"
echo "Transaction ID: $TRANSACTION_ID"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}/${TRANSACTION_ID}" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Transaction details test completed"

# Test: Invalid Transaction ID
echo ""
echo "🔍 Test: Invalid Transaction ID"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}/invalid-uuid" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Invalid transaction ID test completed"

# Test: Non-existent Transaction
echo ""
echo "🔍 Test: Non-existent Transaction"
echo "-------------------------------------------"
curl -X GET \
  "${API_GATEWAY_ENDPOINT}/12345678-1234-1234-1234-123456789012" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo "✓ Non-existent transaction test completed"

echo ""
echo "==========================================="
echo "🎉 All Transaction API tests completed!"
echo "==========================================="
