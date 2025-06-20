output "api_gateway_invoke_url" {
  description = "The invoke URL for the API Gateway endpoint"
  value       = module.api_gateway.api_endpoint
}

output "dataset_bucket_name" {
  description = "The name of the S3 bucket where input images are stored"
  value       = module.s3_bucket.bucket_name
}

output "dynamodb_table_name" {
  description = "The name of the DynamoDB table used to store the validation results"
  value       = module.dynamodb_table.table_name
}

output "api_key" {
  description = "The API Key for accessing the API Gateway endpoints"
  value       = module.api_gateway.api_key
  sensitive   = true
}

output "lambda_function_names" {
  description = "The names of the Lambda functions"
  value       = { for k, v in module.lambda : k => v.function_name }
}

output "ecr_repository_urls" {
  description = "The URLs of the ECR repositories"
  value       = { for k, v in module.ecr_repositories : k => v.repository_url }
}

output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "api_key_secret_arn" {
  description = "The ARN of the API key secret"
  value       = module.api_key_secret.secret_arn
}

output "ecs_cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = module.ecs_react_frontend.cluster_arn
}

output "ecs_service_name" {
  description = "The name of the ECS service"
  value       = module.ecs_react_frontend.service_name
}

output "react_frontend_url" {
  description = "The URL of the React frontend application"
  value       = module.ecs_react_frontend.application_url
}