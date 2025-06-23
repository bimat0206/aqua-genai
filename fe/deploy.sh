#!/usr/bin/env bash

# Script to build and deploy the React frontend application to AWS ECR and ECS

set -euo pipefail

###############################################################################
# Silence the AWS CLI
###############################################################################
export AWS_PAGER=""                  # no interactive pager
QUIET="--no-cli-pager"               # convenience var for brevity

###############################################################################
# User‑editable configuration
###############################################################################
AWS_REGION="ap-southeast-1"

# ECR image - Update this to your ECR repository for the Next.js app
ECR_REPO="879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/aqua-genai-react-frontend-f0wt"

# ECS - Update these to your ECS cluster and service names
ECS_CLUSTER="aqua-genai-cluster-dev-f0wt"
ECS_SERVICE="aqua-genai-service-dev-f0wt"

###############################################################################
# Derived / helper variables
###############################################################################
IMAGE_TAG=latest
IMAGE_URI="${ECR_REPO}:${IMAGE_TAG}"

echo "▶ Building & pushing ${IMAGE_URI}"

# 1. Log in, build, push (throw away noisy JSON)
aws ecr get-login-password --region "${AWS_REGION}" $QUIET \
  | docker login --username AWS --password-stdin "${ECR_REPO}"

docker build --platform linux/amd64 -t "${IMAGE_URI}" .
docker push "${IMAGE_URI}"

echo "✔ Image pushed"
    
# 2. Clone the current task definition
echo "▶ Cloning task definition"

    CURRENT_TASK_DEF_ARN=$(aws ecs describe-services $QUIET \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    if [ "$CURRENT_TASK_DEF_ARN" = "None" ] || [ -z "$CURRENT_TASK_DEF_ARN" ]; then
        echo "❌ Failed to get current task definition ARN" >&2
        exit 1
    fi
    
    echo "ℹ️  Current task definition: $CURRENT_TASK_DEF_ARN"
    
    # Clone current task definition
    aws ecs describe-task-definition $QUIET \
  --task-definition "${CURRENT_TASK_DEF_ARN}" \
        --query 'taskDefinition' \
        --output json > taskdef.json
    
# Strip read‑only fields, swap in new image
jq '
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
  | .containerDefinitions[0].image = "'"${IMAGE_URI}"'"
    ' taskdef.json > taskdef-updated.json
    
echo "▶ Registering new task definition"
    
    # Register new task definition
    NEW_TASK_DEF_ARN=$(aws ecs register-task-definition $QUIET \
        --cli-input-json file://taskdef-updated.json \
        --region "$AWS_REGION" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
echo "✔ New task‑definition ${NEW_TASK_DEF_ARN}"
    
# 3. Update the ECS service (discard JSON response)
echo "▶ Updating service to new revision"
    
    # Update service with new task definition
    echo "ℹ️  Updating ECS service with new task definition..."
    aws ecs update-service $QUIET \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${NEW_TASK_DEF_ARN}" \
        > /dev/null
    
# 4. Optionally wait for stability (this prints nothing until done)
echo "▶ Waiting for deployment to stabilise…"
    aws ecs wait services-stable $QUIET \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}"

echo "🎉 Deployment complete!  Service is running image ${IMAGE_TAG}"
