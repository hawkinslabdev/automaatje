#!/bin/sh
set -e

echo "Starting Automaatje container..."

# Validate SESSION_SECRET is set
if [ -z "$SESSION_SECRET" ]; then
  echo "ERROR: SESSION_SECRET environment variable is not set."
  echo "Please generate a secure random secret and add it to your .env file:"
  echo "  echo \"SESSION_SECRET=\$(openssl rand -base64 32)\" > .env"
  exit 1
fi

# Run safe database migrations
echo "Checking database state..."
node node_modules/tsx/dist/cli.mjs lib/db/safe-migrate.ts

if [ $? -ne 0 ]; then
  echo "✗ Migration failed! Container will not start."
  exit 1
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
