# Docker & ECS Deployment Configuration

## Overview
This document outlines the changes made to enable proper deployment of the React frontend to AWS ECS.

## Changes Made

### 1. Dockerfile Updates (`fe/Dockerfile`)

#### **Removed Hardcoded API Endpoints**
- Removed build-time hardcoded API endpoints
- Environment variables now set at runtime from ECS secrets

#### **Updated Port Configuration**
- Changed from port 3000 to port 80 (ECS standard)
- Updated EXPOSE and PORT environment variables

#### **Enhanced Startup Script**
- Parses JSON configuration from ECS `CONFIG` secret
- Extracts API_ENDPOINT, S3_BUCKET_NAME, DYNAMODB_TABLE, REGION
- Maps secrets to Next.js public environment variables
- Provides detailed logging for debugging

#### **Security Improvements**
- Runs as non-root user (nextjs:nodejs)
- Proper file permissions and ownership

### 2. Next.js Configuration (`fe/next.config.ts`)

#### **Added Standalone Output**
```typescript
output: 'standalone'
```
- Enables optimized Docker deployment
- Reduces image size and improves startup time

### 3. Health Check API (`fe/src/app/api/health/route.ts`)

#### **Created Health Endpoint**
- Provides `/api/health` endpoint for ECS health checks
- Returns JSON with status, timestamp, uptime, environment info
- Handles errors gracefully

### 4. Infrastructure Updates

#### **ECS Configuration (`infra/locals.tf`)**
- Updated health check path from `/` to `/api/health`
- Confirmed port 80 configuration

#### **API Gateway Outputs (`infra/modules/api_gateway/outputs.tf`)**
- Added `api_base_url` output for base API URL
- Maintains backward compatibility with existing `api_endpoint`

#### **ECS Config Secret (`infra/main.tf`)**
- Updated to use `api_base_url` instead of `api_endpoint`
- Removes `/validate` suffix from API endpoint

## Environment Variables

### ECS Container Environment Variables
```bash
API_KEY_SECRET_NAME=aqua-genai-dev-secret-api-key-f0wt
CONFIG_SECRET_NAME=aqua-genai-dev-secret-ecs-config-f0wt
```

### ECS Container Secrets (from AWS Secrets Manager)
```bash
API_KEY=<actual-api-key-value>
CONFIG={"API_ENDPOINT":"https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev","S3_BUCKET_NAME":"aqua-genai-dataset-879654127886-ap-southeast-1-f0wt","DYNAMODB_TABLE":"aqua-genai-validate-result-f0wt","REGION":"ap-southeast-1"}
```

### Runtime Next.js Environment Variables (Set by startup script)
```bash
NEXT_PUBLIC_API_BASE_URL=https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev
NEXT_PUBLIC_API_ENDPOINT=https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev
NEXT_PUBLIC_S3_BUCKET_NAME=aqua-genai-dataset-879654127886-ap-southeast-1-f0wt
NEXT_PUBLIC_DYNAMODB_TABLE=aqua-genai-validate-result-f0wt
NEXT_PUBLIC_AWS_REGION=ap-southeast-1
NEXT_PUBLIC_API_KEY=<actual-api-key-value>
NEXT_PUBLIC_API_KEY_SECRET_NAME=aqua-genai-dev-secret-api-key-f0wt
NEXT_PUBLIC_CONFIG_SECRET_NAME=aqua-genai-dev-secret-ecs-config-f0wt
```

## Deployment Process

### 1. Build and Push Docker Image
```bash
cd fe
./deploy.sh
```

### 2. Apply Infrastructure Changes
```bash
cd infra
terraform apply
```

### 3. Verify Deployment
- Check ECS service status in AWS Console
- Test health endpoint: `https://<load-balancer-url>/api/health`
- Monitor CloudWatch logs for container startup

## Testing

### Local Docker Testing
```bash
cd fe
./test-docker.sh
```

### Health Check Testing
```bash
curl -f http://localhost:8080/api/health
```

## Key Benefits

1. **🔒 Secure Secret Management** - No hardcoded credentials
2. **🚀 Dynamic Configuration** - Runtime environment variable mapping
3. **📊 Health Monitoring** - Proper ECS health checks
4. **🐳 Optimized Docker** - Standalone Next.js build
5. **🔧 Debugging Support** - Comprehensive logging
6. **⚡ Performance** - Reduced image size and faster startup

## Troubleshooting

### Container Startup Issues
1. Check CloudWatch logs for startup script output
2. Verify ECS secrets are properly configured
3. Ensure ECR image is built and pushed

### Health Check Failures
1. Verify `/api/health` endpoint is accessible
2. Check container port mapping (80)
3. Review load balancer target group configuration

### Environment Variable Issues
1. Check ECS task definition secrets configuration
2. Verify Secrets Manager values
3. Review startup script logs for JSON parsing errors