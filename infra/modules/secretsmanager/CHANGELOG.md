# Changelog

All notable changes to the Secrets Manager module will be documented in this file.

## [2.0.0] - 2025-01-XX

### Added
- **Structured Naming Convention**: Added support for consistent resource naming with `project_name`, `environment`, `name_suffix`, and `secret_base_name`
- **Enhanced Secret Value Handling**: Added intelligent JSON detection and wrapping for secret values
- **Locals Configuration**: Added locals block for standardized naming patterns
- **Enhanced Tagging**: Added Name tag to secrets for better resource identification

### Changed
- **BREAKING**: Replaced `secret_name` variable with structured naming approach using `project_name`, `environment`, `name_suffix`, and `secret_base_name`
- **Resource Names**: Updated resource names from `this` to `secret` and `secret_version` for better clarity
- **Secret Value Processing**: Enhanced secret value handling to support both JSON objects and simple strings
- **Naming Pattern**: Secrets now follow the pattern: `{project_name}-{environment}-secret-{secret_base_name}-{name_suffix}`

### Enhanced
- **Consistency**: Improved consistency with other infrastructure modules
- **Flexibility**: Enhanced flexibility in secret value formats (JSON vs simple strings)
- **Documentation**: Updated outputs to match new resource naming

### Migration Guide
When upgrading from v1.x to v2.0.0:

1. **Update variable names**:
   ```hcl
   # Old
   module "my_secret" {
     source      = "./modules/secretsmanager"
     secret_name = "my-app-secret"
     # ...
   }
   
   # New
   module "my_secret" {
     source           = "./modules/secretsmanager"
     project_name     = "my-app"
     environment      = "prod"
     name_suffix      = "abc123"
     secret_base_name = "api-key"
     # ...
   }
   ```

2. **Update output references**:
   ```hcl
   # Old outputs still work, but resource names changed internally
   # No changes needed for output references
   ```

3. **Secret value format**:
   ```hcl
   # Simple string (automatically wrapped in JSON)
   secret_value = "my-api-key-value"
   # Results in: {"api_key": "my-api-key-value"}
   
   # JSON object (used as-is)
   secret_value = jsonencode({
     api_key = "my-api-key-value"
     config  = "my-config-value"
   })
   # Results in: {"api_key": "my-api-key-value", "config": "my-config-value"}
   ```

### Usage
```hcl
module "api_key_secret" {
  source = "./modules/secretsmanager"
  
  project_name       = "aqua-genai"
  environment        = "prod"
  name_suffix        = "abc123"
  secret_base_name   = "api-key"
  secret_description = "API key for application"
  secret_value       = var.api_key_value
  
  common_tags = {
    Environment = "prod"
    Project     = "aqua-genai"
  }
}

module "config_secret" {
  source = "./modules/secretsmanager"
  
  project_name       = "aqua-genai"
  environment        = "prod"
  name_suffix        = "abc123"
  secret_base_name   = "config"
  secret_description = "Application configuration"
  secret_value = jsonencode({
    database_url = "postgresql://..."
    api_endpoint = "https://api.example.com"
    region       = "us-west-2"
  })
  
  common_tags = {
    Environment = "prod"
    Project     = "aqua-genai"
  }
}
```

## [1.0.0] - 2024-01-XX

### Added
- Initial Secrets Manager module implementation
- Basic secret creation and versioning
- KMS encryption support
- Secret policy support
- Rotation configuration
- Basic tagging support