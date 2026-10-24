import contextlib
import http.client
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import local_app_server


class QuietHandler(local_app_server.LocalAppHandler):
    def log_message(self, *args):
        pass


class PublicSurfaceTest(unittest.TestCase):
    @contextlib.contextmanager
    def app(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            for name in local_app_server.PUBLIC_ENTRYPOINTS:
                (root / name).write_text("public:" + name)
            for name in ["assets/images/new card.png", "data/set.json", "README.md", "references/private.png", "tools/key.py", "server/local_app_server.py", ".git/config", "data/.private"]:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture")
            with patch.object(local_app_server, "WEB_ROOT", root):
                server = local_app_server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
                thread = threading.Thread(target=server.serve_forever)
                thread.start()
                try:
                    yield server.server_port
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join()

    def request(self, port, path):
        with contextlib.closing(http.client.HTTPConnection("127.0.0.1", port, timeout=5)) as connection:
            connection.request("GET", path)
            response = connection.getresponse()
            return response.status, response.getheader("Cache-Control"), response.read()

    def test_all_runtime_entrypoints_and_encoded_assets_are_public(self):
        with self.app() as port:
            for name in local_app_server.PUBLIC_ENTRYPOINTS:
                status, cache, body = self.request(port, "/" + name + "?v=current")
                self.assertEqual(status, 200, name)
                self.assertEqual(body.decode(), "public:" + name)
                if name in {"index.html", "service-worker.js"}:
                    self.assertEqual(cache, "no-store")
            self.assertEqual(self.request(port, "/")[0], 200)
            self.assertEqual(self.request(port, "/assets/images/new%20card.png")[0], 200)
            self.assertEqual(self.request(port, "/data/set.json")[0], 200)
            self.assertEqual(self.request(port, "/assets/missing.png")[0], 404)

    def test_development_references_and_repository_files_are_not_public(self):
        with self.app() as port:
            for path in ["/README.md", "/references/private.png", "/tools/key.py", "/server/local_app_server.py", "/.git/config", "/data/.private"]:
                self.assertEqual(self.request(port, path)[0], 403, path)

    def test_decoded_traversal_cannot_bypass_the_public_boundary(self):
        with self.app() as port:
            for path in ["/assets/../README.md", "/assets/%2e%2e/server/local_app_server.py", "/data/%2e%2e/.git/config", "/../outside.txt"]:
                self.assertEqual(self.request(port, path)[0], 403, path)
