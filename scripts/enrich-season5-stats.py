"""Add verified public CricHeroes career stats to linked Season 5 players.

Only exact-name profile matches are imported. Unlinked or ambiguous players keep
their stats empty; this script does not infer identities from names alone.
"""

from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
ROSTER = ROOT / "app" / "season5-players.json"
FLIGHT = re.compile(r'self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)')
PROFILE = re.compile(r'https://cricheroes\.com/player-profile/\d+/[^"\s<>\\]+')
REVIEWED_ALIASES = {
    "Akash Thadani": "Akki Thadani",
    "DR SAM": "Diptiranjan Samantaray",
    "Manisai Dindigala": "Mani",
    "Chirumamilla Kowshik": "Kowshik",
    "Chandan Mahapatra": "Chandan",
    "Saket Kumar": "Saket",
    "Shobhit Kastuar": "Shobhit K",
    "Sunil Boddula": "Sunil B",
    "E V PAVAN KUMAR": "Pavan kumar E V",
    "Hanuma Madireddy": "Hanuma",
    "Meet Patel": "Meet",
    "Sravan Kumar Sriramoju": "Shravan Kumar",
    "Rachit Tandon": "Rachit",
    "Phanidhar": "Phanidhar Raju",
    "SUBASH K REDDY": "Subash Reddy K",
}


def fetch(url: str) -> str:
    result = subprocess.run(
        ["curl", "-fLsS", "--retry", "2", "--retry-delay", "2", "--max-time", "25", url],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def canonical_profile(url: str) -> str:
    if urlparse(url).hostname == "chshare.link":
        match = PROFILE.search(fetch(url))
        if not match:
            raise ValueError("No canonical CricHeroes profile in share link")
        url = match.group().rstrip("/\\")
    parsed = urlparse(url)
    if parsed.hostname not in {"cricheroes.com", "www.cricheroes.com", "cricheroes.in", "www.cricheroes.in"}:
        raise ValueError("Unexpected profile domain")
    match = re.match(r"/player-profile/(\d+)/([^/]+)", parsed.path)
    if not match:
        raise ValueError("Not a CricHeroes player profile")
    return f"https://cricheroes.com/player-profile/{match.group(1)}/{match.group(2)}/stats"


def embedded_object(chunks: list[str], key: str) -> dict:
    marker = json.dumps(key) + ":"
    for chunk in chunks:
        index = chunk.find(marker)
        if index != -1:
            value, _ = json.JSONDecoder().raw_decode(chunk[index + len(marker):])
            return value
    raise ValueError(f"No {key} object in player page")


def normal_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def fields(items: list[dict]) -> dict:
    return {item["title"]: item.get("value") for item in items}


def verified_stats(html: str, expected_name: str) -> tuple[dict, str | None]:
    chunks = [json.loads(match.group(1)) for match in FLIGHT.finditer(html)]
    info = embedded_object(chunks, "playerInfo")
    profile_name = info["data"]["name"]
    is_alias = normal_name(profile_name) != normal_name(expected_name)
    if is_alias and REVIEWED_ALIASES.get(expected_name) != profile_name:
        raise ValueError(f"Profile name {profile_name!r} does not match {expected_name!r}")
    stats = embedded_object(chunks, "initialStats")["statistics"]
    bat = fields(stats["batting"])
    bowl = fields(stats["bowling"])
    return {
        "batting": {
            "innings": bat.get("Innings"),
            "runs": bat.get("Runs"),
            "average": bat.get("Avg"),
            "strikeRate": bat.get("SR"),
        },
        "bowling": {
            "overs": bowl.get("Overs"),
            "wickets": bowl.get("Wickets"),
            "economy": bowl.get("Economy"),
            "best": bowl.get("Best Bowling"),
        },
    }, profile_name if is_alias else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Only test the first N linked players")
    parser.add_argument("--pending-only", action="store_true", help="Skip players with previously verified stats")
    parser.add_argument("--write", action="store_true", help="Update the public roster JSON")
    args = parser.parse_args()
    players = json.loads(ROSTER.read_text(encoding="utf-8"))
    linked = [player for player in players if player["cricheroesUrl"] and (not args.pending_only or not player.get("statsSource"))]
    if args.limit:
        linked = linked[: args.limit]
    success = 0
    for player in linked:
        try:
            source = canonical_profile(player["cricheroesUrl"])
            stats, profile_name = verified_stats(fetch(source), player["name"])
            if not any(value is not None for block in stats.values() for value in block.values()):
                raise ValueError("All stats are missing")
            player["stats"] = stats
            player["statsSource"] = source
            player["statsScope"] = "CricHeroes career"
            player["statsChecked"] = date.today().isoformat()
            if profile_name:
                player["statsProfileName"] = profile_name
            success += 1
            print(f"OK {player['name']}: {source}")
        except (ValueError, KeyError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
            print(f"REVIEW {player['name']}: {exc}")
        time.sleep(0.3)
    if args.write:
        ROSTER.write_text(json.dumps(players, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {success}/{len(linked)} linked players" + (" and saved" if args.write else " (dry run)"))


if __name__ == "__main__":
    main()
