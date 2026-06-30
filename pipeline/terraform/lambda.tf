resource "aws_lambda_function" "backend" {
  function_name = "${var.stack_name}-backend"
  role          = aws_iam_role.lambda_execution.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  environment {
    variables = {
      CLAUDE_CODE_USE_BEDROCK = "1"
      AWS_REGION_OVERRIDE     = var.aws_region
      CLAUDE_MODEL            = var.claude_model
      MAX_TURNS               = tostring(var.max_turns)
      MAX_HANDOFF_DEPTH       = tostring(var.max_handoff_depth)
      SESSION_TTL_MINUTES     = tostring(var.session_ttl_minutes)
      THINKING_ENABLED        = tostring(var.thinking_enabled)
      THINKING_BUDGET         = tostring(var.thinking_budget)
      API_HOST                = "0.0.0.0"
      API_PORT                = "8080"
      ENVIRONMENT             = var.environment
      API_CORS_ORIGINS        = join(",", var.cors_allowed_origins)
    }
  }

  tags = {
    Name = "${var.stack_name}-backend"
  }
}
