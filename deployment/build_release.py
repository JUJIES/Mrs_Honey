#!/usr/bin/env python3
import argparse
import hashlib
import json
import shutil
from pathlib import Path


RUNTIME_PATHS = (
    "index.html",
    "styles.css",
    "app.js",
    "service-worker.js",
    "manifest.json",
    "manifest.webmanifest",
    "assets",
    "data",
    "server/local_app_server.py",
    "server/speech_check_server.py",
)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_runtime(source, destination):
    if destination.exists() and any(destination.iterdir()):
        raise ValueError(f"Destination must be empty: {destination}")

    destination.mkdir(parents=True, exist_ok=True)
    for relative in RUNTIME_PATHS:
        source_path = source / relative
        target_path = destination / relative
        if not source_path.exists():
            raise FileNotFoundError(f"Required runtime path is missing: {source_path}")
        if source_path.is_dir():
            shutil.copytree(source_path, target_path)
        else:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, target_path)


def build_manifest(destination, source_commit):
    files = []
    for path in sorted(destination.rglob("*")):
        if path.is_file() and path.name != "RELEASE.json":
            files.append(
                {
                    "path": path.relative_to(destination).as_posix(),
                    "bytes": path.stat().st_size,
                    "sha256": sha256(path),
                }
            )

    manifest = {
        "schemaVersion": 1,
        "sourceCommit": source_commit,
        "fileCount": len(files),
        "files": files,
    }
    (destination / "RELEASE.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Build a minimal immutable Mrs Honey runtime release.")
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()

    source = args.source.resolve()
    destination = args.destination.resolve()
    copy_runtime(source, destination)
    manifest = build_manifest(destination, args.commit)
    print(json.dumps({"destination": str(destination), "files": manifest["fileCount"]}))


if __name__ == "__main__":
    main()
