import base64
import http.client
import io
import json
import math
import os
import stat
import struct
import tempfile
import threading
import unittest
import wave
import zipfile
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

import audio_credentials as credentials
import configure_openai_audio as setup
import import_audio_bundles as importer
import generate_lipsync as lipsync
import render_openai_audio as renderer
import voice_consistency_qa as voice_qa


def synthetic_wav():
    result = io.BytesIO()
    with wave.open(result, "wb") as out:
        out.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        out.writeframes(b"".join(struct.pack("<h", round(6000 * math.sin(2 * math.pi * 220 * n / 16000))) for n in range(16000)))
    return result.getvalue()


class AudioPipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.profile = renderer.read_profile(renderer.TOOLS / "audio_profile.json")

    def test_key_is_private_and_never_uses_inherited_environment_key(self):
        path = self.root / "config" / "key"
        with patch.dict(os.environ, {"OPENAI_API_KEY": "not-oskar"}):
            self.assertEqual(credentials.load_key(path), "")
        secret = "sk-" + "synthetic" * 5
        credentials.save_key(secret, path)
        self.assertEqual(credentials.load_key(path), secret)
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(path.parent.stat().st_mode), 0o700)

    def test_key_rejects_symlink_without_touching_target(self):
        target = self.root / "original"
        target.write_text("keep")
        link = self.root / "link"
        link.symlink_to(target)
        with self.assertRaises(ValueError):
            credentials.save_key("sk-" + "synthetic" * 4, link)
        self.assertEqual(target.read_text(), "keep")

    def test_key_form_rejects_foreign_origin_and_never_returns_key(self):
        key_path = self.root / "private" / "key"
        server = setup.make_server(key_path)
        thread = threading.Thread(target=server.serve_forever)
        thread.start()
        try:
            route = "/" + server.url.rsplit("/", 1)[1]
            def request(method, origin=None, host=None):
                client = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=5)
                headers = {"Content-Type": "application/x-www-form-urlencoded"}
                if origin:
                    headers["Origin"] = origin
                if host:
                    headers["Host"] = host
                body = "key=sk-" + "synthetic" * 4 if method == "POST" else None
                client.request(method, route, body, headers)
                response = client.getresponse()
                result = response.status, response.read().decode(), response.headers
                client.close()
                return result
            self.assertEqual(request("POST", "https://foreign.example")[0], 403)
            self.assertFalse(key_path.exists())
            self.assertEqual(request("GET", host="foreign.example")[0], 404)
            status, body, headers = request("GET")
            self.assertEqual(status, 200)
            self.assertIn("type='password'", body)
            self.assertEqual(headers["Cache-Control"], "no-store")
            self.assertEqual(headers["Referrer-Policy"], "same-origin")
            # Opaque/null origins remain rejected; the form must preserve its origin.
            self.assertEqual(request("POST", "null")[0], 403)
            self.assertFalse(key_path.exists())
            status, body, _ = request("POST", server.origin)
            self.assertEqual(status, 200)
            self.assertNotIn("synthetic", body)
            self.assertTrue(server.saved)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_cache_changes_with_text_model_voice_instructions_and_processing(self):
        spec = renderer.speech_spec("Can you find the cat?", self.profile)
        for field in ("text", "model", "voice", "instructions", "renderVersion"):
            changed = {**spec, field: spec[field] + " different"}
            self.assertNotEqual(renderer.cache_key(spec), renderer.cache_key(changed))

    def test_matching_cache_reuses_audio_without_key_or_provider(self):
        calls = []
        def provider(spec, key):
            calls.append(spec)
            return synthetic_wav(), "Can you find the cat?"
        path, metadata, reused = renderer.render_prompt("Can you find the cat?", self.profile, self.root, lambda: "synthetic", provider)
        self.assertFalse(reused)
        self.assertEqual(metadata["qa"]["decode"], "passed")
        self.assertGreater(metadata["qa"]["durationMs"], 1000)
        with patch.object(renderer, "load_key", side_effect=AssertionError("must not read key")):
            _, _, reused = renderer.render_prompt("Can you find the cat?", self.profile, self.root, lambda: self.fail("must not read key"), provider)
        self.assertTrue(reused)
        self.assertEqual(len(calls), 1)
        path.write_bytes(b"tampered")
        renderer.render_prompt("Can you find the cat?", self.profile, self.root, lambda: "synthetic", provider)
        self.assertEqual(len(calls), 2)

    def test_text_mismatch_retains_review_and_publishes_nothing(self):
        with self.assertRaisesRegex(ValueError, "differs"):
            renderer.render_prompt("Can you find the cat?", self.profile, self.root,
                                   lambda: "synthetic", lambda *_: (synthetic_wav(), "Here is a dog."))
        self.assertEqual(len(list(self.root.rglob("review/audio.wav"))), 1)
        self.assertEqual(list(self.root.rglob("audio.mp3")), [])
        self.assertEqual(list(self.root.rglob("metadata.json")), [])

    def test_normalized_text_comparison_preserves_words(self):
        self.assertEqual(renderer.normalized_words("Yes! That's a cow."), renderer.normalized_words("YES, that’s a cow!"))
        self.assertNotEqual(renderer.normalized_words("That's a cow"), renderer.normalized_words("That is a cow"))

    def test_dry_run_creates_no_output_or_cache_and_makes_no_call(self):
        output, cache = self.root / "out" / "samples.zip", self.root / "cache"
        with patch("sys.argv", ["render", "--out", str(output), "--cache", str(cache), "--dry-run"]), patch.object(renderer, "request_audio", side_effect=AssertionError("no call")):
            self.assertEqual(renderer.main(), 0)
        self.assertFalse(output.parent.exists())
        self.assertFalse(cache.exists())

    def test_generation_is_explicit_and_cannot_write_into_app(self):
        with self.assertRaises(ValueError):
            renderer.assert_output_path(renderer.PROJECT_ROOT / "assets/audio/test.zip")
        output = self.root / "no-generate.zip"
        with patch("sys.argv", ["render", "--out", str(output)]):
            self.assertEqual(renderer.main(), 0)
        self.assertFalse(output.exists())

    def test_import_keeps_existing_bytes_and_mtime(self):
        directory = self.root / "en"
        directory.mkdir()
        existing = directory / "cat.mp3"
        existing.write_bytes(b"original")
        before = existing.stat().st_mtime_ns
        bundle = self.root / "bundle.zip"
        with zipfile.ZipFile(bundle, "w") as archive:
            archive.writestr("cat.mp3", b"replacement")
            archive.writestr("cow.mp3", b"new")
        importer.validate_zip(bundle, {"cat.mp3", "cow.mp3"}, "test")
        imported = importer.extract_mp3s(bundle, directory)
        self.assertEqual(existing.read_bytes(), b"original")
        self.assertEqual(existing.stat().st_mtime_ns, before)
        self.assertEqual(len(imported), 1)

    def test_import_rejects_nested_filenames(self):
        bundle = self.root / "bad.zip"
        with zipfile.ZipFile(bundle, "w") as archive:
            archive.writestr("../cat.mp3", b"bad")
        with self.assertRaises(SystemExit):
            importer.validate_zip(bundle, {"cat.mp3"}, "test")

    def test_import_rejects_modified_bundle_even_with_valid_text(self):
        bundle = self.root / "bundle.zip"
        with zipfile.ZipFile(bundle, "w") as archive:
            archive.writestr("cat.mp3", b"modified")
        metadata = {"schemaVersion": 1, "profile": self.profile, "profileId": renderer.profile_id(self.profile),
                    "files": {"cat.mp3": {"speech": renderer.speech_spec("cat", self.profile), "transcript": "cat", "sha256": renderer.sha256(b"original"), "qa": {"decode": "passed"}}}}
        bundle.with_suffix(".metadata.json").write_text(json.dumps(metadata))
        with self.assertRaises(SystemExit):
            importer.load_bundle_metadata(bundle, {"cat.mp3": "cat"})

    def test_pitch_baseline_keeps_new_low_voice_separate(self):
        args = Namespace(min_voiced_frames=4, max_low_f0_hz=130, max_low_f0_ratio=.58, max_low_robust_z=-4)
        low_group = [{"medianF0Hz": 100., "voicedFrames": 12} for _ in range(9)]
        issues, baseline = voice_qa.evaluate_group(low_group, args)
        self.assertEqual(issues, [])
        self.assertEqual(baseline["baselineMedianF0Hz"], 100)
        mixed = low_group + [{"medianF0Hz": 250., "voicedFrames": 12} for _ in range(30)]
        self.assertEqual(len(voice_qa.evaluate_group(mixed, args)[0]), 9)
        self.assertIn("insufficient", voice_qa.evaluate_group(low_group[:3], args)[1]["status"])

    def test_full_bundle_metadata_import_contract(self):
        bundle = self.root / "sample.zip"
        cache = self.root / "cache"
        wav = synthetic_wav()
        with patch("sys.argv", ["render", "--out", str(bundle), "--cache", str(cache), "--generate"]), patch.object(renderer, "load_key", return_value="synthetic"), patch.object(renderer, "request_audio", side_effect=lambda spec, key: (wav, spec["text"])):
            # Bind-time defaults are replaced explicitly for dependency injection.
            original = renderer.render_prompt
            with patch.object(renderer, "render_prompt", side_effect=lambda text, profile, cache: original(text, profile, cache, lambda: "synthetic", lambda spec, key: (wav, spec["text"]))):
                self.assertEqual(renderer.main(), 0)
        texts = {i["id"] + ".mp3": i["speak"] for i in renderer.read_prompts(renderer.TOOLS / "audio_samples.json")["items"]}
        importer.validate_zip(bundle, set(texts), "samples")
        records = importer.load_bundle_metadata(bundle, texts)
        self.assertEqual(set(records), set(texts))

    def test_provider_contract_and_no_secret_in_http_failure(self):
        wav = synthetic_wav()
        response = {"choices": [{"finish_reason": "stop", "message": {"audio": {
            "data": base64.b64encode(wav).decode(), "transcript": "cat"}}}]}
        secret = "synthetic-private-test-value"
        opener = unittest.mock.MagicMock()
        opener.open.return_value.__enter__.return_value = io.BytesIO(json.dumps(response).encode())
        with patch.object(renderer.urllib.request, "build_opener", return_value=opener):
            actual_wav, transcript = renderer.request_audio(renderer.speech_spec("cat", self.profile), secret)
        self.assertEqual(actual_wav, wav)
        self.assertEqual(transcript, "cat")
        request = opener.open.call_args.args[0]
        sent = json.loads(request.data)
        self.assertEqual(sent["model"], "gpt-audio-1.5")
        self.assertEqual(sent["audio"], {"voice": "alloy", "format": "wav"})
        self.assertFalse(sent["store"])
        self.assertNotIn(secret, json.dumps(sent))
        opener.open.side_effect = renderer.urllib.error.HTTPError(renderer.API_URL, 401, "private body", {}, None)
        with patch.object(renderer.urllib.request, "build_opener", return_value=opener):
            with self.assertRaisesRegex(ValueError, "HTTP 401") as result:
                renderer.request_audio(renderer.speech_spec("cat", self.profile), secret)
        self.assertNotIn(secret, str(result.exception))
        self.assertNotIn("private body", str(result.exception))
        self.assertEqual(opener.open.call_count, 2)

    def test_lipsync_uses_full_spoken_prompt_and_legacy_label_fallback(self):
        sets = self.root / "sets"
        sets.mkdir()
        (sets / "fixture.json").write_text(json.dumps({"items": [
            {"id": "cat", "labels": {"en": "cat"}, "speak": {"en": "Can you find the cat?"}, "audio": {"en": "assets/audio/fixture/en/cat.mp3"}},
            {"id": "cow", "labels": {"en": "cow"}, "audio": {"en": "assets/audio/fixture/en/cow.mp3"}}
        ]}))
        with patch.object(lipsync, "SET_DIR", sets), patch.object(lipsync, "FEEDBACK_CATALOG", self.root / "missing"):
            dialogs = lipsync.collect_dialog_map()
        self.assertEqual(dialogs["assets/audio/fixture/en/cat.mp3"], "Can you find the cat?")
        self.assertEqual(dialogs["assets/audio/fixture/en/cow.mp3"], "cow")


if __name__ == "__main__":
    unittest.main()
