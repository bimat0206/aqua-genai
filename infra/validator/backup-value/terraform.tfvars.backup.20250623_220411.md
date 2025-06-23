# Terraform Variables Backup

**Date:** 2025-06-23 22:04:11
**Directory:** .
**File:** terraform.tfvars

## Variables Content
```hcl
project_name = "aqua-genai"
environment  = "dev"
stage        = "dev"

# AWS Region Configuration
aws_region = "ap-southeast-1"

# Bedrock Model Configuration
model_region      = "us-east-1"
model_id          = "us.anthropic.claude-sonnet-4-20250514-v1:0"
model_max_tokens  = 12000
model_temperature = 0.7

# Lambda Function Configuration
function_memory_size = 1024
function_timeout     = 30
function_log_level   = "INFO"

# Reference Images Configuration
max_reference_label_images    = 2
max_reference_overview_images = 2

# API Gateway Configuration
api_rate_limit  = 10
api_burst_limit = 5
api_quota_limit = 1000
api_quota_period = "MONTH"

# Lambda Container Image
lambda_image_uri = "879654127886.dkr.ecr.ap-southeast-1.amazonaws.com/tamle-ecs:latest"

# Common Tags
common_tags = {
  Project     = "aqua-genai"
  Environment = "dev"
}

vpc_cidr = "10.9.0.0/22"
availability_zones = ["ap-southeast-1a", "ap-southeast-1b"]

```
