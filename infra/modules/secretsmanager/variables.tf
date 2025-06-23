variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (e.g., dev, staging, prod)"
  type        = string
  default     = ""
}

variable "name_suffix" {
  description = "Suffix to add to resource names"
  type        = string
  default     = ""
}

variable "secret_base_name" {
  description = "Base name for the secret (without prefix/suffix)"
  type        = string
}

variable "secret_description" {
  description = "Description of the Secrets Manager secret"
  type        = string
}

variable "secret_value" {
  description = "The value of the secret"
  type        = string
  sensitive   = true
}

variable "kms_key_id" {
  description = "The KMS key ID to use for encryption"
  type        = string
  default     = null
}

variable "secret_policy" {
  description = "The policy document for the secret"
  type        = string
  default     = null
}

variable "enable_rotation" {
  description = "Whether to enable automatic rotation"
  type        = bool
  default     = false
}

variable "rotation_lambda_arn" {
  description = "The ARN of the Lambda function for rotation"
  type        = string
  default     = null
}

variable "rotation_days" {
  description = "The number of days between automatic rotations"
  type        = number
  default     = 30
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
} 