#!/bin/bash

# AWS Secrets Manager Validation Script
# This script validates that the required secrets are accessible and properly configured

set -e

echo "🔍 Validating AWS Secrets Manager Integration for Aqua GenAI Frontend"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_KEY_SECRET_NAME="aqua-genai-dev-secret-api-key-f0wt"
CONFIG_SECRET_NAME="aqua-genai-dev-secret-ecs-config-f0wt"
AWS_REGION="ap-southeast-1"

echo -e "${BLUE}Configuration:${NC}"
echo "  API Key Secret: $API_KEY_SECRET_NAME"
echo "  Config Secret: $CONFIG_SECRET_NAME"
echo "  AWS Region: $AWS_REGION"
echo ""

# Check AWS CLI availability
echo -e "${BLUE}1. Checking AWS CLI availability...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AWS CLI is available${NC}"

# Check AWS credentials
echo -e "${BLUE}2. Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured or invalid.${NC}"
    echo "Please configure AWS credentials using:"
    echo "  aws configure"
    echo "  or set environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-access-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret-key"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity)
echo -e "${GREEN}✅ AWS credentials are valid${NC}"
echo "  Account: $(echo $CALLER_IDENTITY | jq -r '.Account')"
echo "  User/Role: $(echo $CALLER_IDENTITY | jq -r '.Arn')"

# Test API Key Secret
echo -e "${BLUE}3. Testing API Key Secret access...${NC}"
if aws secretsmanager get-secret-value --secret-id "$API_KEY_SECRET_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${GREEN}✅ API Key Secret is accessible${NC}"
    
    # Get and validate the secret value
    API_KEY_VALUE=$(aws secretsmanager get-secret-value --secret-id "$API_KEY_SECRET_NAME" --region "$AWS_REGION" --query 'SecretString' --output text)
    if [ -n "$API_KEY_VALUE" ] && [ "$API_KEY_VALUE" != "null" ]; then
        echo -e "${GREEN}✅ API Key Secret has valid content${NC}"
        echo "  Length: ${#API_KEY_VALUE} characters"
    else
        echo -e "${RED}❌ API Key Secret is empty or null${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Cannot access API Key Secret${NC}"
    echo "Please check:"
    echo "  - Secret exists: $API_KEY_SECRET_NAME"
    echo "  - IAM permissions for secretsmanager:GetSecretValue"
    echo "  - AWS region: $AWS_REGION"
    exit 1
fi

# Test Config Secret
echo -e "${BLUE}4. Testing Config Secret access...${NC}"
if aws secretsmanager get-secret-value --secret-id "$CONFIG_SECRET_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${GREEN}✅ Config Secret is accessible${NC}"
    
    # Get and validate the secret value
    CONFIG_VALUE=$(aws secretsmanager get-secret-value --secret-id "$CONFIG_SECRET_NAME" --region "$AWS_REGION" --query 'SecretString' --output text)
    if [ -n "$CONFIG_VALUE" ] && [ "$CONFIG_VALUE" != "null" ]; then
        echo -e "${GREEN}✅ Config Secret has valid content${NC}"
        
        # Validate JSON structure
        if echo "$CONFIG_VALUE" | jq . &> /dev/null; then
            echo -e "${GREEN}✅ Config Secret is valid JSON${NC}"
            
            # Check required fields
            API_ENDPOINT=$(echo "$CONFIG_VALUE" | jq -r '.API_ENDPOINT // empty')
            S3_BUCKET_NAME=$(echo "$CONFIG_VALUE" | jq -r '.S3_BUCKET_NAME // empty')
            DYNAMODB_TABLE=$(echo "$CONFIG_VALUE" | jq -r '.DYNAMODB_TABLE // empty')
            REGION=$(echo "$CONFIG_VALUE" | jq -r '.REGION // empty')
            
            echo "  Configuration fields:"
            if [ -n "$API_ENDPOINT" ]; then
                echo -e "    API_ENDPOINT: ${GREEN}✅${NC} $API_ENDPOINT"
            else
                echo -e "    API_ENDPOINT: ${RED}❌ Missing${NC}"
            fi
            
            if [ -n "$S3_BUCKET_NAME" ]; then
                echo -e "    S3_BUCKET_NAME: ${GREEN}✅${NC} $S3_BUCKET_NAME"
            else
                echo -e "    S3_BUCKET_NAME: ${YELLOW}⚠️ Missing${NC}"
            fi
            
            if [ -n "$DYNAMODB_TABLE" ]; then
                echo -e "    DYNAMODB_TABLE: ${GREEN}✅${NC} $DYNAMODB_TABLE"
            else
                echo -e "    DYNAMODB_TABLE: ${YELLOW}⚠️ Missing${NC}"
            fi
            
            if [ -n "$REGION" ]; then
                echo -e "    REGION: ${GREEN}✅${NC} $REGION"
            else
                echo -e "    REGION: ${YELLOW}⚠️ Missing (will use default)${NC}"
            fi
        else
            echo -e "${RED}❌ Config Secret is not valid JSON${NC}"
            echo "Content preview: $(echo "$CONFIG_VALUE" | head -c 100)..."
            exit 1
        fi
    else
        echo -e "${RED}❌ Config Secret is empty or null${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Cannot access Config Secret${NC}"
    echo "Please check:"
    echo "  - Secret exists: $CONFIG_SECRET_NAME"
    echo "  - IAM permissions for secretsmanager:GetSecretValue"
    echo "  - AWS region: $AWS_REGION"
    exit 1
fi

# Test API endpoint connectivity (if available)
if [ -n "$API_ENDPOINT" ]; then
    echo -e "${BLUE}5. Testing API endpoint connectivity...${NC}"
    if curl -s --max-time 10 "$API_ENDPOINT/health" &> /dev/null; then
        echo -e "${GREEN}✅ API endpoint is reachable${NC}"
    else
        echo -e "${YELLOW}⚠️ API endpoint connectivity test failed${NC}"
        echo "  This might be normal if the API requires authentication"
        echo "  Endpoint: $API_ENDPOINT"
    fi
fi

echo ""
echo -e "${GREEN}🎉 AWS Secrets Manager validation completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Deploy your application to ECS with the following environment variables:"
echo "   API_KEY_SECRET_NAME=$API_KEY_SECRET_NAME"
echo "   CONFIG_SECRET_NAME=$CONFIG_SECRET_NAME"
echo "   AWS_REGION=$AWS_REGION"
echo ""
echo "2. Ensure your ECS task role has the following IAM permissions:"
echo "   - secretsmanager:GetSecretValue for both secrets"
echo "   - kms:Decrypt if secrets are encrypted with custom KMS keys"
echo ""
echo "3. Test the application health endpoint after deployment:"
echo "   curl https://your-app-url/api/health"
echo ""
echo -e "${GREEN}✅ Validation complete!${NC}"