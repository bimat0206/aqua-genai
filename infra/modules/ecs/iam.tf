# IAM roles and policies for ECS

# ECS Task Execution Role (if not provided)
resource "aws_iam_role" "task_execution_role" {
  count = var.task_execution_role_arn == "" ? 1 : 0

  name = "${var.project_name}-task-execution-role-${var.environment}-${var.name_suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-task-execution-role-${var.environment}-${var.name_suffix}"
    })
  )
}

resource "aws_iam_role_policy_attachment" "task_execution_role_policy" {
  count = var.task_execution_role_arn == "" ? 1 : 0

  role       = aws_iam_role.task_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Secrets Manager policy for task execution role (needed for secrets in container definition)
resource "aws_iam_policy" "task_execution_secrets_manager_policy" {
  count = var.enable_secrets_manager_access && var.task_execution_role_arn == "" ? 1 : 0

  name        = "${var.project_name}-task-execution-secrets-manager-policy-${var.environment}-${var.name_suffix}"
  description = "Policy for ECS task execution role to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Effect   = "Allow"
        Resource = length(var.secrets_manager_arns) > 0 ? var.secrets_manager_arns : ["*"]
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "task_execution_secrets_manager_attachment" {
  count = var.enable_secrets_manager_access && var.task_execution_role_arn == "" ? 1 : 0

  role       = aws_iam_role.task_execution_role[0].name
  policy_arn = aws_iam_policy.task_execution_secrets_manager_policy[0].arn
}

# ECS Task Role (if not provided)
resource "aws_iam_role" "task_role" {
  count = var.task_role_arn == "" ? 1 : 0

  name = "${var.project_name}-task-role-${var.environment}-${var.name_suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-task-role-${var.environment}-${var.name_suffix}"
    })
  )
}

# CloudWatch Logs policy for task role
resource "aws_iam_policy" "cloudwatch_logs_policy" {
  count = var.task_role_arn == "" ? 1 : 0

  name        = "${var.project_name}-cloudwatch-logs-policy-${var.environment}-${var.name_suffix}"
  description = "Policy for ECS tasks to write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "cloudwatch:PutMetricData"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "cloudwatch_logs_attachment" {
  count = var.task_role_arn == "" ? 1 : 0

  role       = aws_iam_role.task_role[0].name
  policy_arn = aws_iam_policy.cloudwatch_logs_policy[0].arn
}

# ECR access policy (conditional)
resource "aws_iam_policy" "ecr_policy" {
  count = var.enable_ecr_access && var.task_role_arn == "" ? 1 : 0

  name        = "${var.project_name}-ecr-policy-${var.environment}-${var.name_suffix}"
  description = "Policy for ECS tasks to access ECR"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetAuthorizationToken",
          "ecr:DescribeRepositories",
          "ecr:DescribeImages",
          "ecr:ListImages"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "ecr_attachment" {
  count = var.enable_ecr_access && var.task_role_arn == "" ? 1 : 0

  role       = aws_iam_role.task_role[0].name
  policy_arn = aws_iam_policy.ecr_policy[0].arn
}

# S3 access policy (conditional)
resource "aws_iam_policy" "s3_policy" {
  count = var.enable_s3_access && var.task_role_arn == "" ? 1 : 0

  name        = "${var.project_name}-s3-policy-${var.environment}-${var.name_suffix}"
  description = "Policy for ECS tasks to access S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject",
          "s3:GetBucketLocation"
        ]
        Effect   = "Allow"
        Resource = length(var.s3_bucket_arns) > 0 ? concat(var.s3_bucket_arns, [for arn in var.s3_bucket_arns : "${arn}/*"]) : ["*"]
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "s3_attachment" {
  count = var.enable_s3_access && var.task_role_arn == "" ? 1 : 0

  role       = aws_iam_role.task_role[0].name
  policy_arn = aws_iam_policy.s3_policy[0].arn
}

# Secrets Manager access policy (conditional)
resource "aws_iam_policy" "secrets_manager_policy" {
  count = var.enable_secrets_manager_access && var.task_role_arn == "" ? 1 : 0

  name        = "${var.project_name}-secrets-manager-policy-${var.environment}-${var.name_suffix}"
  description = "Policy for ECS tasks to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Effect   = "Allow"
        Resource = length(var.secrets_manager_arns) > 0 ? var.secrets_manager_arns : ["*"]
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "secrets_manager_attachment" {
  count = var.enable_secrets_manager_access && var.task_role_arn == "" ? 1 : 0

  role       = aws_iam_role.task_role[0].name
  policy_arn = aws_iam_policy.secrets_manager_policy[0].arn
}
