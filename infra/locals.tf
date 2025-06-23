locals {
  name_suffix = random_string.suffix.result
  project_name = var.project_name

  # S3 bucket name
  s3_bucket_name = "${var.project_name}-dataset-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}-${local.name_suffix}"

  # DynamoDB table name
  dynamodb_table_name = "${var.project_name}-validate-result-${local.name_suffix}"

  # Lambda functions and ECR repositories
  lambda_functions = {
    validate = {
      name        = "${var.project_name}-validate-function-${local.name_suffix}"
      description = "Validates images using Bedrock model"
      memory_size = 1024
      timeout     = 30
      environment = {
        LOG_LEVEL                       = var.function_log_level
        AWS_DATASET_BUCKET              = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_IMPUT_IMG_VALIDATION_BUCKET = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_RESULT_TABLE                = module.dynamodb_table.table_name
        AWS_MODEL_REGION                = var.model_region
        AWS_MODEL_ID                    = var.model_id
        AWS_MODEL_MAX_TOKENS            = var.model_max_tokens
        AWS_MODEL_TEMPERATURE           = var.model_temperature
        MAX_REFERENCE_LABEL_IMAGES      = var.max_reference_label_images
        MAX_REFERENCE_OVERVIEW_IMAGES   = var.max_reference_overview_images
      }
    }
    catalog = {
      name        = "${var.project_name}-catalog-function-${local.name_suffix}"
      description = "Handles catalog-related requests"
      memory_size = 512
      timeout     = 30
      environment = {
        LOG_LEVEL        = var.function_log_level
        AWS_DATASET_BUCKET              = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_IMPUT_IMG_VALIDATION_BUCKET = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_RESULT_TABLE = module.dynamodb_table.table_name # Example, adjust as needed
      }
    }
    transaction_by_id = {
      name        = "${var.project_name}-transaction-by-id-function-${local.name_suffix}"
      description = "Handles fetching a single transaction by ID"
      memory_size = 512
      timeout     = 30
      environment = {
        LOG_LEVEL        = var.function_log_level
        AWS_RESULT_TABLE = module.dynamodb_table.table_name
        AWS_DATASET_BUCKET              = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_IMPUT_IMG_VALIDATION_BUCKET = "aqua-genai-dataset-879654127886-ap-southeast-1"
      }
    }
    history = {
      name        = "${var.project_name}-history-function-${local.name_suffix}"
      description = "Handles history and search requests"
      memory_size = 1024
      timeout     = 30
      environment = {
        LOG_LEVEL        = var.function_log_level
        AWS_RESULT_TABLE = module.dynamodb_table.table_name
        AWS_DATASET_BUCKET              = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_IMPUT_IMG_VALIDATION_BUCKET = "aqua-genai-dataset-879654127886-ap-southeast-1"
        EXPORT_BUCKET    = local.s3_bucket_name
      }
    }
        health_check = {
      name        = "${var.project_name}-health-check-function-${local.name_suffix}"
      description = "API health check endpoint"
      memory_size = 128
      timeout     = 10
      environment = {
        LOG_LEVEL      = var.function_log_level
        AWS_DATASET_BUCKET              = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_IMPUT_IMG_VALIDATION_BUCKET = "aqua-genai-dataset-879654127886-ap-southeast-1"
        AWS_RESULT_TABLE = module.dynamodb_table.table_name
      }
    }
  }

  # ECR repositories
  ecr_repositories = {
    validate = {
      name = "${var.project_name}-validate-container-${local.name_suffix}"
    }
    catalog = {
      name = "${var.project_name}-catalog-container-${local.name_suffix}"
    }
    transaction_by_id = {
      name = "${var.project_name}-transaction-by-id-container-${local.name_suffix}"
    }
    history = {
      name = "${var.project_name}-history-container-${local.name_suffix}"
    }
        health_check = {
      name = "${var.project_name}-health-check-container-${local.name_suffix}"
    }
    react_frontend = {
      name = "${var.project_name}-react-frontend-${local.name_suffix}"
    }
  }

  # API Gateway name
  api_gateway_name = "${var.project_name}-api-${local.name_suffix}"
  
  # ECS configuration
  ecs_config = {
    name = "${var.project_name}-react-frontend"
    container_name = "react-frontend"
    container_port = 3000
    desired_count = 1
    cpu = 256
    memory = 512
    health_check_path = "/api/health"
  }

  # Common tags
  common_tags = merge(
    var.common_tags,
    tomap({
      Project     = var.project_name
      Environment = var.environment
    })
  )
}

# Random string for unique resource names
resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}