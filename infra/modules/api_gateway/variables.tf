variable "api_name" {
  description = "The name of the API Gateway"
  type        = string
}

variable "api_description" {
  description = "The description of the API Gateway"
  type        = string
}

variable "stage_name" {
  description = "The name of the API Gateway stage"
  type        = string
}

variable "lambda_function_names" {
  description = "A map of Lambda function names, where keys are logical names (e.g., 'validate', 'catalog')"
  type        = map(string)
}

variable "lambda_function_invoke_arns" {
  description = "A map of Lambda function invoke ARNs, where keys are logical names (e.g., 'validate', 'catalog')"
  type        = map(string)
}

variable "throttling_rate_limit" {
  description = "The steady-state rate limit (average requests per second) for the API Gateway usage plan"
  type        = number
}

variable "throttling_burst_limit" {
  description = "The maximum burst of requests that API Gateway will allow for the usage plan"
  type        = number
}

variable "quota_limit" {
  description = "The maximum number of requests that can be made in the specified quota period"
  type        = number
}

variable "quota_period" {
  description = "The period over which the API Gateway usage plan quota applies"
  type        = string
}

variable "cors_enabled" {
  description = "Whether to enable CORS for the API Gateway"
  type        = bool
  default     = true
}

variable "metrics_enabled" {
  description = "Whether to enable CloudWatch metrics for the API Gateway"
  type        = bool
  default     = true
}

variable "use_api_key" {
  description = "Whether to require an API key for accessing the API Gateway"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "project_name" {
  description = "The name of the project"
  type        = string
}
