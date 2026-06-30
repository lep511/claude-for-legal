output "backend_url" {
  description = "Backend Lambda Function URL (internal, via CloudFront)"
  value       = aws_lambda_function_url.backend.function_url
}

output "frontend_url" {
  description = "Frontend Lambda Function URL (internal, via CloudFront)"
  value       = aws_lambda_function_url.frontend.function_url
}

output "app_url" {
  description = "Public application URL (CloudFront)"
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}

output "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution.arn
}
