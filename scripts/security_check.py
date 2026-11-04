"""Check known local credentials and common secret formats without displaying values."""

import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from backend.config import ROOT


def check():
    secrets = [
        os.getenv(k, "")
        for k in (
            "JAMENDO_CLIENT_ID",
            "JAMENDO_CLIENT_SECRET",
            "SUPABASE_SECRET_KEY",
            "SUPABASE_PUBLISHABLE_KEY",
        )
    ]
    document = ROOT / "api.docx"
    if document.exists():
        try:
            with zipfile.ZipFile(document) as archive:
                xml = ET.fromstring(archive.read("word/document.xml"))
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = ["".join(p.itertext()) for p in xml.findall(".//w:p", ns)]
            for i, text in enumerate(paragraphs):
                if text.strip() in ("Client ID", "Client Secret"):
                    secrets.extend(
                        value.strip()
                        for value in paragraphs[i + 1 : i + 4]
                        if re.fullmatch(
                            r"[a-fA-F0-9]{8}|[a-fA-F0-9]{32}", value.strip()
                        )
                    )
        except (OSError, zipfile.BadZipFile, ET.ParseError):
            print(
                "Credential document inspection unavailable; configured environment values still checked."
            )
    skip = {".git", ".venv", "node_modules", "raw", "test-results", "playwright-report"}
    findings = []
    scanned = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(
            part in skip for part in path.relative_to(ROOT).parts
        ):
            continue
        if path.name.startswith(".env") or path.suffix.lower() not in (
            ".ts",
            ".tsx",
            ".js",
            ".css",
            ".html",
            ".json",
            ".py",
            ".md",
            ".sql",
            ".txt",
            ".toml",
            ".yml",
        ):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        scanned += 1
        if any(
            value and len(value) >= 8 and value not in ("replace_me",) and value in text
            for value in secrets
        ) or re.search(
            r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}", text
        ):
            findings.append(str(path.relative_to(ROOT)))
    print(
        f"Scanned {scanned} source/build/documentation files. Credential findings: {len(findings)}."
    )
    for path in findings:
        print("Check credential exposure in: " + path)
    if findings:
        raise SystemExit(1)


if __name__ == "__main__":
    check()
