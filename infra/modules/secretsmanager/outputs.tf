output "secret_name" {
  description = "The name of the secret"
  value       = aws_secretsmanager_secret.secret.name
}

output "secret_arn" {
  description = "The ARN of the secret"
  value       = aws_secretsmanager_secret.secret.arn
}

output "secret_id" {
  description = "The ID of the secret"
  value       = aws_secretsmanager_secret.secret.id
}

output "secret_version_id" {
  description = "The version ID of the secret"
  value       = aws_secretsmanager_secret_version.secret_version.version_id
} 