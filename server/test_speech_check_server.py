import contextlib
import http.client
import io
import json
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import speech_check_server


class SpeechServerTest(unittest.TestCase):
    def request(self, method, path, body=None, headers=None):
        server = speech_check_server.ThreadingHTTPServer(("127.0.0.1", 0), speech_check_server.SpeechCheckHandler)
        thread = threading.Thread(target=server.serve_forever)
        thread.start()
        try:
            connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=5)
            connection.request(method, path, body=body, headers=headers or {})
            response = connection.getresponse()
            payload = json.loads(response.read())
            connection.close()
            return response.status, payload
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_liveness_stays_available_when_speech_dependencies_are_missing(self):
        with (
            patch.object(speech_check_server, "WHISPER_BIN", "missing-whisper"),
            patch.object(speech_check_server, "WHISPER_MODEL", ""),
            patch.object(speech_check_server, "FFMPEG_BIN", "missing-ffmpeg"),
        ):
            status, payload = self.request("GET", "/health")

        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertFalse(payload["ready"])

    def test_readiness_requires_all_speech_dependencies(self):
        with (
            patch.object(speech_check_server, "WHISPER_BIN", "missing-whisper"),
            patch.object(speech_check_server, "WHISPER_MODEL", ""),
            patch.object(speech_check_server, "FFMPEG_BIN", "missing-ffmpeg"),
        ):
            status, payload = self.request("GET", "/health/ready")

        self.assertEqual(status, 503)
        self.assertFalse(payload["ok"])

    def test_readiness_reports_ready_without_exposing_dependency_paths(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            dependency = Path(tmp_dir) / "dependency"
            model = Path(tmp_dir) / "model.bin"
            dependency.write_bytes(b"test")
            model.write_bytes(b"test")
            with (
                patch.object(speech_check_server, "WHISPER_BIN", str(dependency)),
                patch.object(speech_check_server, "WHISPER_MODEL", str(model)),
                patch.object(speech_check_server, "FFMPEG_BIN", str(dependency)),
            ):
                status, payload = self.request("GET", "/health/ready")

        self.assertEqual(status, 200)
        self.assertEqual(payload["speech"], {"whisper": True, "model": True, "ffmpeg": True})
        self.assertNotIn(str(dependency), json.dumps(payload))

    def test_oversized_audio_is_rejected_before_dependency_work(self):
        with patch.object(speech_check_server, "MAX_REQUEST_BYTES", 8):
            status, payload = self.request(
                "POST",
                "/api/speech/check",
                body=b"123456789",
                headers={"Content-Type": "multipart/form-data; boundary=test"},
            )

        self.assertEqual(status, 413)
        self.assertEqual(payload["message"], "Audio upload is too large.")

    def test_transcripts_are_redacted_from_service_logs_by_default(self):
        output = io.StringIO()
        with patch.object(speech_check_server, "LOG_TRANSCRIPTS", False), contextlib.redirect_stdout(output):
            speech_check_server.log_speech_result({"item": "cat", "transcript": "private spoken sentence"})

        self.assertIn('"item": "cat"', output.getvalue())
        self.assertNotIn("private spoken sentence", output.getvalue())


if __name__ == "__main__":
    unittest.main()
