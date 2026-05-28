"""Session management for the multi-agent platform.

Each run gets a unique session ID. Session data is persisted to sandbox/sessions/{id}.json
and agent deliverables go to sandbox/out/{id}/.
"""

import json
import os
import uuid
from datetime import datetime, timezone


SANDBOX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandbox")
SESSIONS_DIR = os.path.join(SANDBOX_DIR, "sessions")
OUT_DIR = os.path.join(SANDBOX_DIR, "out")


class Session:
    def __init__(self, session_id: str = None):
        self.id = session_id or uuid.uuid4().hex[:12]
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.name: str | None = None
        self.turns: list[dict] = []
        self.agents_used: list[str] = []
        self.output_dir = os.path.join(OUT_DIR, self.id)
        self.sandbox_dir = os.path.join(SANDBOX_DIR, self.id)

        os.makedirs(SESSIONS_DIR, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.sandbox_dir, exist_ok=True)

    @property
    def file_path(self) -> str:
        return os.path.join(SESSIONS_DIR, f"{self.id}.json")

    def add_turn(self, role: str, content: str, agent: str = None):
        turn = {
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if agent:
            turn["agent"] = agent
            if agent not in self.agents_used:
                self.agents_used.append(agent)
        self.turns.append(turn)
        self.save()

    def set_name(self, name: str):
        if not self.name:
            clean = name.strip().replace("\n", " ")
            if len(clean) > 40:
                cut = clean[:40].rsplit(" ", 1)[0] or clean[:40]
                clean = cut.rstrip(".,;:- ")
            self.name = clean[:40]
            self.save()

    def rename(self, name: str):
        clean = name.strip().replace("\n", " ")[:60]
        self.name = clean
        self.save()

    def save(self):
        data = {
            "session_id": self.id,
            "created_at": self.created_at,
            "name": self.name,
            "agents_used": self.agents_used,
            "output_dir": self.output_dir,
            "sandbox_dir": self.sandbox_dir,
            "turns": self.turns,
        }
        with open(self.file_path, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, session_id: str) -> "Session":
        path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        with open(path) as f:
            data = json.load(f)
        session = cls.__new__(cls)
        session.id = data["session_id"]
        session.created_at = data["created_at"]
        session.name = data.get("name")
        session.turns = data["turns"]
        session.agents_used = data["agents_used"]
        session.output_dir = os.path.join(OUT_DIR, session.id)
        session.sandbox_dir = os.path.join(SANDBOX_DIR, session.id)
        os.makedirs(session.output_dir, exist_ok=True)
        os.makedirs(session.sandbox_dir, exist_ok=True)
        return session

    @classmethod
    def delete(cls, session_id: str):
        path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        if os.path.exists(path):
            os.remove(path)
        out = os.path.join(OUT_DIR, session_id)
        if os.path.isdir(out):
            import shutil
            shutil.rmtree(out)
        sandbox = os.path.join(SANDBOX_DIR, session_id)
        if os.path.isdir(sandbox):
            import shutil
            shutil.rmtree(sandbox)

    @classmethod
    def list_sessions(cls) -> list[dict]:
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        sessions = []
        for fname in os.listdir(SESSIONS_DIR):
            if not fname.endswith(".json"):
                continue
            path = os.path.join(SESSIONS_DIR, fname)
            try:
                with open(path) as f:
                    data = json.load(f)
                sessions.append({
                    "session_id": data["session_id"],
                    "created_at": data["created_at"],
                    "name": data.get("name"),
                    "agents_used": data["agents_used"],
                    "turns": len(data["turns"]),
                })
            except (json.JSONDecodeError, KeyError):
                continue
        sessions.sort(key=lambda s: s["created_at"], reverse=True)
        return sessions
