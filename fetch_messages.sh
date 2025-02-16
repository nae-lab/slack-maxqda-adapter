#!/bin/bash
# Load environment variables from .env file
[ -f .env ] && source .env

# Updated parameter validation to support a single day (2 args) or a range (3 args).
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <channel_id> <start_date YYYY-MM-DD> [<end_date YYYY-MM-DD>]"
  exit 1
fi

channel_id=$1
start_date=$2
if [ "$#" -eq 3 ]; then
  end_date=$3
else
  end_date="$start_date"
fi

# Compute start and end epoch for numeric comparison
start_epoch=$(date -j -f "%Y-%m-%d" "$start_date" "+%s")
end_epoch=$(date -j -f "%Y-%m-%d" "$end_date" "+%s")

mkdir -p out

# Trap Ctrl-C and termination signals; kill all child processes
trap "echo 'Terminating...'; kill 0; exit 1" SIGINT SIGTERM

jobs=()
MAX_CONCURRENT_JOBS=5

launch_jobs() {
  current_date="$start_date"
  end_date_numeric=$(date -j -f "%Y-%m-%d" "$end_date" "+%Y%m%d")
  while true; do
    current_date_numeric=$(date -j -f "%Y-%m-%d" "$current_date" "+%Y%m%d")
    [ "$current_date_numeric" -gt "$end_date_numeric" ] && break

    while [ "$(jobs -r | wc -l | tr -d ' ')" -ge "$MAX_CONCURRENT_JOBS" ]; do
      sleep 2
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

# Concatenate only markdown files (ignore directories) while excluding the output file itself
find out -maxdepth 1 -type f -name "*.md" ! -name "slack-log.md" -exec cat {} + > out/slack-log.md
# Updated pandoc command with resource path so images are found
pandoc -i out/slack-log.md -o out/slack-log.docx --resource-path=out
