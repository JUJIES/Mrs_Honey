#!/usr/bin/env python3
import mimetypes
import os
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from speech_check_server import SpeechCheckHandler

HOST = os.environ.get("LERNWORT_APP_HOST", "0.0.0.0")
PORT = int(os.environ.get("LERNWORT_APP_PORT", "5173"))
WEB_ROOT = Path(__file__).resolve().parents[1]

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")


class LocalAppHandler(SpeechCheckHandler):
    server_version = "LernwortLocalApp/0.1"

    def do_GET(self):
        if self.path == "/health" or self.path.startswith("/api/"):
            super().do_GET()
            return

        self.serve_static_file()

    def serve_static_file(self):
        parsed_path = urlparse(self.path).path
        relative_path = unquote(parsed_path).lstrip("/") or "index.html"
        candidate = (WEB_ROOT / relative_path).resolve()

        if WEB_ROOT not in candidate.parents and candidate != WEB_ROOT:
            self.send_error(403)
            return

        if candidate.is_dir():
            candidate = candidate / "index.html"

        if not candidate.exists() or not candidate.is_file():
            self.send_error(404)
            return

        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        payload = candidate.read_bytes()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        if candidate.name in {"index.html", "service-worker.js"}:
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)


def main():
    server = ThreadingHTTPServer((HOST, PORT), LocalAppHandler)
    print(f"Lernwort app server running on http://{HOST}:{PORT}")
    print("Static app and /api/speech/check are served from the same origin.")
    server.serve_forever()


if __name__ == "__main__":
    main()
