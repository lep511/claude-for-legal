# Quick Start

Get the legal agents platform running in under 5 minutes.

## Prerequisites

- Python 3.13+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- An Anthropic API key (set as `ANTHROPIC_API_KEY` environment variable)

## 1. Start the backend

```bash
cd claude-for-legal
cp .env.example .env  # edit with your API key
uv run uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

## 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

## 3. Open the app

Navigate to http://localhost:3000/legal

## 4. Configure your agents

Click the **Settings** icon (gear) in the top navigation bar. You'll see all 12 legal agents with their configuration status.

Click any agent to fill in its practice profile:
- Your practice setting (in-house, firm, clinic)
- Your role and escalation contacts
- Practice-specific positions (playbook terms, risk thresholds, jurisdiction)

The more context you provide, the more tailored the agent outputs will be. Agents work without configuration but produce generic output.

## 5. Start using it

Go back to the chat and ask a question. The orchestrator automatically routes your request to the right agent based on the subject matter.

**Example prompts:**
- "Review this vendor agreement" (attach a contract file)
- "Is this NDA acceptable?" (attach NDA)
- "We're terminating an employee in California — what should I check?"
- "Run a privacy impact assessment for our new recommendation engine"
- "Brief this case for me" (attach a case)

## Available agents

| Agent | Practice area |
|---|---|
| commercial-legal | Vendor agreements, NDAs, SaaS contracts, renewals |
| corporate-legal | M&A diligence, board consents, entity compliance |
| employment-legal | Hire/term review, worker classification, leave |
| privacy-legal | DPA, DSAR, PIA, privacy triage |
| product-legal | Launch review, marketing claims |
| regulatory-legal | Regulatory feeds, policy gaps, NPRM comments |
| ai-governance-legal | AI use-case triage, impact assessments, vendor AI |
| ip-legal | Trademark clearance, FTO, C&D, DMCA, OSS |
| litigation-legal | Matters, holds, demands, claim charts, depo prep |
| legal-clinic | Clinic intake, deadlines, memos, handoffs |
| law-student | Socratic drill, IRAC, bar prep, flashcards |
| legal-builder-hub | Community skill discovery |

## File uploads

Drag-and-drop or click the upload button to send contracts, filings, and other documents. Supported: CSV, DOCX, XLS, XLSX, MD, PDF.

## Skills (workflows)

Each agent has specialized workflows available as API endpoints. In the chat, the agent will use these automatically when relevant. You can also invoke them directly via the API:

```
GET  /api/agents/{slug}/skills          # list available workflows
POST /api/agents/{slug}/skills/{name}   # execute a workflow
```
