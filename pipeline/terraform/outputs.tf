output "app_url" {
  description = "Public application URL (API Gateway)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "backend_api_url" {
  description = "Backend API URL - set as PYTHON_BACKEND_URL in Vercel"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}

output "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution.arn
}
