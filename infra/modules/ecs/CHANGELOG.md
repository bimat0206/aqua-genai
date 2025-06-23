# Changelog

All notable changes to the ECS module will be documented in this file.

## [2.1.0] - 2025-01-XX

### Added
- **AWS Secrets Manager Integration**: Added support for injecting secrets from AWS Secrets Manager into ECS containers
- **Secrets Variable**: Added `secrets` variable to support AWS Secrets Manager secrets in container definitions
- **Enhanced IAM Permissions**: Added Secrets Manager permissions for both task execution and task roles
- **Task Execution Role Secrets Access**: Added dedicated IAM policy for task execution role to access Secrets Manager during container startup

### Changed
- **Container Definition**: Updated container definition to support `secrets` field for AWS Secrets Manager integration
- **IAM Dependencies**: Updated ECS service dependencies to include new Secrets Manager IAM policy attachments

### Enhanced
- **Security**: Improved security by enabling secure secret injection from AWS Secrets Manager
- **Runtime Configuration**: Enhanced runtime configuration capabilities through encrypted secrets

### Usage
```hcl
module "ecs" {
  source = "./modules/ecs"
  
  # Enable Secrets Manager access
  enable_secrets_manager_access = true
  secrets_manager_arns = [
    "arn:aws:secretsmanager:region:account:secret:my-secret"
  ]
  
  # Define secrets to inject into container
  secrets = [
    {
      name      = "API_KEY"
      valueFrom = "arn:aws:secretsmanager:region:account:secret:api-key"
    },
    {
      name      = "CONFIG"
      valueFrom = "arn:aws:secretsmanager:region:account:secret:config"
    }
  ]
}
```

## [2.0.0] - 2024-01-XX

### Added
- **File Structure Refactoring**: Split main.tf into separate files (main.tf, alb.tf, iam.tf) for better maintainability
- **Auto Scaling**: Added comprehensive auto scaling support with CPU and memory-based scaling policies
- **Enhanced ALB Configuration**: Added advanced ALB features including access logs, deletion protection, idle timeout
- **CloudWatch Integration**: Added dedicated CloudWatch log group with configurable retention
- **Container Insights**: Added configurable CloudWatch Container Insights support
- **Execute Command**: Added support for ECS exec functionality
- **Enhanced Health Checks**: Added comprehensive health check configuration options
- **IAM Enhancements**: Added conditional IAM policies for ECR, S3, and Secrets Manager access
- **SSL/TLS Support**: Enhanced HTTPS configuration with configurable SSL policies

### Changed
- **BREAKING**: Changed `desired_count` to `min_capacity` for better auto scaling integration
- **Enhanced Security Groups**: Improved security group configuration with better ingress/egress rules
- **Task Definition**: Updated task definition to use dedicated CloudWatch log group
- **ECS Service**: Enhanced service configuration with health check grace periods and platform version
- **Variables**: Added numerous new variables for enhanced configurability

### Enhanced
- **Outputs**: Extended outputs to include auto scaling and CloudWatch information
- **Documentation**: Updated README with comprehensive configuration examples
- **Flexibility**: Improved conditional resource creation based on feature flags

### Deprecated
- `desired_count` variable (use `min_capacity` instead)

### Migration Guide
When upgrading from v1.x to v2.0.0:

1. **Update variable names**:
   ```hcl
   # Old
   desired_count = 2
   
   # New  
   min_capacity = 2
   max_capacity = 10
   ```

2. **Enable new features** (optional):
   ```hcl
   enable_auto_scaling = true
   enable_container_insights = true
   enable_execute_command = true
   ```

3. **Configure enhanced health checks** (optional):
   ```hcl
   health_check_interval = 30
   health_check_timeout = 5
   health_check_healthy_threshold = 2
   health_check_unhealthy_threshold = 3
   ```

## [1.0.0] - 2024-01-XX

### Added
- Initial ECS module implementation
- Basic ECS cluster, service, and task definition
- Application Load Balancer support
- Basic IAM roles and policies
- Security groups
- Route 53 integration
- Basic health checks