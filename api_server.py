"""FastAPI server wrapping the multi-agent legal platform.

Usage:
    uv run uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import json
import mimetypes
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Agent SDK uses permission_mode="bypassPermissions" in options — no env var needed

_agent_venv = Path(__file__).resolve().parent / ".agent_venv" / "bin"
if _agent_venv.exists():
    os.environ["PATH"] = str(_agent_venv) + os.pathsep + os.environ.get("PATH", "")
    os.environ["VIRTUAL_ENV"] = str(_agent_venv.parent)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from api_handlers import (
    AGENTS, SENTINEL, registry, run_agent_turn,
)
from session_manager import Session, OUT_DIR


CORS_ORIGINS = os.getenv("API_CORS_ORIGINS", "http://localhost:35428").split(",")
HEARTBEAT_INTERVAL = 15


@asynccontextmanager
async def lifespan(app: FastAPI):
    eviction_task = asyncio.create_task(_eviction_loop())
    yield
    eviction_task.cancel()


app = FastAPI(title="Legal Agents API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _eviction_loop():
    while True:
        await asyncio.sleep(300)
        await registry.evict_stale()


# --- Models ---

class CreateSessionRequest(BaseModel):
    name: str | None = None


class ChatRequest(BaseModel):
    session_id: str
    message: str
    accept_edit: bool = True


# --- Endpoints ---

@app.get("/api/health")
async def health():
    return {"status": "ok", "agents": len(AGENTS)}


@app.get("/api/agents")
async def list_agents():
    return [
        {"slug": slug, "description": info["description"]}
        for slug, info in AGENTS.items()
    ]


@app.post("/api/sessions")
async def create_session(body: CreateSessionRequest | None = None):
    session = Session()
    if body and body.name:
        session.name = body.name
    session.save()
    return {
        "session_id": session.id,
        "created_at": session.created_at,
        "sandbox_dir": session.sandbox_dir,
        "output_dir": session.output_dir,
    }


@app.get("/api/sessions")
async def list_sessions():
    return Session.list_sessions()


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    try:
        session = Session.load(session_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")

    charts = []
    out_dir = os.path.join(OUT_DIR, session_id)
    if os.path.isdir(out_dir):
        for fname in sorted(os.listdir(out_dir)):
            if fname.endswith(".chart.json"):
                fpath = os.path.join(out_dir, fname)
                try:
                    with open(fpath, "r") as f:
                        charts.append(json.loads(f.read()))
                except (json.JSONDecodeError, IOError):
                    pass

    return {
        "session_id": session.id,
        "created_at": session.created_at,
        "name": session.name,
        "agents_used": session.agents_used,
        "turns": session.turns,
        "output_dir": session.output_dir,
        "charts": charts,
    }


@app.get("/api/sessions/{session_id}/status")
async def session_status(session_id: str):
    async with registry._lock:
        state = registry._sessions.get(session_id)
    if not state:
        return {"session_id": session_id, "is_busy": False}
    is_busy = state.lock.locked()
    return {"session_id": session_id, "is_busy": is_busy}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        Session.load(session_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    Session.delete(session_id)
    return {"status": "deleted", "session_id": session_id}


class RenameRequest(BaseModel):
    name: str


@app.patch("/api/sessions/{session_id}")
async def rename_session(session_id: str, body: RenameRequest):
    try:
        session = Session.load(session_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    session.rename(body.name)
    return {"session_id": session.id, "name": session.name}


@app.post("/api/sessions/{session_id}/upload")
async def upload_file(session_id: str, file: UploadFile = File(...)):
    try:
        state = await registry.load_existing(session_id)
    except FileNotFoundError:
        state = await registry.get_or_create(session_id)

    sandbox = state.session.sandbox_dir
    os.makedirs(sandbox, exist_ok=True)
    dest = os.path.join(sandbox, file.filename)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    return {"filename": file.filename, "path": dest, "size": len(content)}


@app.get("/api/sessions/{session_id}/files")
async def list_output_files(session_id: str):
    out_dir = os.path.join(OUT_DIR, session_id)
    if not os.path.isdir(out_dir):
        return []
    files = []
    for fname in os.listdir(out_dir):
        if fname.endswith(".chart.json"):
            continue
        fpath = os.path.join(out_dir, fname)
        if os.path.isfile(fpath):
            files.append({
                "filename": fname,
                "size": os.path.getsize(fpath),
                "path": f"sandbox/out/{session_id}/{fname}",
            })
    return files


@app.get("/api/sessions/{session_id}/files/{filename}")
async def download_file(session_id: str, filename: str):
    out_dir = os.path.join(OUT_DIR, session_id)
    fpath = os.path.join(out_dir, filename)
    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="File not found")
    media_type = mimetypes.guess_type(fpath)[0] or "application/octet-stream"
    return FileResponse(fpath, filename=filename, media_type=media_type)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id

    try:
        state = await registry.load_existing(session_id)
    except FileNotFoundError:
        state = await registry.get_or_create(session_id)

    if state.lock.locked():
        raise HTTPException(status_code=409, detail="Session is busy processing another message")

    async def event_stream():
        queue: asyncio.Queue = asyncio.Queue()

        async with state.lock:
            agent_task = asyncio.create_task(
                run_agent_turn(state, request.message, queue, request.accept_edit)
            )

            last_heartbeat = time.time()

            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=0.1)
                except asyncio.TimeoutError:
                    if time.time() - last_heartbeat > HEARTBEAT_INTERVAL:
                        yield _sse_format("heartbeat", {})
                        last_heartbeat = time.time()
                    if agent_task.done():
                        exc = agent_task.exception()
                        if exc:
                            yield _sse_format("error", {"message": str(exc), "type": type(exc).__name__})
                        break
                    continue

                if item is SENTINEL:
                    break

                yield _sse_format(item["event"], item["data"])
                last_heartbeat = time.time()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })


def _sse_format(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
