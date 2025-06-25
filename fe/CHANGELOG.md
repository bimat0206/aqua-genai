# Changelog

All notable changes to the Aqua GenAI Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2025-06-25

### Added
- **Reference Image Comparison**: Enhanced Overview Image Analysis with reference image preview for easy comparison
  - Added reference image display alongside overview image in Step 5 verification results
  - Integrated with transaction API endpoint (`/dev/transaction/{transactionId}`) to fetch reference images
  - Enhanced expanded modal to show reference image in a 3-column layout (Overview Image | Reference Image | Analysis)
  - Added proper image labeling and responsive grid layout for better user experience
  - Automatic fetching of reference image after verification completion using transaction details API
  - Reference image state management with proper cleanup on new verification start

### Changed
- **Overview Image Analysis Card Layout**: Updated to display both uploaded overview and reference images side-by-side
  - Grid layout adapts responsively: single column on mobile, two columns on desktop
  - Added descriptive headers ("Overview Image" and "Reference Image") for better clarity
  - Enhanced image containers with consistent border styling and proper aspect ratios
  - Maintained existing functionality while improving visual comparison capabilities

## [1.2.2] - 2025-06-25

### Fixed
- **Transaction Details Modal Scrolling**: Fixed scrolling issue on Full HD screens
  - Added overflow handling to the main content area with `overflow-y-auto`
  - Added `max-h-[95vh]` constraint to ensure modal respects viewport limits
  - Content now properly scrolls when exceeding viewport height while keeping header visible
  - Resolves issue where bottom content was cut off and inaccessible on Full HD displays

## [1.2.1] - 2025-06-24

### Changed
- **System Health Check Integration**: Updated health check page to use real API endpoint
  - Replaced mock health status simulation with actual `/health` API calls
  - Integrated with dynamic API endpoint configuration from environment variables
  - Added proper API key authentication for health check requests
  - Enhanced status mapping to support multiple health states: "healthy" → "Operational", "unhealthy" → "Offline", "degraded" → "Degraded"
  - Added fallback logic for basic health responses that don't include service-specific statuses
  - Updated service status mapping to handle both detailed and basic API response formats
  - Services now reflect actual system health instead of random simulation

## [1.2.0] - 2025-06-23

### Fixed
- **Copy Button Functionality**: Fixed clipboard copy functionality across all pages
  - Added fallback method using `document.execCommand` for non-secure contexts and older browsers
  - Enhanced error handling for clipboard API failures
  - Fixed copy buttons in new verification page, history page, and details modal
  - Maintains visual feedback (check icon) on successful copy

- **Deploy Script Errors**: Fixed undefined functions and variables in deployment script
  - Replaced undefined `log_info` and `log_error` functions with echo statements
  - Fixed undefined `$REGION` variable to use `$AWS_REGION`
  - Enhanced error output formatting with emoji indicators

### Changed
- **Step 5 Verification Result UI**: Major UI improvements and API integration updates
  - Status badges now show actual API-returned status (Correct/Incorrect/Uncertain) instead of calculating from confidence scores
  - Confidence scores displayed to the left of status badges in muted text
  - Added separate status tracking for label and overview verifications
  - Enhanced `ExtendedVerificationResult` interface with `labelMatchStatus` and `overviewMatchStatus` fields
  - Updated status badge sizing to match consistent design (increased from `text-xs px-2 py-1` to `text-sm px-3 py-1.5`)
  - Added border styling to status badges for better visual hierarchy
  - Renamed section headers for clarity: "Label Analysis" → "Label Image Analysis", "Overview Analysis" → "Overview Image Analysis"
  - Removed overall status badge from Step 5 header for cleaner design
  - Enhanced expanded modal UI with consistent badge styling and repositioned elements

- **Expanded Modal Improvements**: Updated the expanded view for Label and Overview Image Analysis
  - Moved status badge and confidence score from modal header to Analysis section header
  - Positioned badge and confidence score on the right side next to copy button
  - Maintained consistent styling with main Step 5 cards
  - Updated modal to use actual API status instead of calculated values

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
