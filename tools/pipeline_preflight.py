#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import socket
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WIZARD_ROOT = Path("/Users/Julius/coding_projects/tools/11labs wizard")
RHUBARB_BIN = PROJECT_ROOT / "tools" / "rhubarb" / "Rhubarb-Lip-Sync-1.14.0-macOS" / "rhubarb"
CHROME_APP = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run quick environment checks before a Lernwort set pipeline run.")
    parser.add_argument("--port", type=int, help="Optional app server port to check for availability.")
    parser.add_argument("--min-free-mb", type=int, default=2048, help="Minimum free disk space required. Default: 2048.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checks = []
    checks.append(check_free_space(PROJECT_ROOT, args.min_free_mb))
    checks.append(check_free_space(Path("/tmp"), args.min_free_mb))
    checks.append(check_exists(RHUBARB_BIN, "rhubarb"))
    checks.append(check_tool("ffmpeg"))
    checks.append(check_exists(WIZARD_ROOT / "package.json", "11labs wizard package.json"))
    checks.append(check_exists(WIZARD_ROOT / ".env", "11labs wizard .env"))
    checks.append(check_exists(CHROME_APP, "Google Chrome"))
    if args.port:
        checks.append(check_port_available(args.port))

    failed = [check for check in checks if not check["ok"]]
    print(json.dumps({"status": "fail" if failed else "pass", "checks": checks}, indent=2))
    return 2 if failed else 0


def check_free_space(path: Path, min_free_mb: int) -> dict[str, object]:
    usage = shutil.disk_usage(path)
    free_mb = usage.free // (1024 * 1024)
    return {
        "name": f"free space: {path}",
        "ok": free_mb >= min_free_mb,
        "freeMb": free_mb,
        "requiredMb": min_free_mb,
    }


def check_exists(path: Path, name: str) -> dict[str, object]:
    return {"name": name, "ok": path.exists(), "path": str(path)}


def check_tool(name: str) -> dict[str, object]:
    found = shutil.which(name)
    return {"name": name, "ok": bool(found), "path": found}


def check_port_available(port: int) -> dict[str, object]:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        result = sock.connect_ex(("127.0.0.1", port))
    return {"name": f"port {port} available", "ok": result != 0, "port": port}


if __name__ == "__main__":
    raise SystemExit(main())
