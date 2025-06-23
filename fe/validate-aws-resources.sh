#!/usr/bin/env bash

set -euo pipefail

# Configuration
REGION="ap-southeast-1"
ECS_CLUSTER="aqua-genai-service-dev-f0wt"
API_KEY_SECRET="aqua-genai-dev-secret-api-key-f0wt"
CONFIG_SECRET="aqua-genai-dev-secret-ecs-config-f0wt"
LOAD_BALANCER="aqua-genai-lb-dev-f0wt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "Validating AWS resources for ECS deployment..."

# Check ECS Cluster
log_info "Checking ECS cluster: $ECS_CLUSTER"
if aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$REGION" --no-cli-pager > /dev/null 2>&1; then
    log_info "✅ ECS cluster exists"
    
    # List services in the cluster
    log_info "Services in cluster:"
    aws ecs list-services --cluster "$ECS_CLUSTER" --region "$REGION" --no-cli-pager --query 'serviceArns' --output table
else
    log_error "❌ ECS cluster not found"
fi

# Check Secrets Manager secrets
log_info "Checking API Key secret: $API_KEY_SECRET"
if aws secretsmanager describe-secret --secret-id "$API_KEY_SECRET" --region "$REGION" --no-cli-pager > /dev/null 2>&1; then
    log_info "✅ API Key secret exists"
else
    log_error "❌ API Key secret not found"
fi

log_info "Checking Config secret: $CONFIG_SECRET"
if aws secretsmanager describe-secret --secret-id "$CONFIG_SECRET" --region "$REGION" --no-cli-pager > /dev/null 2>&1; then
    log_info "✅ Config secret exists"
else
    log_error "❌ Config secret not found"
fi

# Check Load Balancer
log_info "Checking Load Balancer: $LOAD_BALANCER"
if aws elbv2 describe-load-balancers --names "$LOAD_BALANCER" --region "$REGION" --no-cli-pager > /dev/null 2>&1; then
    log_info "✅ Load Balancer exists"
    
    # Get Load Balancer DNS name
    LB_DNS=$(aws elbv2 describe-load-balancers --names "$LOAD_BALANCER" --region "$REGION" --no-cli-pager --query 'LoadBalancers[0].DNSName' --output text)
    log_info "Load Balancer DNS: $LB_DNS"
else
    log_error "❌ Load Balancer not found"
fi

# Check ECR repositories
log_info "Checking ECR repositories..."
aws ecr describe-repositories --region "$REGION" --no-cli-pager --query 'repositories[?contains(repositoryName, `aqua-genai`)].repositoryName' --output table

log_info "Validation complete!"
