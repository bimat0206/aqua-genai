#!/bin/bash

# Script to build and deploy the React frontend application to AWS ECR and ECS

set -e

# Configuration
PROJECT_NAME="aqua-genai"
REGION="ap-southeast-1"
ECR_REPO_NAME="" # Will be determined from terraform output
ECS_CLUSTER="" # Will be determined from terraform output
ECS_SERVICE="" # Will be determined from terraform output

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

get_terraform_outputs() {
    log_info "Getting Terraform outputs..."
    
    # Change to the infra directory
    cd ../infra
    
    # Get the ECR repository URL
    ECR_REPO_URL=$(terraform output -json ecr_repository_urls | jq -r '.react_frontend')
    if [ -z "$ECR_REPO_URL" ]; then
        log_error "Failed to get ECR repository URL from Terraform output."
        exit 1
    fi
    
    # Extract the repository name from the URL
    ECR_REPO_NAME=$(echo $ECR_REPO_URL | cut -d'/' -f2)
    
    # Get the ECS cluster ARN
    ECS_CLUSTER=$(terraform output -json ecs_cluster_arn | jq -r '.')
    if [ -z "$ECS_CLUSTER" ]; then
        log_error "Failed to get ECS cluster ARN from Terraform output."
        exit 1
    fi
    
    # Get the ECS service name
    ECS_SERVICE=$(terraform output -json ecs_service_name | jq -r '.')
    if [ -z "$ECS_SERVICE" ]; then
        log_error "Failed to get ECS service name from Terraform output."
        exit 1
    fi
    
    # Get the AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    if [ -z "$ACCOUNT_ID" ]; then
        log_error "Failed to get AWS account ID."
        exit 1
    fi
    
    # Change back to the frontend directory
    cd ../fe
    
    log_info "ECR Repository URL: $ECR_REPO_URL"
    log_info "ECS Cluster: $ECS_CLUSTER"
    log_info "ECS Service: $ECS_SERVICE"
}

build_docker_image() {
    log_info "Building Docker image..."
    
    # Build the Docker image
    docker build -t $PROJECT_NAME-react-frontend .
    
    log_info "Docker image built successfully."
}

push_to_ecr() {
    log_info "Pushing Docker image to ECR..."
    
    # Get the AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Authenticate with ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
    
    # Tag the Docker image
    docker tag $PROJECT_NAME-react-frontend:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest
    
    # Push the Docker image to ECR
    docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest
    
    log_info "Docker image pushed to ECR successfully."
}

update_ecs_service() {
    log_info "Updating ECS service..."
    
    # Force a new deployment of the ECS service
    aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --force-new-deployment --region $REGION
    
    log_info "ECS service updated successfully."
}

wait_for_deployment() {
    log_info "Waiting for deployment to complete..."
    
    # Get the deployment ID
    DEPLOYMENT_ID=$(aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $REGION | jq -r '.services[0].deployments[0].id')
    
    # Wait for the deployment to complete
    aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $REGION
    
    log_info "Deployment completed successfully."
}

show_application_url() {
    log_info "Getting application URL..."
    
    # Change to the infra directory
    cd ../infra
    
    # Get the application URL
    APP_URL=$(terraform output -json react_frontend_url | jq -r '.')
    
    # Change back to the frontend directory
    cd ../fe
    
    log_info "Application URL: $APP_URL"
}

# Main script
check_dependencies

case "$1" in
    build)
        build_docker_image
        ;;
    push)
        get_terraform_outputs
        push_to_ecr
        ;;
    deploy)
        get_terraform_outputs
        update_ecs_service
        wait_for_deployment
        show_application_url
        ;;
    all)
        get_terraform_outputs
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