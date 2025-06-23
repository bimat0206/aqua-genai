# S3 Bucket
module "s3_bucket" {
  source = "./modules/s3"

  bucket_name = local.s3_bucket_name
  common_tags = local.common_tags
}

# DynamoDB Table
module "dynamodb_table" {
  source = "./modules/dynamodb"

  table_name = local.dynamodb_table_name
  common_tags = local.common_tags
}

# ECR Repositories
module "ecr_repositories" {
  source   = "./modules/ecr"
  for_each = local.ecr_repositories

  repository_name = each.value.name
  common_tags     = local.common_tags
}

# VPC
module "vpc" {
  source = "./modules/vpc"

  project_name      = local.project_name
  environment       = var.environment
  name_suffix       = local.name_suffix
  vpc_cidr         = var.vpc_cidr
  availability_zones = var.availability_zones
  common_tags      = local.common_tags
}

# Lambda IAM Role
module "lambda_iam" {
  source = "./modules/iam/lambda"

  project_name = var.project_name
  environment  = var.environment
  name_suffix  = local.name_suffix

  s3_bucket_arn = module.s3_bucket.bucket_arn
  dynamodb_table_arn = module.dynamodb_table.table_arn
  ecr_repository_arns = {
    for k, v in module.ecr_repositories : k => v.repository_arn
  }
  bedrock_model_arn = "arn:aws:bedrock:${var.model_region}::foundation-model/${var.model_id}"

  common_tags = local.common_tags
}

# Lambda Functions
module "lambda" {
  source   = "./modules/lambda"
  for_each = local.lambda_functions

  function_name = each.value.name
  description   = each.value.description
  execution_role_arn = module.lambda_iam.lambda_execution_role_arn
  image_uri     = var.lambda_image_uri
  
  memory_size = each.value.memory_size
  timeout     = each.value.timeout
  
  environment_variables = each.value.environment

  common_tags = local.common_tags
}

# API Gateway
module "api_gateway" {
  source = "./modules/api_gateway"

  project_name    = local.project_name
  api_name        = local.api_gateway_name
  api_description = "Aqua GenAI API"
  stage_name      = var.stage

  lambda_function_invoke_arns = {
    for k, v in module.lambda : k => v.function_invoke_arn
  }
  lambda_function_names = {
    for k, v in module.lambda : k => v.function_name
  }

  throttling_rate_limit  = var.api_rate_limit
  throttling_burst_limit = var.api_burst_limit
  quota_limit           = var.api_quota_limit
  quota_period          = var.api_quota_period

  cors_enabled    = true
  metrics_enabled = true
  use_api_key     = true

  common_tags = local.common_tags
}

# API Key Secret
module "api_key_secret" {
  source = "./modules/secretsmanager"
  
  project_name       = var.project_name
  environment        = var.environment
  name_suffix        = local.name_suffix
  secret_base_name   = "api-key"
  secret_description = "API key for Aqua GenAI API Gateway"
  secret_value       = module.api_gateway.api_key
  common_tags        = local.common_tags
  
  depends_on = [
    module.api_gateway
  ]
}

# ECS Config Secret
module "ecs_config_secret" {
  source = "./modules/secretsmanager"
  
  project_name       = var.project_name
  environment        = var.environment
  name_suffix        = local.name_suffix
  secret_base_name   = "ecs-config"
  secret_description = "Configuration settings for ECS React application"
  secret_value = jsonencode({
    API_ENDPOINT     = module.api_gateway.api_base_url
    S3_BUCKET_NAME   = module.s3_bucket.bucket_name
    DYNAMODB_TABLE   = module.dynamodb_table.table_name
    REGION           = data.aws_region.current.name
  })
  common_tags = local.common_tags
  
  depends_on = [
    module.api_gateway,
    module.s3_bucket,
    module.dynamodb_table
  ]
}

# ECS React Frontend
module "ecs_react_frontend" {
  source = "./modules/ecs"

  project_name    = local.project_name
  environment     = var.environment
  name_suffix     = local.name_suffix
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  
  container_name  = local.ecs_config.container_name
  container_port  = local.ecs_config.container_port
  container_image = "${module.ecr_repositories["react_frontend"].repository_url}:latest"
  desired_count   = local.ecs_config.desired_count
  cpu             = local.ecs_config.cpu
  memory          = local.ecs_config.memory
  health_check_path = local.ecs_config.health_check_path
  
  environment_variables = merge(
    {
      API_KEY_SECRET_NAME = module.api_key_secret.secret_name
      CONFIG_SECRET_NAME  = module.ecs_config_secret.secret_name
    },
    var.ecs_environment_variables
  )
  
  assign_public_ip    = true
  enable_load_balancer = true
  ecr_repository_arn  = module.ecr_repositories["react_frontend"].repository_arn
    enable_secrets_manager_access = true
  secrets_manager_arns = [
    module.api_key_secret.secret_arn,
    module.ecs_config_secret.secret_arn
  ]
  common_tags = local.common_tags
}
