variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "name_suffix" {
  description = "A suffix to append to resource names for uniqueness"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC where the ECS cluster will be created"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets where the ECS tasks will be placed"
  type        = list(string)
}

variable "container_name" {
  description = "The name of the container"
  type        = string
}

variable "container_port" {
  description = "The port on which the container will listen"
  type        = number
  default     = 80
}

variable "container_image" {
  description = "The URI of the container image"
  type        = string
}

variable "min_capacity" {
  description = "Minimum number of tasks to run"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks to run"
  type        = number
  default     = 10
}

variable "desired_count" {
  description = "The number of instances of the task to place and keep running (deprecated - use min_capacity)"
  type        = number
  default     = 1
}

variable "cpu" {
  description = "The number of cpu units to reserve for the container"
  type        = number
  default     = 256
}

variable "memory" {
  description = "The amount of memory (in MiB) to reserve for the container"
  type        = number
  default     = 512
}

variable "health_check_path" {
  description = "The path for the health check endpoint"
  type        = string
  default     = "/"
}

variable "environment_variables" {
  description = "Environment variables to pass to the container"
  type        = map(string)
  default     = {}
}

variable "assign_public_ip" {
  description = "Whether to assign a public IP to the task"
  type        = bool
  default     = false
}

variable "enable_load_balancer" {
  description = "Whether to create and attach an Application Load Balancer"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "ecr_repository_arn" {
  description = "The ARN of the ECR repository containing the container image"
  type        = string
}

variable "task_execution_role_arn" {
  description = "The ARN of the IAM role that the ECS task will use for execution"
  type        = string
  default     = ""
}

variable "task_role_arn" {
  description = "The ARN of the IAM role that the ECS task will use at runtime"
  type        = string
  default     = ""
}

variable "lb_security_group_ids" {
  description = "Security group IDs to assign to the load balancer"
  type        = list(string)
  default     = []
}

variable "task_security_group_ids" {
  description = "Security group IDs to assign to the ECS tasks"
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application (e.g., app.example.com)"
  type        = string
  default     = ""
}

# Container Insights
variable "enable_container_insights" {
  description = "Whether to enable CloudWatch Container Insights for the ECS cluster"
  type        = bool
  default     = false
}

# Execute Command
variable "enable_execute_command" {
  description = "Whether to enable execute command functionality for the ECS service"
  type        = bool
  default     = false
}

# Auto Scaling
variable "enable_auto_scaling" {
  description = "Whether to enable auto scaling for the ECS service"
  type        = bool
  default     = true
}

variable "cpu_threshold" {
  description = "CPU utilization threshold for scaling"
  type        = number
  default     = 70
}

variable "memory_threshold" {
  description = "Memory utilization threshold for scaling"
  type        = number
  default     = 70
}

# ALB Configuration
variable "internal_alb" {
  description = "Whether the ALB is internal"
  type        = bool
  default     = false
}

variable "enable_deletion_protection" {
  description = "Whether to enable deletion protection for the ALB"
  type        = bool
  default     = false
}

variable "alb_idle_timeout" {
  description = "Idle timeout for the ALB in seconds"
  type        = number
  default     = 60
}

variable "alb_access_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

variable "alb_access_logs_prefix" {
  description = "S3 prefix for ALB access logs"
  type        = string
  default     = ""
}

variable "deregistration_delay" {
  description = "Deregistration delay for the target group in seconds"
  type        = number
  default     = 30
}

# Health Check Configuration
variable "health_check_interval" {
  description = "Interval between health checks in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Timeout for health checks in seconds"
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks to be considered healthy"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks to be considered unhealthy"
  type        = number
  default     = 3
}

# SSL Configuration
variable "ssl_policy" {
  description = "SSL policy for the HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-2016-08"
}

# Logging
variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Conditional Access Policies
variable "enable_ecr_access" {
  description = "Whether to enable access to ECR"
  type        = bool
  default     = false
}

variable "enable_s3_access" {
  description = "Whether to enable access to S3"
  type        = bool
  default     = false
}

variable "s3_bucket_arns" {
  description = "List of S3 bucket ARNs"
  type        = list(string)
  default     = []
}

variable "enable_secrets_manager_access" {
  description = "Whether to enable access to Secrets Manager"
  type        = bool
  default     = false
}

variable "secrets_manager_arns" {
  description = "List of Secrets Manager ARNs"
  type        = list(string)
  default     = []
}

variable "secrets" {
  description = "List of secrets to be passed to the container from AWS Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}
