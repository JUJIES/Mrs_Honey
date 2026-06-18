#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
import tempfile
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = os.environ.get("LERNWORT_SPEECH_HOST", "127.0.0.1")
PORT = int(os.environ.get("LERNWORT_SPEECH_PORT", "8787"))
WHISPER_BIN = os.environ.get("WHISPER_CPP_BIN", "whisper-cli")
WHISPER_MODEL = os.environ.get("WHISPER_CPP_MODEL", "")
MATCH_THRESHOLD = float(os.environ.get("LERNWORT_MATCH_THRESHOLD", "0.76"))
MATCH_STOPWORDS = {
    "a",
    "again",
    "and",
    "can",
    "find",
    "good",
    "i",
    "is",
    "it",
    "job",
    "see",
    "the",
    "try",
    "where",
    "you",
}


class SpeechCheckHandler(BaseHTTPRequestHandler):
    server_version = "LernwortSpeechCheck/0.1"

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, {"ok": False})
            return

        self.send_json(
            200,
            {
                "ok": True,
                "whisper_bin": resolved_whisper_bin() or "",
                "model": WHISPER_MODEL,
                "model_exists": bool(WHISPER_MODEL and Path(WHISPER_MODEL).exists()),
            },
        )

    def do_POST(self):
        if self.path != "/api/speech/check":
            self.send_json(404, {"available": False, "correct": False})
            return

        whisper_bin = resolved_whisper_bin()
        if not whisper_bin or not WHISPER_MODEL or not Path(WHISPER_MODEL).exists():
            self.send_json(
                503,
                {
                    "available": False,
                    "correct": False,
                    "transcript": "",
                    "message": "Set WHISPER_CPP_BIN and WHISPER_CPP_MODEL.",
                },
            )
            return

        try:
            fields, files = self.read_multipart()
            expected = fields.get("expected", "")
            language = fields.get("language", "en")
            item_id = fields.get("itemId", "")
            requires_sentence = fields.get("requiresSentence", "").lower() == "true"
            vocabulary = parse_vocabulary(fields.get("vocabulary", "[]"))
            audio = files.get("audio")

            if not expected or not audio:
                self.send_json(400, {"available": True, "correct": False, "transcript": ""})
                return

            with tempfile.TemporaryDirectory(prefix="lernwort-speech-") as tmp_dir:
                tmp_path = Path(tmp_dir)
                upload_path = tmp_path / "speech-upload"
                wav_path = tmp_path / "speech.wav"
                output_base = tmp_path / "speech-result"

                upload_path.write_bytes(audio)
                convert_to_wav(upload_path, wav_path)
                transcript = transcribe(whisper_bin, wav_path, output_base, language)
                score = match_score(transcript, expected)
                threshold = match_threshold(expected)
                sentence_ok = is_allowed_sentence(transcript, expected) if requires_sentence else True
                competing_word = exact_competing_word(transcript, expected, vocabulary)
                short_utterance = is_short_utterance(transcript)
                correct = score >= threshold and sentence_ok and not competing_word
                reason = ""
                message = ""

                if competing_word:
                    reason = "wrong_word"
                elif requires_sentence and short_utterance:
                    reason = "sentence_required"
                    message = "Please say it in a sentence."
                elif score < threshold:
                    reason = "target_missing"
                elif requires_sentence and not sentence_ok:
                    reason = "sentence_required"
                    message = "Please say it in a sentence."

            log_speech_result(
                {
                    "item": item_id,
                    "expected": expected,
                    "transcript": transcript,
                    "confidence": round(score, 3),
                    "threshold": threshold,
                    "sentence_ok": sentence_ok,
                    "short_utterance": short_utterance,
                    "competing_word": competing_word,
                    "reason": reason,
                    "correct": correct,
                }
            )

            self.send_json(
                200,
                {
                    "available": True,
                    "correct": correct,
                    "transcript": transcript,
                    "expected": expected,
                    "confidence": round(score, 3),
                    "threshold": threshold,
                    "reason": reason,
                    "message": message,
                },
            )
        except Exception as error:
            log_speech_result({"error": str(error)})
            self.send_json(
                500,
                {
                    "available": True,
                    "correct": False,
                    "transcript": "",
                    "message": str(error),
                },
            )

    def read_multipart(self):
        content_type = self.headers.get("Content-Type", "")
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        headers = f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode()
        message = BytesParser(policy=default).parsebytes(headers + body)
        fields = {}
        files = {}

        if not message.is_multipart():
            return fields, files

        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            if not name:
                continue

            payload = part.get_payload(decode=True) or b""
            filename = part.get_filename()
            if filename:
                files[name] = payload
            else:
                fields[name] = payload.decode(part.get_content_charset() or "utf-8", errors="ignore")

        return fields, files

    def send_json(self, status, payload):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        return


def resolved_whisper_bin():
    if Path(WHISPER_BIN).exists():
        return WHISPER_BIN
    return shutil.which(WHISPER_BIN)


def log_speech_result(payload):
    print("[speech-check] " + json.dumps(payload, ensure_ascii=False), flush=True)


def parse_vocabulary(raw_value):
    try:
        value = json.loads(raw_value)
    except json.JSONDecodeError:
        return []

    if not isinstance(value, list):
        return []

    return [normalize(str(item)) for item in value if normalize(str(item))]


def convert_to_wav(source, target):
    command = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(source),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        str(target),
    ]
    subprocess.run(command, check=True, timeout=12)


def transcribe(whisper_bin, wav_path, output_base, language):
    command = [
        whisper_bin,
        "-m",
        WHISPER_MODEL,
        "-f",
        str(wav_path),
        "-l",
        "en" if language == "en" else "de",
        "-nt",
        "-otxt",
        "-of",
        str(output_base),
    ]
    completed = subprocess.run(command, check=True, capture_output=True, text=True, timeout=25)
    transcript_path = output_base.with_suffix(".txt")

    if transcript_path.exists():
        return transcript_path.read_text(encoding="utf-8").strip()

    return completed.stdout.strip()


def match_score(transcript, expected):
    heard = normalize(transcript)
    target = normalize(expected)

    if not heard or not target:
        return 0.0

    if heard == target or target in heard.split():
        return 1.0

    candidates = [heard, *(word for word in heard.split() if word not in MATCH_STOPWORDS)]
    return max(levenshtein_ratio(candidate, target) for candidate in candidates)


def exact_competing_word(transcript, expected, vocabulary):
    heard_words = set(normalize(transcript).split())
    target = normalize(expected)

    for word in vocabulary:
        if word != target and word in heard_words:
            return word

    return ""


def is_allowed_sentence(transcript, expected):
    words = normalize(transcript).split()
    target = normalize(expected)
    threshold = match_threshold(expected)

    if len(words) < 3:
        return False

    def target_at(index):
        return 0 <= index < len(words) and words[index] not in MATCH_STOPWORDS and levenshtein_ratio(words[index], target) >= threshold

    for index, word in enumerate(words):
        if word in {"this", "that", "it", "thats"}:
            if index + 2 < len(words) and words[index + 1] == "is":
                if target_at(index + 2) or (words[index + 2] in {"a", "the"} and target_at(index + 3)):
                    return True

        if word == "i":
            if index + 2 < len(words) and words[index + 1] == "see":
                if target_at(index + 2) or (words[index + 2] in {"a", "the"} and target_at(index + 3)):
                    return True

            if index + 3 < len(words) and words[index + 1] == "can" and words[index + 2] == "see":
                if target_at(index + 3) or (words[index + 3] in {"a", "the"} and target_at(index + 4)):
                    return True

    return False


def is_short_utterance(transcript):
    words = normalize(transcript).split()
    if words in (["blank", "audio"], ["silence"]):
        return False

    return 0 < len(words) <= 2


def match_threshold(expected):
    target = normalize(expected).replace(" ", "")
    if len(target) <= 4:
        return min(MATCH_THRESHOLD, 0.66)

    return MATCH_THRESHOLD


def normalize(text):
    text = text.lower()
    text = text.replace("'", "")
    text = re.sub(r"[^a-zäöüß ]+", " ", text)
    words = [word for word in text.split() if word]
    return " ".join(words)


def levenshtein_ratio(left, right):
    if left == right:
        return 1.0

    previous = list(range(len(right) + 1))
    for left_index, left_char in enumerate(left, start=1):
        current = [left_index]
        for right_index, right_char in enumerate(right, start=1):
            insert = current[right_index - 1] + 1
            delete = previous[right_index] + 1
            replace = previous[right_index - 1] + (left_char != right_char)
            current.append(min(insert, delete, replace))
        previous = current

    distance = previous[-1]
    longest = max(len(left), len(right), 1)
    return 1 - distance / longest


def main():
    server = ThreadingHTTPServer((HOST, PORT), SpeechCheckHandler)
    print(f"Speech check server running on http://{HOST}:{PORT}")
    print("Recommended MVP model: ggml-small.bin via whisper.cpp")
    server.serve_forever()


if __name__ == "__main__":
    main()
