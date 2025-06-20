# ECS Module

This module creates a comprehensive ECS cluster with Fargate launch type for running containerized applications. It includes the following resources:

## Resources Created

- **ECS Cluster** with optional Container Insights
- **ECS Task Definition** with configurable CPU/memory
- **ECS Service** with auto scaling support
- **IAM Roles** (Task Execution and Task Role) with conditional policies
- **Security Groups** for ALB and ECS tasks
- **Application Load Balancer** with advanced configuration
- **Auto Scaling** with CPU and memory-based policies
- **CloudWatch Log Group** with configurable retention
- **Route 53 DNS Record** (optional)

## Key Features

- 🚀 **Auto Scaling**: Automatic scaling based on CPU and memory utilization
- 📊 **Container Insights**: Optional CloudWatch Container Insights integration
- 🔒 **Enhanced Security**: Conditional IAM policies for ECR, S3, Secrets Manager
- 🏥 **Advanced Health Checks**: Configurable health check parameters
- 📝 **Structured Logging**: Dedicated CloudWatch log groups with retention
- 🔧 **ECS Exec**: Optional support for container debugging
- 🌐 **SSL/TLS**: HTTPS support with configurable SSL policies
- 📁 **Modular Design**: Separated into logical files (main.tf, alb.tf, iam.tf)

## Usage

### Basic Example

```hcl
module "ecs" {
  source = "./modules/ecs"

  project_name    = "my-project"
  environment     = "dev"
  name_suffix     = "abc123"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  
  container_name  = "my-container"
  container_port  = 80
  container_image = "${module.ecr_repositories["my_app"].repository_url}:latest"
  
  # Auto Scaling Configuration
  min_capacity    = 1
  max_capacity    = 10
  enable_auto_scaling = true
  cpu_threshold   = 70
  memory_threshold = 70
  
  # Resource Configuration
  cpu             = 512
  memory          = 1024
  
  # Health Check Configuration
  health_check_path = "/health"
  health_check_interval = 30
  health_check_timeout = 5
  health_check_healthy_threshold = 2
  health_check_unhealthy_threshold = 3
  
  # Environment Variables
  environment_variables = {
    API_ENDPOINT = "https://api.example.com"
    NODE_ENV     = "production"
  }
  
  # Network Configuration
  assign_public_ip    = true
  enable_load_balancer = true
  
  # Optional Features
  enable_container_insights = true
  enable_execute_command = true
  enable_ecr_access = true
  enable_s3_access = true
  s3_bucket_arns = [module.s3.bucket_arn]
  
  # Logging
  log_retention_days = 30
  
  common_tags = {
    Project     = "my-project"
    Environment = "dev"
  }
}
```

### Advanced Example with HTTPS

```hcl
module "ecs" {
  source = "./modules/ecs"

  project_name    = "my-project"
  environment     = "prod"
  name_suffix     = "v1"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  container_name  = "web-app"
  container_port  = 3000
  container_image = "${module.ecr_repositories["web_app"].repository_url}:latest"
  
  # Auto Scaling
  min_capacity    = 2
  max_capacity    = 20
  enable_auto_scaling = true
  cpu_threshold   = 60
  memory_threshold = 80
  
  # High Performance Configuration
  cpu             = 1024
  memory          = 2048
  
  # HTTPS Configuration
  certificate_arn = aws_acm_certificate.app.arn
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  domain_name     = "app.example.com"
  
  # ALB Configuration
  enable_deletion_protection = true
  alb_idle_timeout = 120
  alb_access_logs_bucket = module.s3_logs.bucket_id
  alb_access_logs_prefix = "alb-logs/"
  
  # Enhanced Security
  enable_ecr_access = true
  enable_secrets_manager_access = true
  secrets_manager_arns = [
    aws_secretsmanager_secret.app_secrets.arn
  ]
  
  # Monitoring
  enable_container_insights = true
  log_retention_days = 90
  
  common_tags = {
    Project     = "my-project"
    Environment = "prod"
    Backup      = "daily"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | The name of the project | `string` | n/a | yes |
| environment | The deployment environment | `string` | n/a | yes |
| name_suffix | A suffix to append to resource names for uniqueness | `string` | n/a | yes |
| vpc_id | The ID of the VPC where the ECS cluster will be created | `string` | n/a | yes |
| subnet_ids | The IDs of the subnets where the ECS tasks will be placed | `list(string)` | n/a | yes |
| container_name | The name of the container | `string` | n/a | yes |
| container_port | The port on which the container will listen | `number` | `80` | no |
| container_image | The URI of the container image | `string` | n/a | yes |
| desired_count | The number of instances of the task to place and keep running | `number` | `1` | no |
| cpu | The number of cpu units to reserve for the container | `number` | `256` | no |
| memory | The amount of memory (in MiB) to reserve for the container | `number` | `512` | no |
| health_check_path | The path for the health check endpoint | `string` | `/` | no |
| environment_variables | Environment variables to pass to the container | `map(string)` | `{}` | no |
| assign_public_ip | Whether to assign a public IP to the task | `bool` | `false` | no |
| enable_load_balancer | Whether to create and attach an Application Load Balancer | `bool` | `true` | no |
| common_tags | Common tags to be applied to all resources | `map(string)` | `{}` | no |
| ecr_repository_arn | The ARN of the ECR repository containing the container image | `string` | n/a | yes |
| task_execution_role_arn | The ARN of the IAM role that the ECS task will use for execution | `string` | `""` | no |
| task_role_arn | The ARN of the IAM role that the ECS task will use at runtime | `string` | `""` | no |
| lb_security_group_ids | Security group IDs to assign to the load balancer | `list(string)` | `[]` | no |
| task_security_group_ids | Security group IDs to assign to the ECS tasks | `list(string)` | `[]` | no |
| certificate_arn | ARN of the SSL certificate for HTTPS | `string` | `""` | no |
| domain_name | Domain name for the application (e.g., app.example.com) | `string` | `""` | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | The ID of the ECS cluster |
| cluster_arn | The ARN of the ECS cluster |
| service_id | The ID of the ECS service |
| service_name | The name of the ECS service |
| task_definition_arn | The ARN of the task definition |
| task_execution_role_arn | The ARN of the task execution role |
| task_role_arn | The ARN of the task role |
| lb_dns_name | The DNS name of the load balancer |
| lb_zone_id | The canonical hosted zone ID of the load balancer |
| lb_arn | The ARN of the load balancer |
| target_group_arn | The ARN of the target group |
| security_group_lb_id | The ID of the load balancer security group |
| security_group_task_id | The ID of the task security group |
| application_url | The URL of the application |