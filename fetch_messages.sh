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

mkdir -p out

# Process all dates at once through the TypeScript code
echo "Processing messages from $start_date to $end_date..."
output_file=$(pnpm --silent main -c "${channel_id}" -s "$start_date" -e "$end_date")

if [ -n "$output_file" ] && [ -f "$output_file" ]; then
  echo "Successfully created: $output_file"
else
  echo "No messages found in the date range $start_date to $end_date"
  exit 2
fi

echo "Processing complete!"
