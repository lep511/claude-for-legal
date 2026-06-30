# CI/CD Pipeline

Two-stage deployment pipeline for the Legal Agents platform using GitHub Actions with OIDC authentication.

## Architecture

```
GitHub Actions (OIDC) → AWS ECR → AWS Lambda (Function URLs)
```

- **Dev stage** (`legal-agents-dev`): Deploys on all pushes and PRs
- **Prod stage** (`legal-agents-prod`): Deploys only on pushes to `main`, requires manual approval

## Setup

### 1. Initialize Terraform (local state)

```bash
# Dev environment
./pipeline/scripts/setup.sh dev
cd pipeline/terraform && terraform apply tfplan-dev

# Prod environment
./pipeline/scripts/setup.sh prod
cd pipeline/terraform && terraform apply tfplan-prod
```

### 2. Configure GitHub Repository Secrets

After Terraform creates the OIDC roles, add these secrets to your GitHub repo:

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN_DEV` | IAM role ARN for dev deployments (from Terraform output) |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod deployments (from Terraform output) |

### 3. Configure GitHub Environments

1. Create a `prod` environment in GitHub repo settings
2. Add **required reviewers** for manual approval before prod deploys
3. Create a `dev` environment (no protection rules needed)

## Workflows

| Workflow | Trigger | Environment |
|----------|---------|-------------|
| `deploy-dev.yml` | All pushes and PRs | dev |
| `deploy-prod.yml` | Push to `main` only | prod (manual approval) |

## Terraform State

Uses local state stored in `pipeline/terraform/`. The state files (`*.tfstate`) are gitignored.

## Directory Structure

```
pipeline/
├── terraform/
│   ├── main.tf              # Provider config
│   ├── variables.tf         # Input variables
│   ├── lambda.tf            # Lambda functions + URLs
│   ├── ecr.tf               # ECR repositories
│   ├── iam.tf               # IAM roles (Lambda + OIDC)
│   ├── outputs.tf           # Stack outputs
│   └── environments/
│       ├── dev.tfvars       # Dev configuration
│       └── prod.tfvars      # Prod configuration
├── docker/
│   ├── backend.Dockerfile   # FastAPI backend image
│   └── frontend.Dockerfile  # Next.js frontend image
├── scripts/
│   ├── setup.sh             # Infrastructure setup script
│   ├── lambda_handler.py    # Backend Lambda entry point
│   └── frontend_handler.mjs # Frontend Lambda entry point
└── README.md
```
