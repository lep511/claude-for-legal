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
    }
  }

  tags = {
    Name = "${var.stack_name}-backend"
  }
}

resource "aws_lambda_function_url" "backend" {
  function_name      = aws_lambda_function.backend.function_name
  authorization_type = "NONE"

  invoke_mode = "RESPONSE_STREAM"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
    max_age       = 86400
  }
}

resource "aws_lambda_function" "frontend" {
  function_name = "${var.stack_name}-frontend"
  role          = aws_iam_role.lambda_execution.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.frontend.repository_url}:latest"
  memory_size   = var.lambda_memory_size
  timeout       = 30

  environment {
    variables = {
      PYTHON_BACKEND_URL = aws_lambda_function_url.backend.function_url
      NODE_ENV           = "production"
      PORT               = "8080"
    }
  }

  tags = {
    Name = "${var.stack_name}-frontend"
  }
}

resource "aws_lambda_function_url" "frontend" {
  function_name      = aws_lambda_function.frontend.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
    max_age       = 86400
  }
}
