#!/usr/bin/env bash

# Script to build and deploy the React frontend application to AWS ECR and ECS

set -euo pipefail

# Configuration
PROJECT_NAME="aqua-genai"
REGION="ap-southeast-1"
ECR_REPO_NAME="aqua-genai-react-frontend-f0wt" # ECR repository name
ECS_CLUSTER="aqua-genai-service-dev-f0wt" # ECS cluster name
ECS_SERVICE="aqua-genai-react-frontend-service-dev-f0wt" # ECS service name

# AWS CLI quiet mode
export AWS_PAGER=""
QUIET="--no-cli-pager"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    log_info "All dependencies are installed."
}

validate_aws_resources() {
    log_info "Validating AWS resources..."
    
    # Get the AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    if [ -z "$ACCOUNT_ID" ]; then
        log_error "Failed to get AWS account ID."
        exit 1
    fi
    
    # Check if ECS cluster exists
    if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$REGION" $QUIET > /dev/null 2>&1; then
        log_error "ECS cluster '$ECS_CLUSTER' not found."
        exit 1
    fi
    
    # Check if ECR repository exists
    if ! aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$REGION" $QUIET > /dev/null 2>&1; then
        log_error "ECR repository '$ECR_REPO_NAME' not found."
        exit 1
    fi
    
    # Try to find the ECS service
    SERVICES=$(aws ecs list-services --cluster "$ECS_CLUSTER" --region "$REGION" $QUIET --query 'serviceArns' --output text)
    if [ -z "$SERVICES" ]; then
        log_warn "No services found in cluster '$ECS_CLUSTER'. You may need to create the service first."
    else
        log_info "Found services in cluster:"
        aws ecs list-services --cluster "$ECS_CLUSTER" --region "$REGION" $QUIET --query 'serviceArns' --output table
    fi
    
    ECR_REPO_URL="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME"
    
    log_info "AWS Account ID: $ACCOUNT_ID"
    log_info "ECR Repository URL: $ECR_REPO_URL"
    log_info "ECS Cluster: $ECS_CLUSTER"
    log_info "ECS Service: $ECS_SERVICE"
}

build_docker_image() {
    log_info "Building Docker image..."
    
    # Get the AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Build the Docker image with platform specification
    IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest"
    docker build --platform linux/amd64 -t "$IMAGE_URI" .
    
    log_info "Docker image built successfully: $IMAGE_URI"
}

push_to_ecr() {
    log_info "Pushing Docker image to ECR..."
    
    # Get the AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest"
    
    # Authenticate with ECR
    aws ecr get-login-password --region $REGION $QUIET \
        | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
    
    # Push the Docker image to ECR
    docker push "$IMAGE_URI"
    
    log_info "Docker image pushed to ECR successfully: $IMAGE_URI"
}

update_ecs_service() {
    log_info "Updating ECS service..."
    
    # Get current task definition
    log_info "Getting current task definition..."
    CURRENT_TASK_DEF_ARN=$(aws ecs describe-services $QUIET \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$REGION" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    if [ "$CURRENT_TASK_DEF_ARN" = "None" ] || [ -z "$CURRENT_TASK_DEF_ARN" ]; then
        log_error "Failed to get current task definition ARN"
        exit 1
    fi
    
    log_info "Current task definition: $CURRENT_TASK_DEF_ARN"
    
    # Clone current task definition
    aws ecs describe-task-definition $QUIET \
        --task-definition "$CURRENT_TASK_DEF_ARN" \
        --region "$REGION" \
        --query 'taskDefinition' \
        --output json > taskdef.json
    
    # Get the AWS account ID and construct image URI
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest"
    
    # Update task definition with new image only
    jq --arg image_uri "$IMAGE_URI" '
        del(
            .taskDefinitionArn,
            .revision,
            .status,
            .requiresAttributes,
            .compatibilities,
            .registeredAt,
            .registeredBy,
            .deregisteredAt
        )
        | .containerDefinitions[0].image = $image_uri
    ' taskdef.json > taskdef-updated.json
    
    log_info "Registering new task definition..."
    
    # Register new task definition
    NEW_TASK_DEF_ARN=$(aws ecs register-task-definition $QUIET \
        --cli-input-json file://taskdef-updated.json \
        --region "$REGION" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    if [ -z "$NEW_TASK_DEF_ARN" ]; then
        log_error "Failed to register new task definition"
        exit 1
    fi
    
    log_info "New task definition registered: $NEW_TASK_DEF_ARN"
    
    # Update service with new task definition
    log_info "Updating ECS service with new task definition..."
    aws ecs update-service $QUIET \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --task-definition "$NEW_TASK_DEF_ARN" \
        --region "$REGION" \
        > /dev/null
    
    log_info "ECS service updated successfully."
}

wait_for_deployment() {
    log_info "Waiting for deployment to stabilize..."
    
    # Wait for the deployment to complete
    aws ecs wait services-stable $QUIET \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$REGION"
    
    log_info "🎉 Deployment completed successfully!"
    log_info "✅ Service is running with secrets from:"
    log_info "   - aqua-genai-dev-secret-api-key-f0wt"
    log_info "   - aqua-genai-dev-secret-ecs-config-f0wt"
}

show_application_url() {
    log_info "Getting application URL..."
    
    # Try to get load balancer DNS name
    if aws elbv2 describe-load-balancers --names "aqua-genai-lb-dev-f0wt" --region "$REGION" $QUIET > /dev/null 2>&1; then
        LB_DNS=$(aws elbv2 describe-load-balancers --names "aqua-genai-lb-dev-f0wt" --region "$REGION" $QUIET --query 'LoadBalancers[0].DNSName' --output text)
        log_info "Application URL: http://$LB_DNS"
    else
        log_warn "Load balancer not found. Check ECS service configuration."
    fi
}

# Main script
check_dependencies

case "$1" in
    build)
        build_docker_image
        ;;
    push)
        validate_aws_resources
        push_to_ecr
        ;;
    deploy)
        validate_aws_resources
        update_ecs_service
        wait_for_deployment
        show_application_url
        ;;
    all)
        validate_aws_resources
        build_docker_image
        push_to_ecr
        update_ecs_service
        wait_for_deployment
        show_application_url
        ;;
    url)
        show_application_url
        ;;
    help)
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  build   - Build the Docker image"
        echo "  push    - Push the Docker image to ECR"
        echo "  deploy  - Update the ECS service"
        echo "  all     - Build, push, and deploy"
        echo "  url     - Show the application URL"
        echo "  help    - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for usage information"
        exit 1
        ;;
esac

exit 0
