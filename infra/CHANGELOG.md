# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2025-06-22] 1.2.0 - Health Check Lambda and API Gateway Updates

### Added
- **Health Check Lambda Function**: New dedicated health check endpoint for system monitoring
  - Lightweight Go-based Lambda function (128MB memory, 10s timeout)
  - Public endpoint at `/health` (no API key required)
  - Returns JSON response with service status, timestamp, version, region, and environment info
  - CORS enabled for web application integration
  - Comprehensive deployment script with ECR integration
- **API Gateway Health Endpoint**: Added `/health` resource with GET method and OPTIONS for CORS
- **ECR Repository**: Added health_check container repository for Lambda deployment
- **Terraform Integration**: Complete infrastructure-as-code support for health check function
- **Testing Scripts**: Automated testing scripts for health check endpoint validation

### Changed
- **API Gateway URL**: Updated to use new endpoint `https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev`
- **Frontend Configuration**: Updated React app to use correct API Gateway URL
- **Environment Variables**: Updated `.env.local.example` and created `.env.local` with new API endpoint

### Enhanced
- **Monitoring**: Improved system health monitoring capabilities
- **Documentation**: Updated README files with new API Gateway information
- **Testing**: Added comprehensive test scripts for health check validation

## [2025-01-XX] 1.1.0 - Enhanced Secrets Management and ECS Integration

### Added
- **ECS Secrets Manager Integration**: Added comprehensive AWS Secrets Manager support for ECS containers
  - Environment variables `API_KEY_SECRET_NAME` and `CONFIG_SECRET` now available in ECS containers
  - Direct secret injection from AWS Secrets Manager into ECS containers using `secrets` field
  - Structured configuration secret containing API endpoints, S3 bucket names, DynamoDB tables, and AWS region
- **Enhanced Secrets Manager Module**: Completely restructured for consistency and flexibility
  - Standardized naming convention with `project_name`, `environment`, `name_suffix`, and `secret_base_name`
  - Intelligent JSON detection and handling for secret values
  - Automatic wrapping of simple strings in JSON format with `api_key` field
- **Improved ECS IAM Permissions**: Enhanced IAM roles for secure secret access
  - Task execution role permissions for secret retrieval during container startup
  - Task role permissions for runtime secret access
  - Dedicated IAM policies for Secrets Manager access

### Changed
- **BREAKING**: Updated Secrets Manager module variable structure
  - Replaced `secret_name` with structured naming approach
  - Updated all secret module calls to use new variable structure
- **ECS Container Configuration**: Enhanced container definitions to support AWS Secrets Manager
  - Added `secrets` field to container definitions
  - Updated IAM dependencies to include Secrets Manager policy attachments
- **Secret Value Format**: Improved secret value handling
  - JSON objects used as-is
  - Simple strings automatically wrapped in `{"api_key": "value"}` format

### Enhanced
- **Security**: Improved security posture with encrypted secret injection
- **Consistency**: Standardized naming conventions across all infrastructure components
- **Flexibility**: Enhanced configuration management through structured JSON secrets
- **Documentation**: Updated module changelogs with comprehensive migration guides

### Migration Notes
- Existing secret references will need to be updated to use new variable structure
- ECS containers will now receive secrets through both environment variables and AWS Secrets Manager
- IAM permissions automatically updated to support new secret access patterns

## [2025-06-18] 1.0.1 - Initial Release


### Added
- Migrated infrastructure management from CloudFormation to Terraform.
- Implemented multiple Lambda functions, each dedicated to a specific API path (`/validate`, `/catalog`, `/transaction/{id}`, `/transactions`).
- Updated API Gateway to route requests to the corresponding dedicated Lambda functions.
- Configured IAM roles and ECR repositories to support the multi-Lambda architecture.
- **API Gateway + Secrets Manager Integration**: API keys are now automatically stored in AWS Secrets Manager for secure access.
- **Enhanced Secrets Manager Access**: Lambda functions can now retrieve API keys from Secrets Manager.

### Changed
- Refactored API Gateway module to accept a map of Lambda function ARNs and names.
- Updated IAM module for Lambda to accept a map of ECR repository ARNs.
- Modified root Terraform configuration (`main.tf`, `locals.tf`) to define and manage multiple Lambda functions and their ECR repositories.
- **API Key Management**: Updated `api_key_secret` module to use API keys generated by API Gateway instead of manual variables.

### Fixed
- **Bedrock Permission Issue**: Resolved `AccessDeniedException` when Lambda functions invoke Bedrock models.
  - Expanded Bedrock IAM policy to include all Anthropic Claude models with wildcard patterns
  - Added additional Bedrock actions: `CreateModelInvocationJob`, `InvokeModelWithResponseStream`, `ListFoundationModels`, `GetFoundationModel`
  - Changed resource pattern from specific ARN to `arn:aws:bedrock:*:*:foundation-model/anthropic.claude-*`
- **Secrets Manager Integration**: Fixed API key storage and retrieval workflow.
  - Lambda IAM role now includes `secretsmanager:GetSecretValue` permission
  - API keys are automatically stored in Secrets Manager with additional metadata (API ID, stage)

## [Previous Unreleased Content]

### Added
- Initial project setup with CloudFormation template (superseded by Terraform migration)
- Basic infrastructure components:
  - API Gateway with multiple endpoints
  - Lambda function with container image support
  - DynamoDB table for validation results
  - S3 bucket for data storage
  - ECR repository for Lambda container images
- API endpoints:
  - POST /validate for image validation
  - GET /catalog for unified catalog operations
  - GET /transaction/{transactionId} for transaction details
  - GET /transactions for transaction history
- Security features:
  - API Gateway API key requirement
  - S3 bucket public access blocking
  - ECR image scanning
  - Minimal IAM permissions
- Monitoring setup:
  - CloudWatch Logs
  - API Gateway access logs
  - DynamoDB metrics
  - ECR image scanning

### Changed
- Migrated from Lambda zip deployment to container-based deployment
- Updated Lambda function to use ECR container image
- Enhanced API Gateway configuration with CORS support
- Improved IAM role permissions for Lambda function

### Removed
- Lambda Layer configuration (replaced with container image)
- Direct S3 deployment for Lambda function code

## [0.1.0] - 2024-03-XX

### Added
- Initial project structure
- Basic CloudFormation template
- Core infrastructure components
- Basic API endpoints
- Security configurations
- Monitoring setup

### Security
- Implemented API key authentication
- Configured S3 bucket security
- Set up ECR repository security
- Applied least privilege IAM policies

### Infrastructure
- Created CloudFormation template
- Set up AWS resources
- Configured networking
- Implemented logging

### Documentation
- Added comprehensive README
- Created initial CHANGELOG
- Documented API endpoints
- Added deployment instructions
