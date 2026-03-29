#!/bin/bash
set -e

REFRESH_HOUR="${REFRESH_HOUR:-2}"
REFRESH_MINUTE="${REFRESH_MINUTE:-0}"

# Set up cron job for daily refresh
# Pipe output to both log file and stdout (fd 1 inherited from entrypoint)
echo "$REFRESH_MINUTE $REFRESH_HOUR * * * /bin/bash /app/docker/refresh.sh 2>&1 | tee -a /var/log/refresh.log" > /etc/cron.d/refresh
chmod 0644 /etc/cron.d/refresh
crontab /etc/cron.d/refresh

# Start cron daemon
cron

echo "Cron scheduled: daily refresh at ${REFRESH_HOUR}:$(printf '%02d' ${REFRESH_MINUTE})"

# If no manifest exists, run initial refresh in background
# Use tee so output appears in docker compose logs AND is saved to file
if [ ! -f /data/snapshots/manifest.json ]; then
  echo "No snapshots found, starting initial refresh in background..."
  mkdir -p /data/snapshots
  /bin/bash /app/docker/refresh.sh 2>&1 | tee -a /var/log/refresh.log &
fi

# Start nginx in foreground (PID 1 for signal handling)
exec nginx -g 'daemon off;'
