# ECS Cluster
resource "aws_ecs_cluster" "this" {
  name = "${var.project_name}-cluster-${var.environment}-${var.name_suffix}"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-cluster-${var.environment}-${var.name_suffix}"
    })
  )
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-${var.name_suffix}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

# Security Groups (if not provided)
resource "aws_security_group" "lb" {
  count = var.enable_load_balancer && length(var.lb_security_group_ids) == 0 ? 1 : 0

  name        = "${var.project_name}-lb-sg-${var.environment}-${var.name_suffix}"
  description = "Security group for the load balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-lb-sg-${var.environment}-${var.name_suffix}"
    })
  )
}

resource "aws_security_group" "task" {
  count = length(var.task_security_group_ids) == 0 ? 1 : 0

  name        = "${var.project_name}-task-sg-${var.environment}-${var.name_suffix}"
  description = "Security group for the ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port = var.container_port
    to_port   = var.container_port
    protocol  = "tcp"
    security_groups = var.enable_load_balancer && length(var.lb_security_group_ids) == 0 ? [
      aws_security_group.lb[0].id
    ] : var.lb_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-task-sg-${var.environment}-${var.name_suffix}"
    })
  )
}

# Task Definition
resource "aws_ecs_task_definition" "this" {
  family                   = "${var.project_name}-task-${var.environment}-${var.name_suffix}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.task_execution_role_arn != "" ? var.task_execution_role_arn : aws_iam_role.task_execution_role[0].arn
  task_role_arn            = var.task_role_arn != "" ? var.task_role_arn : (var.task_role_arn == "" ? aws_iam_role.task_role[0].arn : null)

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in var.environment_variables :
        {
          name  = key
          value = value
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-task-${var.environment}-${var.name_suffix}"
    })
  )
}

# ECS Service
resource "aws_ecs_service" "this" {
  name                              = "${var.project_name}-service-${var.environment}-${var.name_suffix}"
  cluster                           = aws_ecs_cluster.this.id
  task_definition                   = aws_ecs_task_definition.this.arn
  launch_type                       = "FARGATE"
  platform_version                  = "LATEST"
  desired_count                     = var.min_capacity
  health_check_grace_period_seconds = var.enable_load_balancer ? 60 : null
  enable_execute_command            = var.enable_execute_command

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = length(var.task_security_group_ids) > 0 ? var.task_security_group_ids : [aws_security_group.task[0].id]
    assign_public_ip = var.assign_public_ip
  }

  dynamic "load_balancer" {
    for_each = var.enable_load_balancer ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.this[0].arn
      container_name   = var.container_name
      container_port   = var.container_port
    }
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-service-${var.environment}-${var.name_suffix}"
    })
  )

  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.task_execution_role_policy,
    aws_iam_role_policy_attachment.cloudwatch_logs_attachment
  ]
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  count              = var.enable_auto_scaling ? 1 : 0
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - CPU
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  count              = var.enable_auto_scaling ? 1 : 0
  name               = "${var.project_name}-cpu-autoscaling-${var.environment}-${var.name_suffix}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Memory
resource "aws_appautoscaling_policy" "ecs_policy_memory" {
  count              = var.enable_auto_scaling ? 1 : 0
  name               = "${var.project_name}-memory-autoscaling-${var.environment}-${var.name_suffix}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Route 53 Record (if domain name is provided)
resource "aws_route53_record" "this" {
  count = var.enable_load_balancer && var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.selected[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.this[0].dns_name
    zone_id                = aws_lb.this[0].zone_id
    evaluate_target_health = true
  }
}

# Data sources
data "aws_region" "current" {}

data "aws_route53_zone" "selected" {
  count = var.enable_load_balancer && var.domain_name != "" ? 1 : 0

  name         = join(".", slice(split(".", var.domain_name), 1, length(split(".", var.domain_name))))
  private_zone = false
}
