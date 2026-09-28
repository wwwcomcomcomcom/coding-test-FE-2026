#!/usr/bin/env bash
# setup.sh가 직접 띄운 dev 서버만 끈다 (재사용한 서버는 그대로 둔다).
# 사용법: teardown.sh <QA_OUT>
PID_FILE="$1/server.pid"
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null && echo "dev server stopped" || echo "dev server already gone"
  rm -f "$PID_FILE"
else
  echo "dev server was reused, left running"
fi
