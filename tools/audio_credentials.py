"""Oskar-only credentials, outside every app/export directory. Never log values."""
import os
import re
import tempfile
from pathlib import Path


KEY_FILE = Path.home() / ".config" / "lernspiel-oskar" / "openai-tts.key"


def load_key(path=None):
    path = Path(path or KEY_FILE)
    if path.is_symlink():
        raise ValueError("Die Key-Datei darf keine Verknüpfung sein.")
    try:
        if os.name != "nt" and path.stat().st_mode & 0o077:
            raise ValueError("Die Key-Datei muss ausschließlich für dich lesbar sein (0600).")
        return path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return ""


def save_key(value, path=None):
    value = value.strip()
    if not re.fullmatch(r"sk-[A-Za-z0-9_-]{16,508}", value):
        raise ValueError("Bitte einen vollständigen OpenAI-API-Key eingeben (beginnt mit sk-).")
    path = Path(path or KEY_FILE)
    if path.is_symlink() or path.parent.is_symlink():
        raise ValueError("Der Key-Speicher darf keine Verknüpfung sein.")
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if os.name != "nt":
        path.parent.chmod(0o700)
    descriptor, temporary = tempfile.mkstemp(prefix=".key-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write(value + "\n")
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)
