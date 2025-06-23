# ECS Deployment Guide for React App

## Important: Port Configuration
The React app runs on port 3000 (not port 80) to avoid permission issues when running as a non-root user in the container.

This guide explains how the React app has been configured for dual environment support (local and cloud/ECS).

## Configuration Overview

### 1. Dual Environment Support

The app now supports two environments:
- **Local Development**: Uses `.env.local` file with `NEXT_PUBLIC_*` environment variables
- **ECS Deployment**: Uses AWS Secrets Manager for secure credential management

### 2. Configuration Files Created

#### `/src/lib/config.ts`
- Client-side configuration manager that automatically detects the environment
- In ECS: Reads from Secrets Manager using `API_KEY_SECRET_NAME` and `CONFIG_SECRET_NAME`
- Locally: Falls back to `NEXT_PUBLIC_*` environment variables

#### `/src/lib/server-config.ts`
- Server-side configuration for Next.js API routes
- Uses the same detection logic as client-side config

### 3. Updated Files

#### `/src/lib/api-client.ts`
- Modified to use the new configuration manager
- All API calls now use async functions to retrieve config values

#### `Dockerfile`
- Enhanced startup script to handle ECS secrets
- Extracts JSON values from Secrets Manager and exports them as environment variables
- Supports both direct secret injection and secret name references

#### `taskdef.json`
- Added `secrets` section to inject Secrets Manager values
- Maintains `environment` section for secret name references

## AWS Secrets Manager Structure

### API Key Secret (`aqua-genai-dev-secret-api-key-f0wt`)
```json
{
  "api_key": "obWsYLQ1jUvQ4xPxglh2ZXHNZUrJSb4JZgTDZs20"
}
```

### Config Secret (`aqua-genai-dev-secret-ecs-config-f0wt`)
```json
{
  "API_ENDPOINT": "https://a0sm23hz65.execute-api.ap-southeast-1.amazonaws.com/dev",
  "DYNAMODB_TABLE": "aqua-genai-validate-result-f0wt",
  "REGION": "ap-southeast-1",
  "S3_BUCKET_NAME": "aqua-genai-dataset-879654127886-ap-southeast-1-f0wt"
}
```

## Deployment Steps

### Using the Deploy Script (Recommended)

The `deploy.sh` script has been updated with robust error handling and automatic task definition management:

1. **Validate AWS Resources**:
   ```bash
   ./validate-aws-resources.sh
   ```

2. **Build, Push, and Deploy**:
   ```bash
   ./deploy.sh all
   ```

3. **Individual Commands**:
   ```bash
   # Build Docker image only
   ./deploy.sh build
   
   # Push to ECR only
   ./deploy.sh push
   
   # Deploy to ECS only
   ./deploy.sh deploy
   
   # Show application URL
   ./deploy.sh url
   ```

### Manual Deployment (Advanced)

1. **Build Docker Image**:
   ```bash
   docker build --platform linux/amd64 -t 879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/aqua-genai-react-frontend-f0wt:latest .
   ```

2. **Push to ECR**:
   ```bash
   aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 879654127886.dkr.ecr.ap-southeast-1.amazonaws.com
   docker push 879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/aqua-genai-react-frontend-f0wt:latest
   ```

3. **Update ECS Service**:
   ```bash
   aws ecs update-service --cluster aqua-genai-service-dev-f0wt --service aqua-genai-react-frontend-service-dev-f0wt --force-new-deployment --region ap-southeast-1
   ```

### Key Improvements in Deploy Script

- **Error Handling**: Uses `set -euo pipefail` for robust error handling
- **Task Definition Management**: Automatically clones current task definition and updates with new image and secrets
- **Secrets Integration**: Properly injects AWS Secrets Manager secrets into container
- **Deployment Stability**: Waits for service to stabilize before completing
- **Resource Validation**: Checks AWS resources exist before deployment

## Local Development

For local development, create a `.env.local` file based on `.env.local.example`:
```bash
cp .env.local.example .env.local
```

Then fill in the appropriate values for your local environment.

## Security Notes

- Never commit `.env.local` files to version control
- API keys and sensitive configuration are stored in AWS Secrets Manager
- The app automatically detects the environment and uses the appropriate configuration source
- Server-side rendering and API routes use server-side config for enhanced security
