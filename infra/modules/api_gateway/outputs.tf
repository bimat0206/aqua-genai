output "api_id" {
  description = "The ID of the API Gateway"
  value       = aws_api_gateway_rest_api.this.id
}

output "api_endpoint" {
  description = "The endpoint URL of the API Gateway"
  value       = "${aws_api_gateway_deployment.this.invoke_url}${aws_api_gateway_stage.this.stage_name}/validate"
}

output "api_key" {
  description = "The API key for accessing the API Gateway"
  value       = var.use_api_key ? aws_api_gateway_api_key.this[0].value : null
  sensitive   = true
}

output "root_resource_id" {
  description = "The ID of the root resource of the API Gateway"
  value       = aws_api_gateway_rest_api.this.root_resource_id
}
