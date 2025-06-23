variable "project_name" {
  description = "A unique prefix used to name all resources"
  type        = string
}

variable "environment" {
  description = "The deployment environment (e.g., dev, test, prod)"
  type        = string
}

variable "aws_region" {
  description = "The AWS region where resources will be created"
  type        = string
}

variable "stage" {
  description = "The deployment stage name for the API Gateway"
  type        = string
}

variable "model_region" {
  description = "The AWS region where the Bedrock foundation model is hosted"
  type        = string
}

variable "model_id" {
  description = "The specific identifier for the Bedrock foundation model"
  type        = string
}

variable "model_max_tokens" {
  description = "The maximum number of tokens to generate in the Bedrock response"
  type        = number
}

variable "model_temperature" {
  description = "The sampling temperature to use for the Bedrock model"
  type        = number
  validation {
    condition     = var.model_temperature >= 0.0 && var.model_temperature <= 1.0
    error_message = "Model temperature must be between 0.0 and 1.0"
  }
}

variable "function_memory_size" {
  description = "The amount of memory that the Lambda function has available, in MB"
  type        = number
  default     = 1024
}

variable "function_timeout" {
  description = "The maximum amount of time (in seconds) that the Lambda function can run"
  type        = number
  default     = 30
}

variable "max_reference_label_images" {
  description = "The maximum amount of reference label images that the Lambda function use for model"
  type        = number
  default     = 2
}

variable "max_reference_overview_images" {
  description = "The maximum amount of reference overview images that the Lambda function use for model"
  type        = number
  default     = 2
}

variable "function_log_level" {
  description = "The logging level for monitoring the Lambda function"
  type        = string
  default     = "INFO"
}

variable "api_rate_limit" {
  description = "The steady-state rate limit (average requests per second) for the API Gateway usage plan"
  type        = number
  default     = 10
  validation {
    condition     = var.api_rate_limit >= 1
    error_message = "API rate limit must be at least 1"
  }
}

variable "api_burst_limit" {
  description = "The maximum burst of requests that API Gateway will allow for the usage plan"
  type        = number
  default     = 5
  validation {
    condition     = var.api_burst_limit >= 1
    error_message = "API burst limit must be at least 1"
  }
}

variable "api_quota_limit" {
  description = "The maximum number of requests that can be made in the specified quota period"
  type        = number
  default     = 1000
  validation {
    condition     = var.api_quota_limit >= 1
    error_message = "API quota limit must be at least 1"
  }
}

variable "api_quota_period" {
  description = "The period over which the API Gateway usage plan quota applies"
  type        = string
  default     = "MONTH"
  validation {
    condition     = contains(["DAY", "WEEK", "MONTH"], var.api_quota_period)
    error_message = "API quota period must be one of: DAY, WEEK, MONTH"
  }
}

variable "lambda_image_uri" {
  description = "The URI of the Lambda function container image"
  type        = string
}

variable "react_frontend_image_uri" {
  description = "The URI of the React frontend container image"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}







variable "ecs_environment_variables" {
  description = "Additional environment variables for ECS."
  type        = map(string)
  default     = {}
}