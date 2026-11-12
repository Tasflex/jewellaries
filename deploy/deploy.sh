#!/bin/bash
# Build and (re)start Aurum Rosso on the server. Idempotent; run from anywhere:
#   bash /var/www/jewellaries/deploy/deploy.sh            # build everything
#   SKIP_VIDEOS=1 bash .../deploy.sh                      # skip the video render
set -euo pipefail
APP=/var/www/jewellaries
cd "$APP"
export PATH="/root/.cargo/bin:$PATH"
log() { echo "== $(date +%H:%M:%S) $*"; }

log "pull"
git pull --ff-only

[ -f .env ] || { echo "missing $APP/.env (copy .env.example)"; exit 1; }
set -a; . ./.env; set +a
mkdir -p var

log "api: cargo build"
(cd services/api && nice -n 10 cargo build --release -q)

log "studio: python venv"
(cd services/studio && { [ -d .venv ] || python3 -m venv .venv; } && .venv/bin/pip install -q -r requirements.txt)

log "studio: product renders"
(cd services/studio && nice -n 10 .venv/bin/python -m studio render >/dev/null)

if [ "${SKIP_VIDEOS:-0}" != "1" ]; then
  log "studio: videos (this takes a while)"
  (cd services/studio && PYTHONIOENCODING=utf-8 nice -n 15 .venv/bin/python -m studio videos --jobs "${VIDEO_JOBS:-2}")
fi

log "web: npm ci + build"
(cd apps/web && npm ci --no-audit --no-fund --loglevel=error && nice -n 10 npm run build)

log "services"
cp deploy/aurum-*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q aurum-api aurum-web aurum-fulfil
systemctl restart aurum-api
sleep 1
systemctl restart aurum-web aurum-fulfil

log "nginx"
cp deploy/nginx-jewellaries.conf /etc/nginx/sites-available/jewellaries
ln -sf /etc/nginx/sites-available/jewellaries /etc/nginx/sites-enabled/jewellaries
nginx -t && systemctl reload nginx

log "health"
sleep 3
curl -fsS http://127.0.0.1:8300/health && echo " api ok"
curl -fsS -o /dev/null -w "web %{http_code}\n" http://127.0.0.1:3300/
log "done"
