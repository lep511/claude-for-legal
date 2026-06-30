environment    = "prod"
stack_name     = "legal-agents-prod"
aws_region     = "us-west-2"

lambda_memory_size  = 1024
lambda_timeout      = 900
claude_model        = "us.anthropic.claude-opus-4-6-v1"
max_turns           = 50
max_handoff_depth   = 3
session_ttl_minutes = 30
thinking_enabled    = false
thinking_budget     = 10000

cors_allowed_origins = [
  "https://claude-for-legal.vercel.app"
]
