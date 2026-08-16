#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
output_dir="$project_dir/trailer"
parts_dir="$output_dir/parts"
mkdir -p "$parts_dir"

images=(
  "public/phf-season-5-poster.jpg"
  "public/legacy-15.jpg"
  "public/legacy-5.jpg"
  "public/legacy-14.jpg"
  "public/legacy-17.jpg"
  "public/legacy-27.jpg"
  "public/legacy-28.jpg"
  "public/legacy-24.jpg"
  "public/legacy-29.jpg"
  "public/legacy-30.jpg"
  "public/campaign-2.jpg"
  "public/campaign-8.jpg"
)

captions=(
  "THE LEGACY RETURNS"
  "ONE LEAGUE. ONE FAMILY."
  "RIVALRIES REIGNITE"
  "GLORY IS EARNED"
  "EVERY TEAM HAS A STORY"
  "CHAMPIONS RISE TOGETHER"
  "THE CELEBRATION AWAITS"
  "NEW SEASON. NEW CHALLENGE."
  "PLAY FOR YOUR COLOURS"
  "PLAY FOR THE TROPHY"
  "BIGGER GAMES. BRIGHTER NIGHTS."
  "21 / 22 / 28 / 29 NOVEMBER 2026"
)

durations=(3.2 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 3.0 4.2)

for index in "${!images[@]}"; do
  input="$project_dir/${images[$index]}"
  duration="${durations[$index]}"
  part="$parts_dir/part-$(printf '%02d' "$index").mp4"

  ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$input" -t "$duration" \
    -vf "scale=1400:2400:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0007,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.08:t=fill,drawbox=x=72:y=1770:w=936:h=8:color=0xE7B52A@0.9:t=fill,fade=t=in:st=0:d=0.35,fade=t=out:st=$(awk "BEGIN {print $duration-0.35}"):d=0.35,format=yuv420p" \
    -an -c:v libx264 -preset medium -crf 19 -r 30 "$part"
done

list_file="$parts_dir/concat.txt"
: > "$list_file"
for part in "$parts_dir"/part-*.mp4; do
  printf "file '%s'\n" "$part" >> "$list_file"
done

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 -i "$list_file" \
  -f lavfi -i "sine=frequency=55:sample_rate=48000:duration=34.9" \
  -f lavfi -i "sine=frequency=110:sample_rate=48000:duration=34.9" \
  -filter_complex "[1:a]tremolo=f=2:d=0.85,volume=0.12[a1];[2:a]tremolo=f=4:d=0.75,volume=0.035[a2];[a1][a2]amix=inputs=2:duration=longest,afade=t=in:st=0:d=1.2,afade=t=out:st=32.5:d=2.2[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart "$output_dir/phf-season-5-trailer-vertical.mp4"

printf '%s\n' "$output_dir/phf-season-5-trailer-vertical.mp4"
