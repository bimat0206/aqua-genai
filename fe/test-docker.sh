#!/bin/bash
set -e

echo "🐳 Testing Docker build for React frontend..."

# Build the Docker image
echo "Building Docker image..."
docker build -t aqua-genai-frontend-test .

# Test the image with sample environment variables
echo "Testing Docker image with sample environment..."
docker run --rm -d \
  --name aqua-genai-test \
  -p 8080:80 \
  -e CONFIG='{"API_ENDPOINT":"https://test-api.example.com/dev","S3_BUCKET_NAME":"test-bucket","DYNAMODB_TABLE":"test-table","REGION":"ap-southeast-1"}' \
  -e API_KEY="test-api-key" \
  -e API_KEY_SECRET_NAME="test-api-key-secret" \
  -e CONFIG_SECRET_NAME="test-config-secret" \
  aqua-genai-frontend-test

# Wait for container to start
echo "Waiting for container to start..."
sleep 5

# Test health endpoint
echo "Testing health endpoint..."
if curl -f http://localhost:8080/api/health; then
  echo "✅ Health check passed!"
else
  echo "❌ Health check failed!"
fi

# Show container logs
echo "Container logs:"
docker logs aqua-genai-test

# Cleanup
echo "Cleaning up..."
docker stop aqua-genai-test
docker rmi aqua-genai-frontend-test

echo "🎉 Docker test completed!"