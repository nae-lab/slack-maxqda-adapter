#!/bin/bash
# Load environment variables from .env file
[ -f .env ] && source .env

# Usage: ./fetch_messages.sh <channel_id> <start_date YYYY-MM-DD> <end_date YYYY-MM-DD>
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <channel_id> <start_date YYYY-MM-DD> <end_date YYYY-MM-DD>"
  exit 1
fi

channel_id=$1
start_date=$2
end_date=$3

# Compute start and end epoch for numeric comparison
start_epoch=$(date -j -f "%Y-%m-%d" "$start_date" "+%s")
end_epoch=$(date -j -f "%Y-%m-%d" "$end_date" "+%s")

mkdir -p out

# Trap Ctrl-C and termination signals; kill all child processes
trap "echo 'Terminating...'; kill 0; exit 1" SIGINT SIGTERM

jobs=()
MAX_CONCURRENT_JOBS=3

launch_jobs() {
  current_date="$start_date"
  while true; do
    current_epoch=$(date -j -f "%Y-%m-%d" "$current_date" "+%s")
    [ "$current_epoch" -gt "$end_epoch" ] && break

    while [ "$(jobs -r | wc -l | tr -d ' ')" -ge "$MAX_CONCURRENT_JOBS" ]; do
      sleep 5
    done

    process_day "$current_date" &
    jobs+=($!)
    current_date=$(date -j -v+1d -f "%Y-%m-%d" "$current_date" "+%Y-%m-%d")
  done
}

process_day() {
  day="$1"
  echo "Processing $day..."
  output=$(pnpm --silent main -c "${channel_id}" -d "$day")
  if [ -n "$output" ]; then
    echo "Writing $day..."
    echo "$output" > "out/${day}.md"
  else
    echo "No messages found for $day"
  fi
}

launch_jobs

# Wait for all background jobs to finish
for pid in "${jobs[@]}"; do
  wait "$pid"
done

cat out/* > out/slack-log.md
pandoc -i out/slack-log.md -o out/slack-log.docx
