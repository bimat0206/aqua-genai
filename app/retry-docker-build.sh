#!/bin/bash
set -e  # Exit immediately if a command fails

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ECR_REPO="879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/aqua-genai-validate-container-f0wt"
FUNCTION_NAME="aqua-genai-validate-function-f0wt"
AWS_REGION="ap-southeast-1"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo=*)
      ECR_REPO="${1#*=}"
      shift
      ;;
    --function=*)
      FUNCTION_NAME="${1#*=}"
      shift
      ;;
    --region=*)
      AWS_REGION="${1#*=}"
      shift
      ;;
    *)
      echo -e "${RED}Unknown parameter: $1${NC}"
      echo "Usage: $0 --repo=<ECR_REPO_URI> --function=<LAMBDA_FUNCTION_NAME> [--region=<AWS_REGION>]"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$ECR_REPO" ] || [ -z "$FUNCTION_NAME" ]; then
  echo -e "${RED}Error: Missing required parameters${NC}"
  echo "Usage: $0 --repo=<ECR_REPO_URI> --function=<LAMBDA_FUNCTION_NAME> [--region=<AWS_REGION>]"
  exit 1
fi

echo -e "${YELLOW}Building Aqua GenAI Lambda function...${NC}"
echo "Using ECR repository: $ECR_REPO"
echo "Function name: $FUNCTION_NAME"
echo "AWS region: $AWS_REGION"

# Verify we're in the correct directory with Python code
if [ ! -d "src" ] || [ ! -f "requirements.txt" ]; then
    echo -e "${RED}Error: Cannot find required files. Make sure you're in the correct directory${NC}"
    echo -e "${RED}Expected to find src/ directory and requirements.txt${NC}"
    exit 1
fi

echo -e "${GREEN}Correct directory structure found${NC}"
echo -e "${YELLOW}Verifying files...${NC}"
ls -la | head -10

# Log in to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$ECR_REPO"

# Create a temporary build context
echo -e "${YELLOW}Creating temporary build context...${NC}"
BUILD_CONTEXT=$(mktemp -d)
cp -r ./src "$BUILD_CONTEXT/"
cp requirements.txt "$BUILD_CONTEXT/"
cp Dockerfile "$BUILD_CONTEXT/"

# Build the image from the temporary build context
echo -e "${YELLOW}Building Docker image...${NC}"
cd "$BUILD_CONTEXT"
docker build -t "$ECR_REPO:latest" .

# Clean up the temporary build context
echo -e "${YELLOW}Cleaning up temporary build context...${NC}"
cd -
rm -rf "$BUILD_CONTEXT"

# Push the image to ECR
echo -e "${YELLOW}Pushing Docker image to ECR...${NC}"
docker push "$ECR_REPO:latest"

# Update the Lambda function
echo -e "${YELLOW}Updating Lambda function...${NC}"
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$ECR_REPO:latest" \
    --region "$AWS_REGION" > /dev/null 2>&1

echo -e "${GREEN}Lambda function updated successfully!${NC}"
echo -e "${YELLOW}Note: This Lambda function uses Python 3.9 with the handler set to index.lambda_handler${NC}"