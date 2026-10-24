#!/usr/bin/env python3
"""Explicit offline-asset generation, following Video Lab's GPT-Audio contract."""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
import urllib.error
import urllib.request
import wave
import zipfile
from pathlib import Path

from audio_credentials import load_key

TOOLS = Path(__file__).resolve().parent
PROJECT_ROOT = TOOLS.parent
RUNTIME = Path.home() / ".cache" / "lernspiel-oskar" / "audio"
API_URL = "https://api.openai.com/v1/chat/completions"
# Include prompt and processing revisions in the cache, not just model/voice.
RENDER_VERSION = "oskar-v1-lufs19-tp2-padding180-260"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def normalized_words(text):
    text = unicodedata.normalize("NFKC", text).lower()
    return " ".join("".join(c if c.isalnum() else " " for c in text).split())


def profile_id(profile):
    return sha256(json.dumps(profile, sort_keys=True, ensure_ascii=False).encode())


def speech_spec(text, profile):
    return {**profile, "text": text, "renderVersion": RENDER_VERSION}


def cache_key(spec):
    return sha256(json.dumps(spec, sort_keys=True, ensure_ascii=False).encode())


def read_profile(path):
    profile = json.loads(Path(path).read_text(encoding="utf-8"))
    if set(profile) != {"model", "voice", "instructions"} or profile["model"] != "gpt-audio-1.5":
        raise ValueError("Audio profile must use gpt-audio-1.5 and contain model, voice, instructions.")
    if profile["voice"] not in {"alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"}:
        raise ValueError("Unsupported audio voice.")
    if not isinstance(profile["instructions"], str) or not 1 <= len(profile["instructions"]) <= 2000:
        raise ValueError("Missing/invalid voice instructions.")
    return profile


def read_prompts(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("language") != "en" or not data.get("items"):
        raise ValueError("Audio generation requires a nonempty English prompt group.")
    seen = set()
    for item in data["items"]:
        name, text = item.get("id", ""), item.get("speak", "")
        if not isinstance(name, str) or not re.fullmatch(r"[a-zA-Z0-9_-]+", name) or name in seen:
            raise ValueError("Prompt IDs must be unique flat filenames.")
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 4000:
            raise ValueError("Every prompt needs 1–4000 characters of speak text.")
        seen.add(name)
    return data


def request_audio(spec, key):
    payload = {
        "model": spec["model"], "modalities": ["text", "audio"],
        "audio": {"voice": spec["voice"], "format": "wav"}, "store": False,
        "max_completion_tokens": min(16384, max(1024, len(spec["text"]) * 4)),
        "messages": [
            {"role": "system", "content": "Read only the supplied script verbatim. No introduction, additions or summary. Voice direction: " + spec["instructions"]},
            {"role": "user", "content": "Read this fixed voice-over script aloud verbatim. Do not answer it as a conversational message. Speak only the text inside the script tags, without the tags.\n<voice-over-script>\n" + spec["text"] + "\n</voice-over-script>"},
        ],
    }
    request = urllib.request.Request(API_URL, data=json.dumps(payload).encode(), headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json",
    }, method="POST")
    # No redirects (credentials), provider body logging, retries or model fallback.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *_args, **_kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=120) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f"OpenAI audio request failed (HTTP {error.code}); check model access, key and quota. No automatic retry.") from None
    except (urllib.error.URLError, TimeoutError):
        raise ValueError("OpenAI audio request failed or timed out. No automatic retry.") from None
    try:
        choice = data["choices"][0]
        audio = choice["message"]["audio"]
        if choice.get("finish_reason") != "stop" or not isinstance(audio["transcript"], str):
            raise ValueError()
        wav = base64.b64decode(audio["data"], validate=True)
        with wave.open(io.BytesIO(wav), "rb") as source:
            if source.getnframes() <= 0:
                raise ValueError()
        return wav, audio["transcript"]
    except (KeyError, IndexError, TypeError, ValueError, wave.Error, EOFError):
        raise ValueError("OpenAI returned incomplete or invalid WAV/transcript data.") from None


def run_media(command):
    try:
        return subprocess.run(command, check=True, capture_output=True).stdout
    except subprocess.CalledProcessError:
        raise ValueError("Local audio conversion/QA failed; no bundle published.") from None


def encode_mp3(wav_path, mp3_path):
    # Match classroom loudness, true-peak headroom and safe start/end padding.
    run_media(["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", str(wav_path),
               "-af", "loudnorm=I=-19:TP=-2:LRA=7,adelay=180:all=1,apad=pad_dur=0.26",
               "-ar", "44100", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3_path)])
    return inspect_mp3(mp3_path)


def inspect_mp3(path):
    probe = json.loads(run_media(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name", "-of", "json", str(path)]))
    duration = float(probe["format"]["duration"])
    if duration <= 0 or not any(s.get("codec_name") == "mp3" for s in probe["streams"]):
        raise ValueError("Invalid MP3 output.")
    # Decode the entire asset to catch truncated streams and silent output.
    pcm = run_media(["ffmpeg", "-v", "error", "-xerror", "-nostdin", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "pipe:1"])
    import array
    samples = array.array("h", pcm)
    if not samples or max(abs(v) for v in samples) < 128:
        raise ValueError("Audio output is empty or silent.")
    return {"durationMs": round(duration * 1000), "decode": "passed", "nonSilent": True}


def render_prompt(text, profile, cache, key_loader=load_key, provider=request_audio):
    spec = speech_spec(text, profile)
    fingerprint = cache_key(spec)
    directory = cache / fingerprint
    directory.mkdir(parents=True, exist_ok=True)
    # OS lock is released on crash; no stale lock can create duplicate paid calls.
    import fcntl
    with (directory / ".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        mp3_path, metadata_path = directory / "audio.mp3", directory / "metadata.json"
        try:
            metadata = json.loads(metadata_path.read_text())
            if (metadata["speech"] == spec and metadata["sha256"] == sha256(mp3_path.read_bytes())
                    and normalized_words(metadata["transcript"]) == normalized_words(text)):
                inspect_mp3(mp3_path)
                return mp3_path, metadata, True
        except (OSError, ValueError, KeyError):
            pass
        key = key_loader()
        if not key:
            raise ValueError("Own Oskar API key missing. Run python3 tools/configure_openai_audio.py first.")
        wav, transcript = provider(spec, key)
        if normalized_words(transcript) != normalized_words(text):
            review = directory / "review"
            review.mkdir(exist_ok=True)
            (review / "audio.wav").write_bytes(wav)
            (review / "transcript.json").write_text(json.dumps({"requested": text, "received": transcript}, indent=2))
            raise ValueError("Generated transcript differs from script; saved in review cache, not published. No automatic retry.")
        with tempfile.TemporaryDirectory(dir=directory) as tmp:
            source, encoded = Path(tmp) / "audio.wav", Path(tmp) / "audio.mp3"
            source.write_bytes(wav)
            qa = encode_mp3(source, encoded)
            metadata = {"speech": spec, "transcript": transcript, "sha256": sha256(encoded.read_bytes()), "qa": qa}
            (Path(tmp) / "metadata.json").write_text(json.dumps(metadata, indent=2))
            os.replace(encoded, mp3_path)
            os.replace(Path(tmp) / "metadata.json", metadata_path)
        return mp3_path, metadata, False


def assert_output_path(path):
    resolved = path.resolve()
    if resolved == PROJECT_ROOT or PROJECT_ROOT in resolved.parents:
        raise ValueError("Generated audio/cache must stay outside the app repository. Use the default runtime directory.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--in", dest="input", type=Path, default=TOOLS / "audio_samples.json")
    parser.add_argument("--out", type=Path, default=RUNTIME / "samples" / "oskar-samples.zip")
    parser.add_argument("--profile", type=Path, default=TOOLS / "audio_profile.json")
    parser.add_argument("--cache", type=Path, default=RUNTIME / "cache")
    parser.add_argument("--generate", action="store_true", help="Explicitly allow paid OpenAI calls for uncached scripts.")
    parser.add_argument("--dry-run", action="store_true", help="Validate only; no calls, cache or output writes.")
    args = parser.parse_args()
    profile, prompts = read_profile(args.profile), read_prompts(args.input)
    for output in (args.out, args.cache):
        assert_output_path(output)
    print(json.dumps({"model": profile["model"], "voice": profile["voice"], "prompts": len(prompts["items"]),
                      "output": str(args.out), "dryRun": args.dry_run or not args.generate}, indent=2), flush=True)
    if args.dry_run or not args.generate:
        return 0
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise ValueError("ffmpeg and ffprobe are required.")
    records, paths = {}, {}
    for item in prompts["items"]:
        mp3, metadata, reused = render_prompt(item["speak"], profile, args.cache)
        name = item["id"] + ".mp3"
        records[name], paths[name] = metadata, mp3
        print(f"{name}: {'cache' if reused else 'generated'}, {metadata['qa']['durationMs']} ms", flush=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # A complete flat ZIP is the existing importer contract. Sidecar records text/voice/QA.
    with tempfile.TemporaryDirectory(dir=args.out.parent) as tmp:
        bundle = Path(tmp) / "bundle.zip"
        with zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, source in paths.items():
                archive.write(source, name)
        report = {"schemaVersion": 1, "profile": profile, "profileId": profile_id(profile), "files": records}
        report_path = Path(tmp) / "metadata.json"
        report_path.write_text(json.dumps(report, indent=2) + "\n")
        os.replace(bundle, args.out)
        os.replace(report_path, args.out.with_suffix(".metadata.json"))
    # Standalone listening files beside the bundle; never under assets/audio.
    for name, source in paths.items():
        target = args.out.parent / args.out.stem / name
        target.parent.mkdir(exist_ok=True)
        shutil.copyfile(source, target)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from None
