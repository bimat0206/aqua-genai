variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "name_suffix" {
  description = "A suffix to append to resource names"
  type        = string
}

variable "s3_bucket_arn" {
  description = "The ARN of the S3 bucket"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB table"
  type        = string
}

variable "ecr_repository_arns" {
  description = "A map of ECR repository ARNs, where keys are logical names (e.g., 'validate', 'catalog')"
  type        = map(string)
}

variable "bedrock_model_arn" {
  description = "The ARN of the Bedrock model"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}