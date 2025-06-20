variable "secret_name" {
  description = "The name of the secret"
  type        = string
}

variable "secret_description" {
  description = "The description of the secret"
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