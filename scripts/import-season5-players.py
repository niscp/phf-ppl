"""Import only public roster fields from the Season 5 registration workbook.

The form also contains contact, address, and payment fields. Those are never
copied into the generated website data.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import parse_qs, urlparse
import xml.etree.ElementTree as ET
import zipfile


NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT = Path(__file__).resolve().parents[1]
PHOTO_DIR = ROOT / "public" / "season5-players"
OUTPUT = ROOT / "app" / "season5-players.json"
PROFILE_HOSTS = {"cricheroes.com", "www.cricheroes.com", "cricheroes.in", "www.cricheroes.in", "chshare.link"}
NAME_OVERRIDES = {"player-48": "Tarun Talluri"}  # Confirmed by the player-photo update.
PHOTO_OVERRIDES = {"player-48"}  # Keep the supplied replacement portrait.


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    tree = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(text.text or "" for text in item.findall(".//m:t", NS)) for item in tree.findall("m:si", NS)]


def cells(row: ET.Element, strings: list[str]) -> dict[str, str]:
    result = {}
    for cell in row.findall("m:c", NS):
        column = re.match(r"[A-Z]+", cell.attrib["r"]).group()
        value = cell.find("m:v", NS)
        if value is None:
            result[column] = ""
        elif cell.attrib.get("t") == "s":
            result[column] = strings[int(value.text)]
        else:
            result[column] = value.text or ""
    return result


def profile_url(raw: str) -> str | None:
    match = re.search(r"https?://[^\s]+", raw)
    if not match:
        return None
    url = match.group().rstrip(".,;)")
    return url if urlparse(url).hostname in PROFILE_HOSTS else None


def drive_id(raw: str) -> str | None:
    parsed = urlparse(raw)
    if parsed.hostname != "drive.google.com":
        return None
    candidate = parse_qs(parsed.query).get("id", [None])[0]
    return candidate if candidate and re.fullmatch(r"[A-Za-z0-9_-]+", candidate) else None


def role(raw: str) -> str:
    return {"All - Rounder": "All-rounder", "Batsman": "Batter", "Bowler": "Bowler"}.get(raw.strip(), "Player")


def load_players(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        strings = shared_strings(archive)
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = sheet.findall(".//m:sheetData/m:row", NS)
        players = []
        for index, row in enumerate(rows[1:], start=2):
            data = cells(row, strings)
            name = " ".join(data.get("B", "").split())
            if not name:
                continue
            photo_id = drive_id(data.get("G", ""))
            player_id = f"player-{index}"
            players.append({
                "id": player_id,
                "name": NAME_OVERRIDES.get(player_id, name),
                "role": role(data.get("F", "")),
                "photo": None,
                "cricheroesUrl": profile_url(data.get("K", "")),
                "stats": None,
                "_photoId": photo_id,
            })
    names = [player["name"].casefold() for player in players]
    if len(names) != len(set(names)):
        raise ValueError("Duplicate player names require manual review")
    return players


def download_photo(player: dict) -> tuple[str, bool, str]:
    if player["id"] in PHOTO_OVERRIDES:
        destination = PHOTO_DIR / f"{player['id']}.jpg"
        return player["id"], destination.is_file(), "Replacement photo is missing"
    file_id = player["_photoId"]
    if not file_id:
        return player["id"], False, "No photo submitted"
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    destination = PHOTO_DIR / f"{player['id']}.jpg"
    try:
        with tempfile.TemporaryDirectory(prefix="phf-player-") as temp:
            source = Path(temp) / "source-image"
            subprocess.run(
                ["curl", "-fLsS", "--max-time", "35", "--output", str(source), url],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            if source.stat().st_size > 15_000_000:
                raise ValueError("Photo exceeds 15 MB")
            subprocess.run(
                ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "560", str(source), "--out", str(destination)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
        return player["id"], True, ""
    except Exception as exc:
        return player["id"], False, str(exc)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    args = parser.parse_args()
    players = load_players(args.workbook)
    previous = {}
    if OUTPUT.is_file():
        previous = {item["id"]: item for item in json.loads(OUTPUT.read_text(encoding="utf-8"))}
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    result = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(download_photo, player) for player in players]
        for future in as_completed(futures):
            player_id, ok, reason = future.result()
            result[player_id] = (ok, reason)
    failures = []
    for player in players:
        ok, reason = result[player["id"]]
        if ok:
            player["photo"] = f"/season5-players/{player['id']}.jpg"
        elif player["_photoId"]:
            failures.append((player["name"], reason))
        del player["_photoId"]
        old = previous.get(player["id"])
        if old and old["name"] == player["name"] and old["cricheroesUrl"] == player["cricheroesUrl"]:
            for key in ("stats", "statsSource", "statsScope", "statsChecked"):
                if key in old:
                    player[key] = old[key]
    OUTPUT.write_text(json.dumps(players, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(players)} named players; {sum(bool(p['photo']) for p in players)} photos; {sum(bool(p['cricheroesUrl']) for p in players)} CricHeroes links.")
    if failures:
        print("Photo downloads needing review:")
        for name, reason in failures:
            print(f"- {name}: {reason}")


if __name__ == "__main__":
    main()
