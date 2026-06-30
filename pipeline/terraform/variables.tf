variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "stack_name" {
  description = "Name of the deployment stack"
  type        = string
}

variable "lambda_memory_size" {
  description = "Memory allocation for Lambda functions (MB)"
  type        = number
  default     = 1024
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 900
}

variable "claude_model" {
  description = "Claude model ID for the agent SDK"
  type        = string
  default     = "us.anthropic.claude-opus-4-6-v1"
}

variable "max_turns" {
  description = "Maximum agent turns"
  type        = number
  default     = 50
}

variable "max_handoff_depth" {
  description = "Maximum agent handoff depth"
  type        = number
  default     = 3
}

variable "session_ttl_minutes" {
  description = "Session TTL in minutes"
  type        = number
  default     = 30
}

variable "thinking_enabled" {
  description = "Enable extended thinking for Claude"
  type        = bool
  default     = false
}

variable "thinking_budget" {
  description = "Token budget for extended thinking"
  type        = number
  default     = 10000
}

variable "cors_allowed_origins" {
  description = "Allowed CORS origins for the backend API (Vercel frontend domains)"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:35428"]
}
