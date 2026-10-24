#!/usr/bin/env python3
"""Short-lived loopback-only password form; no key in chat, URL, argv or logs."""
import argparse
import secrets
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs

from audio_credentials import save_key


def make_server(key_path=None):
    token = secrets.token_urlsafe(32)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def respond(self, status, body):
            payload = ("<!doctype html><html lang='de'><meta charset='utf-8'>"
                       "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                       "<title>Oskar · OpenAI-Key</title>"
                       "<style>body{font:18px system-ui;max-width:620px;margin:60px auto;padding:24px;"
                       "background:#f8f5ed;color:#293e3b}input,button{font:inherit;padding:14px;"
                       "box-sizing:border-box;width:100%;margin:12px 0}button{background:#345f51;color:white;"
                       "border:0;border-radius:10px}p{line-height:1.6}</style>" + body + "</html>").encode()
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            # Native form POSTs become Origin:null with no-referrer (also in IAB).
            # same-origin preserves the strict Origin check without leaking the URL externally.
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
            self.end_headers()
            self.wfile.write(payload)

        def authorized(self):
            return self.headers.get("Host") == self.server.expected_host and self.path == "/" + token

        def do_GET(self):
            if not self.authorized():
                self.respond(404, "<h1>Nicht gefunden</h1>")
                return
            self.respond(200, "<h1>OpenAI-Key für Oskars Hörproben</h1>"
                         "<p>Der Key wird nur lokal auf diesem Rechner gespeichert, außerhalb des Spiels. "
                         "Er erscheint weder im Chat noch in Projektdateien oder Exporten.</p>"
                         f"<form method='post' action='/{token}' autocomplete='off'>"
                         "<label for='key'>Eigener OpenAI-API-Key</label>"
                         "<input id='key' name='key' type='password' autocomplete='new-password' "
                         "required maxlength='512' placeholder='sk-…' autofocus>"
                         "<button>Key lokal speichern</button></form>"
                         "<p>Speichern allein startet noch keine Audio-Erzeugung.</p>")

        def do_POST(self):
            if not self.authorized() or self.headers.get("Origin") != self.server.origin:
                self.respond(403, "<h1>Anfrage abgelehnt</h1>")
                return
            if self.headers.get("Content-Type") != "application/x-www-form-urlencoded":
                self.respond(415, "<h1>Ungültiges Format</h1>")
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 2048:
                    raise ValueError("Ungültige Eingabegröße.")
                values = parse_qs(self.rfile.read(length).decode("utf-8"), strict_parsing=True)
                if set(values) != {"key"} or len(values["key"]) != 1:
                    raise ValueError("Bitte genau einen Key eingeben.")
                save_key(values["key"][0], key_path)
            except (ValueError, UnicodeError):
                self.respond(400, "<h1>Key nicht gespeichert</h1><p>Bitte zurückgehen und einen vollständigen Key eingeben.</p>")
                return
            except OSError:
                self.respond(500, "<h1>Speichern fehlgeschlagen</h1><p>Lokale Dateirechte prüfen.</p>")
                return
            self.server.saved = True
            self.respond(200, "<h1>Key lokal gespeichert</h1><p>Du kannst dieses Fenster schließen. "
                         "Codex kann jetzt die beauftragten Hörproben erzeugen. Der Key wird nicht zurückgelesen.</p>")

    server = HTTPServer(("127.0.0.1", 0), Handler)
    server.expected_host = f"127.0.0.1:{server.server_port}"
    server.origin = "http://" + server.expected_host
    server.url = server.origin + "/" + token
    server.saved = False
    server.timeout = 1
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=int, default=1800, help="Seconds until the form closes.")
    args = parser.parse_args()
    server = make_server()
    print(server.url, flush=True)
    deadline = time.monotonic() + args.timeout
    try:
        while not server.saved and time.monotonic() < deadline:
            server.handle_request()
    finally:
        server.server_close()
    print("Key lokal gespeichert." if server.saved else "Eingabezeit abgelaufen; nichts gespeichert.", flush=True)


if __name__ == "__main__":
    main()
