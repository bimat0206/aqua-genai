# Aqua GenAI Resource

A serverless application for image validation and catalog management using AWS Bedrock, Lambda container images, and Terraform for infrastructure management.

## Overview

This project implements a serverless architecture for image validation and catalog management using AWS services. It leverages AWS Bedrock for AI inference and uses containerized Lambda functions for better dependency management and deployment flexibility.

## Architecture

The application consists of the following components:

- **API Gateway**: RESTful API endpoints for various operations
- **Lambda Functions**: Multiple containerized functions, each handling specific business logic for different API paths (e.g., validation, catalog, transactions).
- **DynamoDB**: Storage for validation results
- **S3**: Storage for input images and datasets
- **ECR**: Container registry for Lambda function images
- **Bedrock**: AI model for image validation

## API Endpoints

### 1. Image Validation
- **Endpoint**: `POST /validate`
- **Purpose**: Validate images using AI model
- **Authentication**: API Key required

### 2. Catalog Management
- **Endpoint**: `GET /catalog`
- **Query Parameters**:
  - `type=categories`: Get all categories
  - `type=products&category=REF`: Get products in category
  - `type=images&category=REF&productId=AQR-B360MA(SLB)`: Get available images
- **Response Format**:
  ```json
  {
    "type": "categories|products|images",
    "data": { ... },
    "metadata": { "category": "REF", "productId": "..." }
  }
  ```

### 3. Transaction Management
- **Endpoint**: `GET /transaction/{transactionId}`
  - Get details of a specific transaction
  - Poll until status is SUCCEEDED
  - Returns full Claude verdict and reference keys

- **Endpoint**: `GET /transactions`
  - Get transaction history with filters
  - Supports filtering by category, SKU, verdict, and date
  - Used for populating History page

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Docker installed (for local container development)
- Python 3.13 or later

## Deployment

1. **Build and Push Container Image**:
   ```bash
   # Build the container image
   docker build -t aqua-genai-lambda .

   # Tag the image
   docker tag aqua-genai-lambda:latest 879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/flask-app:latest

   # Push to ECR
   docker push 879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/flask-app:latest
   ```

2. **Deploy Infrastructure (using Terraform)**:
   Navigate to the `infra` directory.
   ```bash
   # Initialize Terraform
   terraform init

   # Plan the deployment
   terraform plan -var-file=terraform.tfvars

   # Apply the changes
   terraform apply -var-file=terraform.tfvars
   ```
   Ensure your `terraform.tfvars` file is configured with the appropriate values for your environment.

## Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Prefix | Resource naming prefix | - |
| Stage | Deployment stage (dev/test/prod) | - |
| ModelRegion | AWS Bedrock model region | - |
| ModelId | Bedrock model identifier | - |
| ModelMaxTokens | Maximum tokens for model response | - |
| ModelTemperature | Model temperature (0.0-1.0) | - |
| FunctionMemorySize | Lambda memory size (MB) | 1024 |
| FunctionTimeout | Lambda timeout (seconds) | 30 |
| MaxReferenceLabelImages | Max label images for model | 2 |
| MaxReferenceOverviewImages | Max overview images for model | 2 |
| FunctionLogLevel | Lambda logging level | INFO |
| ApiRateLimit | API rate limit (req/sec) | 10 |
| ApiBurstLimit | API burst limit | 5 |
| ApiQuotaLimit | API quota limit | 1000 |
| ApiQuotaPeriod | API quota period | MONTH |

## Security

- API Gateway requires API key for all endpoints
- S3 bucket has public access blocked
- ECR repository has image scanning enabled
- Lambda function has minimal required permissions
- All resources are encrypted at rest

## Monitoring

- CloudWatch Logs for Lambda function
- API Gateway access logs
- DynamoDB metrics
- ECR image scanning results

## Development

1. **Local Development**:
   ```bash
   # Install dependencies
   pip install -r requirements.txt

   # Run tests
   pytest

   # Build container locally
   docker build -t aqua-genai-lambda .
   ```

2. **Testing**:
   ```bash
   # Run unit tests
   pytest tests/

   # Run integration tests
   pytest tests/integration/
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Here]

## Support

For support, please contact [Your Contact Information]