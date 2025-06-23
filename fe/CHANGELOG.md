# Changelog

All notable changes to the Aqua GenAI Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1] - 2025-06-23

### Added
- **Enhanced ECS Deployment**: Robust deployment script with error handling and task definition management
- **AWS Resource Validation**: Comprehensive validation script for ECS cluster, secrets, and load balancer
- **Deployment Stability Checks**: Automatic waiting for service stabilization during deployments
- **Task Definition Versioning**: Automatic cloning and updating of task definitions with new images and secrets
- **Secrets Integration**: Proper injection of AWS Secrets Manager secrets into ECS containers
- **Platform-Specific Builds**: Docker builds with `--platform linux/amd64` for ECS compatibility
- **Deployment Documentation**: Comprehensive deployment guides and implementation summaries

### Changed
- **Deploy Script Enhancement**: Updated `deploy.sh` with reference script improvements including:
  - Robust error handling with `set -euo pipefail`
  - AWS CLI quiet mode for cleaner output
  - Proper ECR authentication and image pushing
  - Task definition management and registration
- **Task Definition Updates**: Enhanced `taskdef.json` with proper secrets configuration
- **Documentation Updates**: Updated deployment guides with new procedures and troubleshooting

### Fixed
- **ECS Service Updates**: Fixed service update process to properly register new task definitions
- **Secrets Injection**: Corrected secrets injection from AWS Secrets Manager into containers
- **Container Configuration**: Fixed environment variable and secrets mapping in task definitions

### Infrastructure
- **ECS Cluster Integration**: Full integration with `aqua-genai-service-dev-f0wt` cluster
- **Load Balancer Configuration**: Proper integration with `aqua-genai-lb-dev-f0wt` load balancer
- **ECR Repository**: Configured for `aqua-genai-react-frontend-f0wt` repository
- **Secrets Manager**: Integration with production secrets:
  - `aqua-genai-dev-secret-api-key-f0wt`
  - `aqua-genai-dev-secret-ecs-config-f0wt`

### Security
- **Task Definition Secrets**: Proper secrets configuration in ECS task definitions
- **IAM Role Integration**: Utilizes existing task and execution roles for secrets access
- **Container Security**: Maintains non-root user execution in containers

### Operations
- **Deployment Workflow**: Streamlined deployment process with validation and stability checks
- **Resource Validation**: Pre-deployment validation of AWS resources
- **Monitoring Integration**: Enhanced logging and monitoring for deployment processes

## [1.0] - 2025-06-23

### Added
- **Health Check Lambda Function**: New dedicated health check endpoint at `/health` for system monitoring
- **API Gateway URL Update**: Updated to use new API Gateway endpoint `https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev`
- **AWS Secrets Manager Integration**: Complete integration with AWS Secrets Manager for secure configuration management
- **Dual Environment Support**: Seamless operation in both cloud (ECS) and local development environments
- **Configuration Loader**: Client-side configuration management with automatic fallback mechanisms
- **AWS Secrets Client**: Server-side AWS Secrets Manager client with caching and error handling
- **Configuration API Endpoint**: `/api/config` endpoint for secure server-side configuration loading
- **Enhanced Health Check**: Comprehensive health monitoring including configuration validation
- **Environment Variable Validation**: Automatic validation of required configuration parameters
- **Configuration Caching**: Intelligent caching with TTL to optimize performance and reduce AWS API calls
- **Local Development Template**: `.env.local.example` template for easy local setup
- **Type-Safe Configuration**: Full TypeScript support with proper type definitions
- **Error Handling**: Graceful fallback mechanisms for configuration failures
- **Security Logging**: Comprehensive logging without exposing sensitive data

### Changed
- **Proxy Route Enhancement**: Updated `/api/proxy` to use dynamic configuration instead of hardcoded values
- **Package Dependencies**: Added `@aws-sdk/client-secrets-manager` for AWS integration
- **Health Check Enhancement**: Extended health check to include configuration source validation
- **Environment Variable Structure**: Standardized environment variable naming and structure

### Security
- **Secrets Management**: Sensitive configuration now stored securely in AWS Secrets Manager
- **Environment Isolation**: Clear separation between development and production configurations
- **Credential Handling**: Secure handling of API keys and sensitive configuration data
- **Cache Security**: Secure caching mechanisms with automatic expiration

### Infrastructure
- **ECS Integration**: Full integration with existing ECS deployment pipeline
- **IAM Permissions**: Proper IAM role configuration for Secrets Manager access
- **Docker Support**: Enhanced Docker configuration for containerized deployment
- **Terraform Compatibility**: Compatible with existing Terraform infrastructure setup

## Configuration Structure

### AWS Secrets Manager Secrets

#### API Key Secret (`aqua-genai-dev-secret-api-key-f0wt`)
```
"your-api-key-value"
```

#### Config Secret (`aqua-genai-dev-secret-ecs-config-f0wt`)
```json
{
  "API_ENDPOINT": "https://api-gateway-url.execute-api.ap-southeast-1.amazonaws.com",
  "S3_BUCKET_NAME": "bucket-name",
  "DYNAMODB_TABLE": "table-name",
  "REGION": "ap-southeast-1"
}
```

### Environment Variables

#### Production (ECS)
- `API_KEY_SECRET_NAME`: Name of the API key secret in AWS Secrets Manager
- `CONFIG_SECRET_NAME`: Name of the configuration secret in AWS Secrets Manager
- `AWS_REGION`: AWS region for Secrets Manager client
- `NODE_ENV`: Application environment

#### Development (Local)
- `NEXT_PUBLIC_API_ENDPOINT`: API Gateway endpoint URL
- `NEXT_PUBLIC_API_KEY`: Local development API key
- `NEXT_PUBLIC_S3_BUCKET_NAME`: S3 bucket name
- `NEXT_PUBLIC_DYNAMODB_TABLE`: DynamoDB table name
- `NEXT_PUBLIC_AWS_REGION`: AWS region

## Migration Guide

### For Existing Deployments

1. **Update Environment Variables**: Ensure ECS task definition includes the new secret name environment variables
2. **Verify IAM Permissions**: Confirm ECS task role has Secrets Manager read permissions
3. **Test Configuration**: Use health check endpoint to verify configuration loading
4. **Monitor Logs**: Check application logs for configuration loading status

### For Local Development

1. **Copy Environment Template**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Configure Local Values**: Update `.env.local` with your development configuration

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Verify Setup**: Check health endpoint at `http://localhost:9002/api/health`

## API Changes

### New Endpoints

- **GET `/api/config`**: Configuration loading endpoint
- **HEAD `/api/config`**: Configuration endpoint health check

### Enhanced Endpoints

- **GET `/api/health`**: Now includes configuration validation and source reporting
- **ALL `/api/proxy/*`**: Enhanced with dynamic configuration and better error handling

## Breaking Changes

None. This release maintains backward compatibility while adding new functionality.

## Performance Improvements

- **Configuration Caching**: 5-minute TTL cache for secrets reduces AWS API calls
- **Async Loading**: Non-blocking configuration loading with fallback support
- **Error Recovery**: Intelligent retry mechanisms for transient failures

## Security Enhancements

- **Secrets Isolation**: Production secrets no longer stored in environment variables
- **Access Control**: Proper IAM-based access control for secrets
- **Audit Trail**: AWS CloudTrail integration for secrets access logging
- **Cache Security**: Secure in-memory caching with automatic expiration

## Monitoring and Observability

- **Health Checks**: Comprehensive health monitoring for all configuration sources
- **Logging**: Detailed logging for configuration loading and error scenarios
- **Metrics**: Configuration source and loading performance metrics
- **Alerting**: Integration points for monitoring configuration failures

---

## Previous Versions

### [1.0.0] - Initial Release
- Basic Next.js application setup
- Firebase integration
- Basic UI components
- Initial Docker configuration
