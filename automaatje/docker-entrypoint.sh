#!/bin/sh
set -e

echo "Starting Automaatje container..."

# Run database migrations if needed
if [ ! -f "$DATABASE_URL" ] || [ ! -s "$DATABASE_URL" ]; then
  echo "Initializing database..."
  npm run db:migrate
else
  echo "Database already exists, running migrations..."
  npm run db:migrate
fi

# Function to run job processor
run_job_processor() {
  while true; do
    sleep 300 # 5 minutes
    echo "[$(date -Iseconds)] Running background job processor..."
    npx tsx scripts/process-jobs.ts || echo "[$(date -Iseconds)] Job processor failed"
  done
}

# Start job processor in background
run_job_processor &
JOB_PROCESSOR_PID=$!

echo "Job processor started with PID $JOB_PROCESSOR_PID"
echo "Starting Next.js server..."

# Start Next.js server
npm start &
NEXT_PID=$!

# Wait for either process to exit
wait -n $NEXT_PID $JOB_PROCESSOR_PID

# If one exits, kill the other
kill $NEXT_PID $JOB_PROCESSOR_PID 2>/dev/null

echo "Container shutting down..."
exit 0
