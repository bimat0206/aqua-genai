resource "aws_lambda_function" "this" {
  function_name = var.function_name
  description   = var.description
  package_type  = "Image"
  image_uri     = var.image_uri
  role          = var.execution_role_arn

  memory_size = var.memory_size
  timeout     = var.timeout

  environment {
    variables = var.environment_variables
  }

  architectures = ["arm64"]

  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  dynamic "file_system_config" {
    for_each = var.file_system_config != null ? [var.file_system_config] : []
    content {
      arn              = file_system_config.value.arn
      local_mount_path = file_system_config.value.local_mount_path
    }
  }

  tracing_config {
    mode = var.tracing_mode
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "errors" {
  count               = var.enable_error_alarm ? 1 : 0
  alarm_name          = "${var.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period             = "60"
  statistic          = "Sum"
  threshold          = "0"
  alarm_description  = "This metric monitors lambda function errors"
  alarm_actions      = var.alarm_actions
  ok_actions         = var.ok_actions

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "duration" {
  count               = var.enable_duration_alarm ? 1 : 0
  alarm_name          = "${var.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period             = "60"
  statistic          = "Average"
  threshold          = var.duration_threshold
  alarm_description  = "This metric monitors lambda function duration"
  alarm_actions      = var.alarm_actions
  ok_actions         = var.ok_actions

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  tags = var.common_tags
} 