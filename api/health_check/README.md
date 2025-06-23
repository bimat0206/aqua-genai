# Health Check Lambda Function

This Lambda function provides a health check endpoint for the Aqua GenAI API.

## Overview

The health check endpoint returns the current status of the API service, including:
- Service status (healthy/unhealthy)
- Current timestamp
- Service version
- AWS region
- Deployment environment

## API Endpoint

- **Method**: GET
- **Path**: `/health`
- **Authentication**: None (public endpoint)
- **Response Format**: JSON

## Response Example

```json
{
  "status": "healthy",
  "timestamp": "2025-06-22T08:53:00Z",
  "version": "1.0.0",
  "service": "aqua-genai-health-check",
  "region": "ap-southeast-1",
  "environment": {
    "deployment": "dev"
  }
}
```

## Local Development

### Prerequisites

- Go 1.21+
- Docker
- AWS CLI configured

### Building

```bash
# Build the Go binary
go build -o bootstrap main.go

# Build Docker image
docker build -t health-check .
```

### Testing

```bash
# Test the API endpoint
./test_health_check_api.sh https://your-api-gateway-url.execute-api.ap-southeast-1.amazonaws.com/dev
```

## Deployment

### Using the deployment script

```bash
# Make the script executable
chmod +x deploy.sh

# Deploy to AWS
./deploy.sh
```

### Manual deployment

1. Build the Docker image:
   ```bash
   docker build -t health-check .
   ```

2. Tag and push to ECR:
   ```bash
   aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
   docker tag health-check:latest <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/aqua-genai-health-check-container:latest
   docker push <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/aqua-genai-health-check-container:latest
   ```

3. Update Lambda function with new image URI using Terraform or AWS CLI.

## Environment Variables

- `LOG_LEVEL`: Logging level (default: INFO)
- `DEPLOYMENT_ENV`: Deployment environment (dev/staging/prod)
- `AWS_REGION`: AWS region (automatically set by Lambda runtime)

## Terraform Integration

This function is integrated with the main Terraform configuration:

- Lambda function definition in `infra/locals.tf`
- API Gateway integration in `infra/modules/api_gateway/main.tf`
- ECR repository in `infra/locals.tf`
- Outputs in `infra/outputs.tf`

## Monitoring

The health check endpoint can be used for:
- Load balancer health checks
- Application monitoring
- Service discovery
- Automated testing

## Security

- No API key required (public endpoint)
- CORS enabled for web applications
- Minimal IAM permissions (basic execution role only)
