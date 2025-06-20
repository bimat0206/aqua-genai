resource "aws_secretsmanager_secret" "this" {
  name_prefix = "${var.secret_name}-"
  description = var.secret_description
  kms_key_id  = var.kms_key_id

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "this" {
  secret_id     = aws_secretsmanager_secret.this.id
  secret_string = var.secret_value
}

resource "aws_secretsmanager_secret_policy" "this" {
  count      = var.secret_policy != null ? 1 : 0
  secret_arn = aws_secretsmanager_secret.this.arn
  policy     = var.secret_policy
} 