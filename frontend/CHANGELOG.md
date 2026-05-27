# Changelog

## [0.4.1] - 2026-05-17

### Fixed

- **Session-not-found "Close" button loops back to deleted session**: When the backend deletes the current session and the user refreshes, clicking "Close" no longer attempts to fetch the (possibly unavailable) session list. Instead it directly creates a new session, preserving the previous session's name when possible.
- **502 error on Close click**: The `handleClose` handler now has proper error handling — if creating a session with the saved name fails, it falls back to a plain new session; if that also fails, it redirects to `/finance` which has its own retry logic.

### Changed

- **Session creation supports optional name**: `POST /api/sessions` (both backend and frontend proxy) now accepts an optional `name` field in the JSON body, allowing pre-named session creation without a separate rename step.
- **Session name cached in sessionStorage**: When a session is loaded, its name is stored in `sessionStorage` so it can be recovered even after the backend-side session is deleted.

---

## [0.4.0] - 2026-05-17

### Added

- **Session persistence via cookies**: The active session ID is stored in a cookie so refreshing the browser restores the current session instead of creating a new one. Uses Next.js `cookies()` from `next/headers` for server-side reads and a Route Handler (`/api/session-cookie`) for writes.
- **Cookie consent banner**: A non-intrusive banner prompts the user to accept cookies before any session cookie is stored. Consent is stored in a `cookie-consent` cookie (1 year expiry). Session cookies are only set after consent is granted.
- **Server-side session redirect**: The `/finance` page is now a Server Component that reads the cookie and validates the session exists on the backend before redirecting — providing an instant redirect with no loading screen flash on refresh.
- **Session cleanup tool** (`tools/clean_empty_sessions.py`): Deletes sessions with no conversation history (`turns: []`), lists remaining sessions with names, and removes orphaned `sandbox/{id}/` and `sandbox/out/{id}/` directories that have no matching session JSON file.

### Changed

- **`/finance/page.tsx` split into Server + Client components**: The page is now a thin server component that checks the cookie and redirects. The loading/retry UI is extracted into `FinanceRedirect.tsx` (client component), only rendered when no valid cookie exists.
- **Session verification on refresh**: The `[sessionId]` page now verifies the session exists on the backend before marking it as verified, preventing false "Session not found" errors for valid sessions.

### Fixed

- **New session not persisted to disk**: `POST /api/sessions` was creating the Session object (directories) but not calling `session.save()`, so the JSON metadata file was never written. Subsequent `GET /api/sessions/{id}` returned 404. Now `session.save()` is called immediately on creation.
- **Browser refresh creating duplicate sessions**: Without persistent storage, refreshing always fell through to session list/creation logic. The cookie now preserves the active session across refreshes.
- **Server Actions CSRF error with dev tunnels**: Replaced Server Actions (`"use server"`) with a Route Handler (`/api/session-cookie`) to avoid the `x-forwarded-host` / `origin` mismatch that blocks Server Actions when using dev tunnels.

---

## [0.3.0] - 2026-05-16

### Added

- **Newest-first visualization order**: Charts and tables now render with the most recent at the top. The panel auto-scrolls to the newest visualization when it appears.

### Fixed

- **Double session creation on "New" click**: Clicking "New" no longer creates two sessions. Added creation guard in `useSession`, `initRef` guard in the redirect page, and sessionStorage-based validation to prevent redundant `POST /api/sessions` calls.
- **Orchestrator message disappearing**: The orchestrator's routing message (e.g., "He enviado tu solicitud al agente...") no longer vanishes after the stream completes. The `cleanAgentContent` utility now preserves the orchestrator's text section when a visualization is attached, only filtering the agent's verbose output.

### Removed

- Unused imports and variables (`ChartData`, `currentAgent`, `toolsUsed`, `outputFiles`, `error`) cleaned up from the session page.
- Deprecated `React.FormEvent<HTMLFormElement>` replaced with `React.SyntheticEvent<HTMLFormElement>`.

---

## [0.2.0] - 2026-05-12

### Added

- **Session busy-state detection**: On page load/refresh, the frontend queries the backend's new `GET /api/sessions/{id}/status` endpoint to check if the session's agent is still processing. If busy, the input is disabled with "Agent is working..." placeholder and the stop button is shown.
- **Interrupted session indicator**: When loading a session whose last turn is from the user (no agent response), a system message is shown: "This session was interrupted. You can continue the conversation below."
- **Date awareness**: All agents (orchestrator + specialized) now receive today's date in their system prompt, injected dynamically via `date.today().isoformat()`.

### Fixed

- **Session controls blocked after refresh**: Refreshing the page while an agent was working previously made the "New" button and session history dropdown non-functional. Fixed by removing the `messages.length === 0` guard on new session creation and resetting `loadedSessionRef` on resume/new actions.
- **Incomplete session history rendering**: Sessions that didn't complete properly (agent crash, timeout, page close) rendered duplicate orchestrator messages and empty bubbles. Now orchestrator turns followed by an agent turn are suppressed, and empty/whitespace-only turns are filtered out.
- **Streaming narration in restored messages**: Agent responses in history contained raw internal narration ("Now let me...", "Let me also...") from mid-stream tool-use. Added regex-based cleanup in `cleanAgentContent` to strip these lines.
- **Bedrock read timeout**: Long-running agents (especially `model-builder`) hit the default 120s HTTP read timeout. Increased to 300s (configurable via `STRANDS_READ_TIMEOUT` env var).

---

## [0.1.0] - 2026-05-10

### Added

- **Session-based URL routing**: Each session now has its own URL (`/finance/<session_id>`). Sessions are shareable and bookmarkable.
- **Table visualization in output panel**: Markdown tables from agent responses are automatically extracted and rendered in the right-side visualization panel using `react-markdown` + `remark-gfm`.
- **Table extraction utility** (`utils/extractTables.ts`): Parses GFM tables from markdown content, skipping code blocks, with optional heading capture as table title.
- **TableRenderer component** (`components/TableRenderer.tsx`): Renders extracted tables with styled prose formatting inside a Card layout.
- **Unified visualizations panel**: Charts and tables coexist in the same snap-scroll container with shared pagination dots.
- **Session validation**: Invalid URLs (e.g., `/finance/1`, `/finance/random`) are automatically redirected to `/finance` to create a valid session.
- **File path stripping** (`utils/stripFilePaths.ts`): Removes internal server file paths from agent responses before displaying to the user.
- **Agent narration filtering** (`utils/cleanAgentContent.ts`): When a message contains a visualization (chart or table), internal reasoning/narration text is filtered out, keeping only structured content (headings, lists, tables, bold text).

### Improved

- **Error handling in API route** (`app/api/agents/chat/route.ts`): Added 5-minute timeout (`AbortSignal.timeout`), `maxDuration = 300` for serverless, and descriptive error messages for timeout (504) and connection failure (502).
- **Error messages in SSE stream** (`hooks/useAgentStream.ts`): Empty error bodies now show informative messages instead of bare "Error:". Network errors display connection guidance. Backend SSE error events with empty messages show a fallback description.
- **New session button behavior**: Pressing "New" on an already-empty session no longer creates a redundant session.
- **Session restoration**: Navigating to a session URL with existing history now correctly loads previous messages, charts, and tables.
- **Race condition prevention**: Rapid session switching no longer causes stale data from a previous fetch to overwrite the current session's messages.

### Fixed

- **Blank "Error:" message**: When the backend took too long or returned an empty error body, the frontend displayed just "Error:" with no explanation. Now shows contextual messages.
- **404 spam in logs**: New sessions no longer trigger unnecessary GET requests to the backend before any interaction has occurred.
- **Session URL persistence**: Copying and pasting a session URL now correctly restores the chat history instead of showing an empty session.

---

## [0.0.5] - 2026-05-09

### Added

- **AI-ready project setup (Next.js 16.2)**: Generated `AGENTS.md` via `@next/codemod agents-md` with bundled docs index in `.next-docs/`. AI agents now have version-matched Next.js documentation available.
- **Frontend CLAUDE.md**: Project-specific instructions for Claude Code covering stack, architecture, hooks, components, and SSE event conventions.
- **Session names**: Sessions are automatically named based on the orchestrator's routed task description (e.g., "Build DCF model for AAPL"). Names appear in the history dropdown and session badge instead of hex IDs.
- **Session name tooltip**: Hovering over truncated session names (badge or history dropdown) shows the full name via native tooltip.

### Improved

- **Chart restoration on session resume**: Reopening a session with charts now renders the visualization instead of showing the raw `.chart.json` filename. Backend parses chart files from disk and returns them in the session detail endpoint.
- **Session switching reliability**: Switching between sessions now immediately clears messages, files, chart index, and upload state before fetching new data, preventing stale content from the previous session.
- **Conversation history on resume**: Restored sessions now pre-load the full conversation history into the orchestrator agent, giving it context from prior turns.
- **Layout metadata**: Updated from generic "Create Next App" to "Financial Data Platform".

### Fixed

- **Stale UI on session switch**: Rapidly switching between sessions no longer shows messages or files from the previous session while the new one loads.
