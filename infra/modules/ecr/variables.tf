variable "repository_name" {
  description = "The name of the ECR repository"
  type        = string
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository"
  type        = string
  default     = "MUTABLE"
  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "Image tag mutability must be either MUTABLE or IMMUTABLE"
  }
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "The encryption type for the repository"
  type        = string
  default     = "AES256"
  validation {
    condition     = contains(["AES256", "KMS"], var.encryption_type)
    error_message = "Encryption type must be either AES256 or KMS"
  }
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key to use when encryption_type is KMS"
  type        = string
  default     = null
}

variable "enable_lifecycle_policy" {
  description = "Whether to enable lifecycle policy for the repository"
  type        = bool
  default     = true
}

variable "max_image_count" {
  description = "The maximum number of images to keep in the repository"
  type        = number
  default     = 30
}

variable "repository_policy" {
  description = "The policy document for the repository"
  type        = string
  default     = null
}

variable "replication_regions" {
  description = "The list of regions to replicate the repository to"
  type        = list(string)
  default     = []
}

variable "destination_registry_id" {
  description = "The registry ID of the destination registry for replication"
  type        = string
  default     = null
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
} 