resource "aws_apigatewayv2_api" "app" {
  name          = "${var.stack_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins     = ["*"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    allow_headers     = ["Content-Type", "Authorization", "X-Requested-With"]
    expose_headers    = ["Content-Type"]
    allow_credentials = false
    max_age           = 3600
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.app.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "backend" {
  api_id                 = aws_apigatewayv2_api.app.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "backend_api" {
  api_id    = aws_apigatewayv2_api.app.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_lambda_permission" "apigw_backend" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.app.execution_arn}/*/*"
}
