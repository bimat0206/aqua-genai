variable "table_name" {
  description = "The name of the DynamoDB table"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
} 