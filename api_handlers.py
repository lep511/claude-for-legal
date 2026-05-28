"""Async SSE callback handlers and session state management for the API server.

Uses Anthropic Agent SDK query() for non-blocking agent invocations with streaming.
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass, field

from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    ResultMessage,
    StreamEvent,
)
from claude_agent_sdk.types import TextBlock, ToolUseBlock

from agents import (
    ai_governance_legal, commercial_legal, corporate_legal,
    employment_legal, ip_legal, law_student, legal_builder_hub,
    legal_clinic, litigation_legal, privacy_legal, product_legal,
    regulatory_legal,
)
from agents._orchestrator.agent import create_options as create_orchestrator_options
from sdk_tools.routing import get_last_route, get_pending_handoff, clear_last_route, clear_pending_handoff
from agents._common import MAX_HANDOFF_DEPTH
from session_manager import Session


AGENTS = {
    "commercial-legal": {
        "module": commercial_legal,
        "description": "Reviews contracts against playbook, tracks renewals, routes escalations",
    },
    "privacy-legal": {
        "module": privacy_legal,
        "description": "PIAs, DPA reviews, DSAR responses, policy monitoring",
    },
    "product-legal": {
        "module": product_legal,
        "description": "Launch reviews, marketing copy review, risk triage",
    },
    "corporate-legal": {
        "module": corporate_legal,
        "description": "M&A diligence, board minutes, entity compliance",
    },
    "employment-legal": {
        "module": employment_legal,
        "description": "Hire/termination review, worker classification, investigations",
    },
    "regulatory-legal": {
        "module": regulatory_legal,
        "description": "Reg monitoring, gap analysis, comment tracking, compliance digests",
    },
    "ai-governance-legal": {
        "module": ai_governance_legal,
        "description": "AI use-case triage, impact assessments, vendor AI review",
    },
    "litigation-legal": {
        "module": litigation_legal,
        "description": "Matter management, claim charts, chronologies, brief drafting",
    },
    "ip-legal": {
        "module": ip_legal,
        "description": "Trademark clearance, FTO triage, invention intake, OSS compliance",
    },
    "law-student": {
        "module": law_student,
        "description": "Socratic drilling, case briefs, outlines, bar prep",
    },
    "legal-clinic": {
        "module": legal_clinic,
        "description": "Clinic intake, student supervision, deadline tracking",
    },
    "legal-builder-hub": {
        "module": legal_builder_hub,
        "description": "Finds, evaluates, installs community legal skills",
    },
}

SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", "30"))

SENTINEL = object()


def _process_assistant_message(msg: AssistantMessage, queue: asyncio.Queue, source: str, state: dict):
    """Process an AssistantMessage and push SSE events to the queue."""
    for block in msg.content:
        if isinstance(block, TextBlock):
            state["last_response"] += block.text
            queue.put_nowait({"event": "text", "data": {"content": block.text, "source": source, "complete": False}})
        elif isinstance(block, ToolUseBlock):
            state["tool_count"] += 1
            queue.put_nowait({"event": "tool_start", "data": {"tool_name": block.name, "count": state["tool_count"]}})
            queue.put_nowait({"event": "tool_end", "data": {"tool_name": block.name}})


def _process_stream_event(event: StreamEvent, queue: asyncio.Queue, source: str, state: dict):
    """Process a StreamEvent (partial message) and push SSE events."""
    raw = event.event
    if not isinstance(raw, dict):
        return

    # Text content delta
    delta = raw.get("contentBlockDelta", {}).get("delta", {})
    if delta.get("type") == "text_delta" and delta.get("text"):
        text = delta["text"]
        state["last_response"] += text
        queue.put_nowait({"event": "text", "data": {"content": text, "source": source, "complete": False}})

    # Thinking/reasoning delta
    if delta.get("type") == "thinking_delta" and delta.get("thinking"):
        queue.put_nowait({"event": "reasoning", "data": {"content": delta["thinking"]}})

    # Tool use start
    tool_use = raw.get("contentBlockStart", {}).get("contentBlock", {})
    if tool_use.get("type") == "tool_use":
        state["tool_count"] += 1
        state["current_tool"] = tool_use.get("name", "unknown")
        state["input_buffer"] = ""
        queue.put_nowait({"event": "tool_start", "data": {"tool_name": state["current_tool"], "count": state["tool_count"]}})

    # Tool use input delta
    if delta.get("type") == "input_json_delta" and delta.get("partial_json"):
        state["input_buffer"] += delta["partial_json"]

    # Content block stop (tool end)
    if raw.get("contentBlockStop") is not None and state["current_tool"]:
        label = state["current_tool"]
        queue.put_nowait({"event": "tool_end", "data": {"tool_name": label}})
        state["current_tool"] = None
        state["input_buffer"] = ""


def _new_stream_state() -> dict:
    """Create a fresh mutable state dict for stream event processing."""
    return {
        "current_tool": None,
        "input_buffer": "",
        "tool_count": 0,
        "last_response": "",
    }


@dataclass
class SessionState:
    """In-memory state for an active session."""
    session: Session
    orch_options: ClaudeAgentOptions
    orchestrator: ClaudeSDKClient | None = None
    active_slug: str | None = None
    last_access: float = field(default_factory=time.time)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _orch_fresh: bool = field(default=False, repr=False)

    async def get_orchestrator(self) -> ClaudeSDKClient:
        """Get or create the persistent orchestrator client."""
        if self.orchestrator is None:
            self.orchestrator = ClaudeSDKClient(options=self.orch_options)
            await self.orchestrator.connect()
            self._orch_fresh = True
        else:
            self._orch_fresh = False
        return self.orchestrator


class SessionRegistry:
    """Manages in-memory session state with TTL eviction."""

    def __init__(self):
        self._sessions: dict[str, SessionState] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(self, session_id: str) -> SessionState:
        async with self._lock:
            if session_id in self._sessions:
                state = self._sessions[session_id]
                state.last_access = time.time()
                return state

            session = Session(session_id=session_id)
            orch_options = create_orchestrator_options(session_id)
            orch_options.include_partial_messages = True
            state = SessionState(session=session, orch_options=orch_options)
            self._sessions[session_id] = state
            return state

    async def load_existing(self, session_id: str) -> SessionState:
        async with self._lock:
            if session_id in self._sessions:
                state = self._sessions[session_id]
                state.last_access = time.time()
                return state

            session = Session.load(session_id)
            orch_options = create_orchestrator_options(session_id)
            orch_options.include_partial_messages = True

            # Restore active_slug from last agent turn
            last_agent_turn = next(
                (t for t in reversed(session.turns) if t.get("agent")),
                None,
            )
            active_slug = last_agent_turn["agent"] if last_agent_turn else None

            state = SessionState(
                session=session,
                orch_options=orch_options,
                active_slug=active_slug,
            )
            self._sessions[session_id] = state
            return state

    async def evict_stale(self):
        cutoff = time.time() - (SESSION_TTL_MINUTES * 60)
        async with self._lock:
            stale = [sid for sid, s in self._sessions.items() if s.last_access < cutoff]
            for sid in stale:
                del self._sessions[sid]


registry = SessionRegistry()


def _build_conversation_history(session: Session, max_chars: int = 4000) -> str:
    """Build a condensed conversation history from session turns.

    Includes user messages and agent responses (truncated) to give the
    orchestrator context when resuming a session with a fresh subprocess.
    """
    # Exclude the current (just-added) user turn — it's sent as the main message
    turns = session.turns[:-1] if session.turns else []
    if not turns:
        return ""

    lines = []
    total = 0
    for turn in turns:
        role = turn["role"]
        content = turn["content"]
        agent = turn.get("agent")

        if role == "user":
            line = f"User: {content[:300]}"
        elif role == "agent" and agent:
            line = f"Agent ({agent}): {content[:400]}"
        elif role == "orchestrator":
            line = f"Orchestrator: {content[:200]}"
        else:
            continue

        if total + len(line) > max_chars:
            break
        lines.append(line)
        total += len(line)

    if not lines:
        return ""

    return (
        "[CONVERSATION HISTORY — this is a resumed session. "
        "Previous exchanges:\n"
        + "\n".join(lines)
        + "\n--- end of history ---]\n\n"
    )


async def run_agent_turn(session_state: SessionState, message: str, queue: asyncio.Queue, accept_edit: bool = True):
    """Execute an agent turn asynchronously using Agent SDK query().

    Streams events from orchestrator and specialized agents,
    pushing SSE events to the asyncio queue.
    """
    try:
        clear_last_route()
        clear_pending_handoff()

        session = session_state.session
        session.add_turn("user", message)

        # --- Orchestrator phase ---
        orch_state = _new_stream_state()
        orch_message = message

        if session_state.active_slug:
            last_agent_turn = next(
                (t for t in reversed(session.turns) if t.get("agent")),
                None,
            )
            if last_agent_turn:
                summary = last_agent_turn["content"][:500]
                orch_message = (
                    f"[CONTEXT: Last agent used was '{session_state.active_slug}'. "
                    f"Its response: {summary}]\n\n{message}"
                )

        if not accept_edit:
            orch_message = f"{orch_message}\n\n[SYSTEM: auto-execute is OFF. Present your plan and ask the user to confirm before calling route_to_agent.]"

        try:
            orchestrator = await session_state.get_orchestrator()

            if session_state._orch_fresh and len(session.turns) > 1:
                history = _build_conversation_history(session)
                if history:
                    orch_message = history + orch_message

            await orchestrator.query(orch_message)
            async for msg in orchestrator.receive_response():
                if isinstance(msg, StreamEvent):
                    _process_stream_event(msg, queue, "orchestrator", orch_state)
                elif isinstance(msg, AssistantMessage):
                    _process_assistant_message(msg, queue, "orchestrator", orch_state)
                elif isinstance(msg, ResultMessage):
                    pass
        except Exception as e:
            await queue.put({"event": "error", "data": {"message": str(e), "type": type(e).__name__}})
            return

        if orch_state["last_response"]:
            session.add_turn("orchestrator", orch_state["last_response"])

        # --- Check routing decision ---
        routed = get_last_route()
        if not routed:
            await queue.put({"event": "complete", "data": {
                "session_id": session.id,
                "name": session.name,
                "agents_used": session.agents_used,
            }})
            return

        slug = routed["agent_slug"]
        task = routed["task"]

        session.set_name(routed.get("title") or task)

        if slug not in AGENTS:
            await queue.put({"event": "error", "data": {"message": f"Unknown agent: {slug}", "type": "RoutingError"}})
            return

        await queue.put({"event": "route", "data": {
            "agent_slug": slug,
            "description": AGENTS[slug]["description"],
        }})

        # --- Specialized agent phase (with handoff loop) ---
        handoff_depth = 0
        while True:
            session_state.active_slug = slug
            info = AGENTS[slug]

            try:
                agent_options = info["module"].create_options(session.id)
                agent_options_streaming = ClaudeAgentOptions(
                    **{
                        k: v for k, v in agent_options.__dict__.items()
                        if k != "include_partial_messages"
                    },
                    include_partial_messages=True,
                )
            except Exception as e:
                await queue.put({"event": "error", "data": {"message": f"Failed to create agent '{slug}': {e}", "type": "AgentCreationError"}})
                return

            agent_state = _new_stream_state()
            task_with_session = f"{task}\n\nWrite all output files to: {session.output_dir}/"

            try:
                async for msg in query(prompt=task_with_session, options=agent_options_streaming):
                    if isinstance(msg, StreamEvent):
                        _process_stream_event(msg, queue, "agent", agent_state)
                    elif isinstance(msg, AssistantMessage):
                        _process_assistant_message(msg, queue, "agent", agent_state)
                    elif isinstance(msg, ResultMessage):
                        pass
            except Exception as e:
                await queue.put({"event": "error", "data": {"message": str(e), "type": type(e).__name__}})
                return

            if agent_state["last_response"]:
                session.add_turn("agent", agent_state["last_response"], agent=slug)

            _emit_output_files(session, queue)

            # Check for handoff
            handoff = get_pending_handoff()
            clear_pending_handoff()
            if not handoff:
                break

            handoff_depth += 1
            if handoff_depth >= MAX_HANDOFF_DEPTH:
                await queue.put({"event": "text", "data": {
                    "content": f"\n[Handoff limit reached ({MAX_HANDOFF_DEPTH})]",
                    "source": "system", "complete": True,
                }})
                break

            target = handoff["target_agent"]
            if target not in AGENTS:
                await queue.put({"event": "error", "data": {"message": f"Unknown handoff target: {target}", "type": "HandoffError"}})
                break

            await queue.put({"event": "handoff", "data": {
                "from_agent": slug,
                "to_agent": target,
                "reason": handoff["reason"],
            }})
            slug = target
            task = handoff["task"]

        await queue.put({"event": "complete", "data": {
            "session_id": session.id,
            "name": session.name,
            "agents_used": session.agents_used,
        }})

    except Exception as e:
        await queue.put({"event": "error", "data": {"message": str(e), "type": type(e).__name__}})
    finally:
        await queue.put(SENTINEL)


def _emit_output_files(session: Session, queue: asyncio.Queue):
    """Check for new files in the output dir and emit events."""
    out_dir = session.output_dir
    if not os.path.isdir(out_dir):
        return
    for fname in os.listdir(out_dir):
        fpath = os.path.join(out_dir, fname)
        if not os.path.isfile(fpath):
            continue
        if fname.endswith(".chart.json"):
            try:
                with open(fpath, "r") as f:
                    chart_data = json.loads(f.read())
                queue.put_nowait({"event": "chart_data", "data": chart_data})
            except (json.JSONDecodeError, IOError):
                queue.put_nowait({"event": "file_output", "data": {
                    "filename": fname,
                    "path": f"sandbox/out/{session.id}/{fname}",
                }})
        else:
            queue.put_nowait({"event": "file_output", "data": {
                "filename": fname,
                "path": f"sandbox/out/{session.id}/{fname}",
            }})
