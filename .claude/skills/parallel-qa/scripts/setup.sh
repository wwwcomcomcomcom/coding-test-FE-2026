#!/usr/bin/env bash
# parallel-qa 준비: playwright-core 캐시 설치, dev 서버 기동(없을 때만), 실행 폴더와 env.sh 생성.
# 사용법: setup.sh [전체 예산 초=600]
# 출력 마지막 줄의 QA_OUT 경로를 오케스트레이터가 이후 단계에 쓴다.
set -euo pipefail
BUDGET="${1:-600}"
START=$(date +%s)
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PORT="${QA_PORT:-5199}"
BASE="http://localhost:$PORT"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/parallel-qa"
OUT="$ROOT/.qa-runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

# 1) playwright-core는 저장소 밖 캐시에 둔다 (package.json을 건드리지 않기 위해). 브라우저는 시스템 Chrome을 쓴다.
if [ ! -d "$CACHE/node_modules/playwright-core" ]; then
  mkdir -p "$CACHE"
  [ -f "$CACHE/package.json" ] || echo '{"private":true}' > "$CACHE/package.json"
  (cd "$CACHE" && npm i --silent --no-audit --no-fund playwright-core@1.55.0)
fi

# 2) dev 서버: 이미 떠 있으면 재사용, 아니면 띄우고 pid를 남긴다 (teardown.sh가 이 pid만 끈다)
if curl -sf -o /dev/null "$BASE/"; then
  echo "dev server: reusing $BASE"
else
  (cd "$ROOT" && nohup ./node_modules/.bin/vite --port "$PORT" --strictPort > "$OUT/vite.log" 2>&1 & echo $! > "$OUT/server.pid")
  for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 0.5; done
  curl -sf -o /dev/null "$BASE/" || { echo "dev server failed to start, see $OUT/vite.log"; exit 1; }
  echo "dev server: started $BASE (pid $(cat "$OUT/server.pid"))"
fi

# 3) 시간표: 에이전트 마감은 예산-120초, 강제 종료는 예산-70초. 남은 시간에 오케스트레이터가 취합한다.
DEADLINE=$((START + BUDGET - 120))
HARD_STOP=$((START + BUDGET - 70))
cat > "$OUT/env.sh" <<ENV
export QA_ROOT="$ROOT"
export QA_SKILL="$SKILL_DIR"
export QA_PW="$SKILL_DIR/scripts/pw.mjs"
export QA_BASE_URL="$BASE"
export QA_OUT="$OUT"
export QA_START=$START
export QA_DEADLINE=$DEADLINE
export QA_HARD_STOP=$HARD_STOP
ENV
echo "agent deadline: $(date -r "$DEADLINE" +%H:%M:%S)  hard stop: $(date -r "$HARD_STOP" +%H:%M:%S)  budget end: $(date -r $((START + BUDGET)) +%H:%M:%S)"
echo "QA_OUT=$OUT"
