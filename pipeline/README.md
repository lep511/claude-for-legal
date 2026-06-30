# CI/CD Pipeline

Split deployment pipeline for the Legal Agents platform:

- **Frontend** (Next.js) → Vercel via Git Integration
- **Backend** (FastAPI) → AWS Lambda via GitHub Actions + OIDC

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                          │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  Vercel Git Integration  │    │  GitHub Actions (OIDC)      │
│  (auto-deploy on push)   │    │  (backend changes only)     │
└────────────┬─────────────┘    └──────────────┬──────────────┘
             │                                 │
             ▼                                 ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  Vercel Edge Network     │    │  AWS ECR → Lambda           │
│  Next.js 16 frontend     │    │  FastAPI + Claude Agent SDK │
└────────────┬─────────────┘    └──────────────┬──────────────┘
             │                                 │
             │  PYTHON_BACKEND_URL (fetch)     │
             └────────────────────────────────►│
                                               │
                                    ┌──────────▼──────────┐
                                    │  API Gateway HTTP   │
                                    │  /api/{proxy+}      │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Amazon Bedrock     │
                                    │  (Claude models)    │
                                    └─────────────────────┘
```

## Backend Setup (AWS)

### 1. Initialize Terraform

```bash
# Dev environment
./pipeline/scripts/setup.sh dev
cd pipeline/terraform && terraform apply tfplan-dev

# Prod environment
./pipeline/scripts/setup.sh prod
cd pipeline/terraform && terraform apply tfplan-prod
```

### 2. Configure GitHub Repository Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN_DEV` | IAM role ARN for dev deployments (from `terraform output github_actions_role_arn`) |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod deployments |

### 3. Configure GitHub Environments

1. Create a `prod` environment with **required reviewers** for manual approval
2. Create a `dev` environment (no protection rules)

## Frontend Setup (Vercel)

### 1. Link Repository

1. Import project in Vercel dashboard
2. Set **Root Directory** to `frontend/`
3. Framework preset: Next.js (auto-detected)

### 2. Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `PYTHON_BACKEND_URL` | `terraform output backend_api_url` | API Gateway invoke URL |

Set this in Vercel project settings → Environment Variables (for Production, Preview, and Development).

### 3. Deployment

Vercel auto-deploys on every push. Preview URLs are generated for PRs.

## Workflows

| Workflow | Trigger | What it deploys |
|----------|---------|-----------------|
| `deploy-dev.yml` | Push/PR with backend file changes | Backend Lambda (dev) |
| `deploy-prod.yml` | Push to `main` with backend file changes | Backend Lambda (prod, manual approval) |
| Vercel Git Integration | Any push | Frontend (auto) |

## CORS

The backend accepts requests from Vercel frontend domains:

- **Explicit origins**: Configured via `cors_allowed_origins` in Terraform tfvars, passed as `API_CORS_ORIGINS` to Lambda
- **Regex fallback**: FastAPI middleware matches `https://*.vercel.app` for preview deployments

## Terraform State

Uses local state stored in `pipeline/terraform/`. State files (`*.tfstate`) are gitignored.

## Directory Structure

```
pipeline/
├── terraform/
│   ├── main.tf              # Provider config
│   ├── variables.tf         # Input variables (incl. cors_allowed_origins)
│   ├── lambda.tf            # Backend Lambda function
│   ├── apigateway.tf        # API Gateway with CORS
│   ├── ecr.tf               # Backend ECR repository
│   ├── iam.tf               # IAM roles (Lambda + OIDC)
│   ├── outputs.tf           # Stack outputs (incl. backend_api_url)
│   └── environments/
│       ├── dev.tfvars       # Dev configuration
│       └── prod.tfvars      # Prod configuration
├── docker/
│   └── backend.Dockerfile   # FastAPI backend image
├── scripts/
│   ├── setup.sh             # Infrastructure setup script
│   └── lambda_handler.py    # Backend Lambda entry point (Mangum)
└── README.md
```
