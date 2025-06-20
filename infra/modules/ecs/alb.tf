# Application Load Balancer Configuration

# Load Balancer
resource "aws_lb" "this" {
  count = var.enable_load_balancer ? 1 : 0

  name               = "${var.project_name}-lb-${var.environment}-${var.name_suffix}"
  internal           = var.internal_alb
  load_balancer_type = "application"
  security_groups    = length(var.lb_security_group_ids) > 0 ? var.lb_security_group_ids : [aws_security_group.lb[0].id]
  subnets            = var.subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  enable_http2               = true
  idle_timeout               = var.alb_idle_timeout

  dynamic "access_logs" {
    for_each = var.alb_access_logs_bucket != "" ? [1] : []
    content {
      bucket  = var.alb_access_logs_bucket
      prefix  = var.alb_access_logs_prefix != "" ? var.alb_access_logs_prefix : null
      enabled = true
    }
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-lb-${var.environment}-${var.name_suffix}"
    })
  )
}

# Target Group
resource "aws_lb_target_group" "this" {
  count = var.enable_load_balancer ? 1 : 0

  name                 = "${var.project_name}-tg-${var.environment}-${var.name_suffix}"
  port                 = var.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = var.deregistration_delay

  health_check {
    enabled             = true
    interval            = var.health_check_interval
    path                = var.health_check_path
    port                = "traffic-port"
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    timeout             = var.health_check_timeout
    protocol            = "HTTP"
    matcher             = "200-399"
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-tg-${var.environment}-${var.name_suffix}"
    })
  )

  lifecycle {
    create_before_destroy = true
  }
}

# HTTP Listener
resource "aws_lb_listener" "http" {
  count = var.enable_load_balancer ? 1 : 0

  load_balancer_arn = aws_lb.this[0].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = var.certificate_arn != "" ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = var.certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    dynamic "forward" {
      for_each = var.certificate_arn == "" ? [1] : []
      content {
        target_group {
          arn = aws_lb_target_group.this[0].arn
        }
      }
    }
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-http-listener-${var.environment}-${var.name_suffix}"
    })
  )
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  count = var.enable_load_balancer && var.certificate_arn != "" ? 1 : 0

  load_balancer_arn = aws_lb.this[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this[0].arn
  }

  tags = merge(
    var.common_tags,
    tomap({
      Name = "${var.project_name}-https-listener-${var.environment}-${var.name_suffix}"
    })
  )
}
