#!/bin/sh
set -e

echo "Starting Automaatje container..."

# Run database migrations if needed
if [ ! -f "$DATABASE_URL" ] || [ ! -s "$DATABASE_URL" ]; then
  echo "Initializing database..."
  node node_modules/tsx/dist/cli.mjs lib/db/migrate.ts
else
  echo "Database already exists, running migrations..."
  node node_modules/tsx/dist/cli.mjs lib/db/migrate.ts
fi

# Function to run job processor
run_job_processor() {
  while true; do
    sleep 300 # 5 minutes
    echo "[$(date -Iseconds)] Running background job processor..."
    node node_modules/tsx/dist/cli.mjs scripts/process-jobs.ts || echo "[$(date -Iseconds)] Job processor failed"
  done
}

# Start job processor in background
run_job_processor &
JOB_PROCESSOR_PID=$!

echo "Job processor started with PID $JOB_PROCESSOR_PID"
echo "Starting Next.js server..."

# Start Next.js server (standalone uses server.js)
node server.js &
NEXT_PID=$!

# Wait for either process to exit
wait -n $NEXT_PID $JOB_PROCESSOR_PID

# If one exits, kill the other
kill $NEXT_PID $JOB_PROCESSOR_PID 2>/dev/null

echo "Container shutting down..."
exit 0
