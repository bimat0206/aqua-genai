variable "function_name" {
  description = "The name of the Lambda function"
  type        = string
}

variable "description" {
  description = "The description of the Lambda function"
  type        = string
}

variable "execution_role_arn" {
  description = "The ARN of the Lambda execution role"
  type        = string
}

variable "image_uri" {
  description = "The URI of the Lambda function container image"
  type        = string
}

variable "memory_size" {
  description = "The amount of memory that the Lambda function has available, in MB"
  type        = number
  default     = 1024
}

variable "timeout" {
  description = "The maximum amount of time (in seconds) that the Lambda function can run"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "vpc_config" {
  description = "VPC configuration for the Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "file_system_config" {
  description = "File system configuration for the Lambda function"
  type = object({
    arn              = string
    local_mount_path = string
  })
  default = null
}

variable "tracing_mode" {
  description = "The tracing mode for the Lambda function"
  type        = string
  default     = "PassThrough"
  validation {
    condition     = contains(["PassThrough", "Active"], var.tracing_mode)
    error_message = "Tracing mode must be either PassThrough or Active"
  }
}

variable "log_retention_in_days" {
  description = "The number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "enable_error_alarm" {
  description = "Whether to enable CloudWatch alarm for errors"
  type        = bool
  default     = false
}

variable "enable_duration_alarm" {
  description = "Whether to enable CloudWatch alarm for duration"
  type        = bool
  default     = false
}

variable "duration_threshold" {
  description = "The threshold for the duration alarm in milliseconds"
  type        = number
  default     = 1000
}

variable "alarm_actions" {
  description = "The list of actions to execute when the alarm transitions into an ALARM state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "The list of actions to execute when the alarm transitions into an OK state"
  type        = list(string)
  default     = []
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
} 