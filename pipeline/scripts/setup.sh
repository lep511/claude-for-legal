#!/usr/bin/env bash
set -euo pipefail

# Setup script for initializing the CI/CD pipeline infrastructure.
# Uses Terraform workspaces (dev/prod) with local state.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

usage() {
  echo "Usage: $0 <environment>"
  echo "  environment: dev or prod"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

ENVIRONMENT="$1"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Error: environment must be 'dev' or 'prod'"
  usage
fi

TFVARS_FILE="$TERRAFORM_DIR/environments/${ENVIRONMENT}.tfvars"

if [[ ! -f "$TFVARS_FILE" ]]; then
  echo "Error: tfvars file not found at $TFVARS_FILE"
  exit 1
fi

echo "=== Initializing Terraform ==="
cd "$TERRAFORM_DIR"
terraform init

echo "=== Selecting workspace: $ENVIRONMENT ==="
terraform workspace select "$ENVIRONMENT" 2>/dev/null || terraform workspace new "$ENVIRONMENT"

echo "=== Planning $ENVIRONMENT deployment ==="
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="tfplan-${ENVIRONMENT}"

echo ""
echo "Review the plan above. To apply:"
echo "  cd $TERRAFORM_DIR && terraform workspace select $ENVIRONMENT && terraform apply tfplan-${ENVIRONMENT}"
