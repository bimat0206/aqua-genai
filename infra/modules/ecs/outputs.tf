output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.this.id
}

output "cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.this.arn
}

output "service_id" {
  description = "The ID of the ECS service"
  value       = aws_ecs_service.this.id
}

output "service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "The ARN of the task definition"
  value       = aws_ecs_task_definition.this.arn
}

output "task_execution_role_arn" {
  description = "The ARN of the task execution role"
  value       = var.task_execution_role_arn != "" ? var.task_execution_role_arn : aws_iam_role.task_execution_role[0].arn
}

output "task_role_arn" {
  description = "The ARN of the task role"
  value       = var.task_role_arn != "" ? var.task_role_arn : (var.task_role_arn == "" ? aws_iam_role.task_role[0].arn : null)
}

output "lb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = var.enable_load_balancer ? aws_lb.this[0].dns_name : null
}

output "lb_zone_id" {
  description = "The canonical hosted zone ID of the load balancer"
  value       = var.enable_load_balancer ? aws_lb.this[0].zone_id : null
}

output "lb_arn" {
  description = "The ARN of the load balancer"
  value       = var.enable_load_balancer ? aws_lb.this[0].arn : null
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = var.enable_load_balancer ? aws_lb_target_group.this[0].arn : null
}

output "security_group_lb_id" {
  description = "The ID of the load balancer security group"
  value       = var.enable_load_balancer && length(var.lb_security_group_ids) == 0 ? aws_security_group.lb[0].id : null
}

output "security_group_task_id" {
  description = "The ID of the task security group"
  value       = length(var.task_security_group_ids) == 0 ? aws_security_group.task[0].id : null
}

output "application_url" {
  description = "The URL of the application"
  value       = var.enable_load_balancer ? (var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.this[0].dns_name}") : null
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.arn
}

output "autoscaling_target_resource_id" {
  description = "Resource ID of the autoscaling target"
  value       = var.enable_auto_scaling ? aws_appautoscaling_target.ecs_target[0].resource_id : null
}

output "cpu_autoscaling_policy_arn" {
  description = "ARN of the CPU autoscaling policy"
  value       = var.enable_auto_scaling ? aws_appautoscaling_policy.ecs_policy_cpu[0].arn : null
}

output "memory_autoscaling_policy_arn" {
  description = "ARN of the memory autoscaling policy"
  value       = var.enable_auto_scaling ? aws_appautoscaling_policy.ecs_policy_memory[0].arn : null
}
